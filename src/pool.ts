import { Peer, PeerDisonnectMessage } from './peer'
import { resolve } from 'dns'
import { sha256 } from './crypto'
import { Subject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { PeerMessage } from './peer'
import { Message } from './messages/message'
import { P2PTransporter } from './transport'

function now() {
    return Math.floor(new Date().getTime() / 1000)
}

export interface NetAddress{
    services: number
    ip: {
        v6?: string
        v4?: string,
    },
    port: number
}

export interface Address {
    port?: number
    ip: {
        v6?: string
        v4?: string,
    },
    time?: Date
    retryTime?: number
}

export interface HashAddress extends Address {
    hash: string
}

export interface NetworkConfig {
    name: string
    networkMagic: Buffer,
    port: number,
    dnsSeeds: string[]
}

export interface PoolConfig {
    listenAddr?: boolean
    dnsSeed?: boolean
    maxSize?: number
    network?: NetworkConfig
    relay?: boolean
    addrs?: Address[]
}

export const DefaultNetwork = {
    name: 'mainnet',
    networkMagic: Buffer.from('4d56534d', 'hex'),
    port: 5251,
    dnsSeeds: [
        'seed.getmvs.org',
        'main-asia.metaverse.live',
    ],
}

export interface PoolMessage {
    command: string
    payload: any
}

export interface ErrorMessage {
    type: string
    error: Error
}

export class Pool {

    static MAX_CONNECTED_PEERS = 8
    static RETRY_SECONDS = 30

    dnsSeed: boolean
    listen: boolean
    keepalive = false
    _connectedPeers: { [hash: string]: Peer } = {}
    _addrs: HashAddress[] = []
    maxSize: number
    network: NetworkConfig
    relay: boolean

    $ingress = new Subject<PeerMessage>()
    $egress = new Subject<PoolMessage>()
    $errors = new Subject<ErrorMessage>()

    constructor(options: PoolConfig = {}, private transporter: P2PTransporter) {
        this.listen = options.listenAddr !== false
        this.dnsSeed = options.dnsSeed !== false
        this.maxSize = options.maxSize || Pool.MAX_CONNECTED_PEERS

        this.network = options.network || DefaultNetwork
        this.relay = options.relay === false ? false : true

        if (options.addrs) {
            for (let i = 0; i < options.addrs.length; i++) {
                this._addAddr(options.addrs[i])
            }
        }

        this.$egress
            .pipe(filter(message => message.command === 'seed'))
            .subscribe(message => {
                message.payload.forEach((ip: string) => {
                    this._addAddr({
                        ip: {
                            v4: ip,
                        },
                    })
                })
                if (this.keepalive) {
                    this._fillConnections()
                }
            })

        this.$ingress
            .pipe(filter(message => message.command === 'disconnect'))
            .subscribe(message => {
                console.log('disconnect')
                return this._removeConnectedPeer(message.payload)
            })

        this.$ingress
            .pipe(filter(message => message.command === 'peerdisconnect'))
            .subscribe((message: PeerDisonnectMessage) => {
                this._deprioritizeAddr(message.payload)
                this._removeConnectedPeer(message.payload)
                if (this.keepalive) {
                    this._fillConnections()
                }
            })

        if (this.listen) {
            this.$ingress
                .pipe(filter(message => message.command === 'peeraddr'))
                .subscribe((message) => {
                    let addrs: Address[] = message.payload
                    let length = addrs.length
                    for (let i = 0; i < length; i++) {
                        let addr = addrs[i]
                        let future = new Date().getTime() + (10 * 60 * 1000)
                        if (addr.time === undefined) addr.time = new Date()
                        if (addr.time.getTime() <= 100000000000 || addr.time.getTime() > future) {
                            // In case of an invalid time, assume "5 days ago"
                            let past = new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000)
                            addr.time = past
                        }
                        this._addAddr(addr)
                    }
                })
        }
    }

    /**
    * @returns {Number} The number of peers currently connected.
    */
    numberConnected(): number {
        return Object.keys(this._connectedPeers).length
    }

    toString() {
        return '<Pool network: ' +
            this.network.name + ', connected: ' +
            this.numberConnected() + ', available: ' +
            this._addrs.length + '>'
    }

    /**
    * Will initiate connection to peers, if available peers have been added to
    * the pool, it will connect to those, otherwise will use DNS seeds to find
    * peers to connect. When a peer disconnects it will add another.
    */
    connect() {
        this.keepalive = true
        if (this.dnsSeed) {
            this._addAddrsFromSeeds()
        } else {
            this._fillConnections()
        }
        return this
    }

    /**
    * Will disconnect all peers that are connected.
    */
    disconnect() {
        this.keepalive = false
        Object.values(this._connectedPeers).forEach(peer => peer.disconnect())
        return this
    }

    /**
    * Will send a message to all of the peers in the pool.
    * @param {PeerMessage} message - An instance of the message to send
    */
    broadcastMessage(message: Message) {
        // broadcast to peers
        Object.values(this._connectedPeers).forEach(peer => peer.sendMessage(message))
    }

    /**
    * Will enable a listener for peer connections, when a peer connects
    * it will be added to the pool.
    */
    // listen() {
    //     // Create server
    //     this.server = createServer((socket) => {
    //         let addr: Address = {
    //             ip: {},
    //         }
    //         if (socket && socket.remoteAddress && isIPv6(socket.remoteAddress)) {
    //             addr.ip.v6 = socket.remoteAddress
    //         } else {
    //             addr.ip.v4 = socket.remoteAddress
    //         }
    //         addr.port = socket.remotePort

    //         const hAddr = this._addAddr(addr)
    //         this._addConnectedPeer(socket, hAddr)
    //     })
    //     this.server.listen(this.network.port)
    // }

    /**
    * Will add disconnect and ready events for a peer and intialize
    * handlers for relay peer message events.
    */
    private _addPeerEventHandlers(peer: Peer, addr: Address) {


        peer.$uplink.subscribe(message => {
            switch (message.command) {
                case 'peerdisconnect':
                case 'disconnect':
                case 'ready':
                    return this.$ingress.next({
                        command: message.command,
                        peer,
                        payload: addr,
                    })
                default:
                    return this.$ingress.next({
                        command: message.command,
                        peer,
                        payload: message.payload,
                    })
            }
        })
    }

    /**
    * Will fill the connected peers to the maximum amount.
    */
    private _fillConnections() {
        let length = this._addrs.length
        for (let i = 0; i < length; i++) {
            if (this.numberConnected() >= this.maxSize) {
                break
            }
            let addr = this._addrs[i]
            if (!addr.retryTime || now() > addr.retryTime) {
                this._connectPeer(addr)
            }
        }
        return this
    }

    /**
    * Will deprioritize an addr in the list of addrs by moving it to the end
    * of the array, and setting a retryTime
    * @param {Address} addr - An addr from the list of addrs
    */
    _deprioritizeAddr(addr: HashAddress) {
        for (let i = 0; i < this._addrs.length; i++) {
            if (this._addrs[i].hash === addr.hash) {
                let middle = this._addrs[i]
                middle.retryTime = now() + Pool.RETRY_SECONDS
                let beginning = this._addrs.splice(0, i)
                let end = this._addrs.splice(i + 1, this._addrs.length)
                let combined = beginning.concat(end)
                this._addrs = combined.concat([middle])
            }
        }
        return this
    }

    /**
    * Will connect a peer and add to the list of connected peers.
    * @param {Address} addr - An addr from the list of addrs
    */
    private _connectPeer(addr: HashAddress) {

        if (!this._connectedPeers[addr.hash]) {
            let port = addr.port || this.network.port
            let ip = addr.ip.v4 || addr.ip.v6
            if(ip===undefined){
                return console.error('IPv4 or IPv6 must be provided')
            }
            let peer = new Peer({
                transport: this.transporter.get({host: ip, port}),
                host: ip,
                port: port,
                network: this.network,
                relay: this.relay,
            })

            peer.$uplink.pipe(filter(message => message.command === 'connect'))
                .subscribe(message => {
                    this.$ingress.next({ command: 'peerconnect', payload: { addr }, peer })
                })

            this._addPeerEventHandlers(peer, addr)
            peer.connect()
            this._connectedPeers[addr.hash] = peer
        }

        return this
    }


    /**
    * Will remove a peer from the list of connected peers.
    * @param {Address} addr - An addr from the list of addrs
    */
    private _removeConnectedPeer(addr: HashAddress) {
        if (this._connectedPeers[addr.hash] && this._connectedPeers[addr.hash].currentStatus && this._connectedPeers[addr.hash].currentStatus !== Peer.STATUS.DISCONNECTED) {
            this._connectedPeers[addr.hash].disconnect()
        } else {
            delete this._connectedPeers[addr.hash]
        }
        return this
    }

    /**
    * Will add addrs to the list of addrs from network DNS seeds
    */
    _addAddrsFromSeeds() {
        let seeds = this.network.dnsSeeds
        seeds.forEach((seed) => {
            this._addAddrsFromSeed(seed)
        })
        return this
    }

    /**
    * Will add addrs to the list of addrs from a DNS seed
    * @param {String} seed - A domain name to resolve known peers
    */
    private _addAddrsFromSeed(seed: string) {
        resolve(seed, (err, ips) => {
            if (err) {
                return this.$errors.next({ type: 'seederror', error: err })
            }
            if (!ips || !ips.length) {
                return this.$errors.next({ type: 'seederror', error: new Error('No IPs found from seed lookup.') })
            }
            // announce to pool
            this.$egress.next({ command: 'seed', payload: ips })
        })
        return this
    }

    



    private _addAddr(addr: Address): HashAddress {
        // Use default port if not specified
        addr.port = addr.port || this.network.port

        // make a unique key
        const hAddr = {
            hash: sha256(Buffer.from((addr.ip.v6 || '') + addr.ip.v4 + addr.port)).toString('hex'),
            ...addr,
        }

        let length = this._addrs.length
        let exists = false
        for (let i = 0; i < length; i++) {
            if (this._addrs[i].hash === hAddr.hash) {
                exists = true
            }
        }
        if (!exists) {
            this._addrs.unshift(hAddr)
        }
        return hAddr
    }
}