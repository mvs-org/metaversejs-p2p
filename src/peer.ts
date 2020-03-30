import { Subject } from 'rxjs'
import { NetworkConfig, DefaultNetwork } from './pool'
import { filter } from 'rxjs/operators'

import { MessageBuilder } from './messages'
import { DataBuffer } from './databuffer'
import { VersionMessage } from './messages/version'
import { PongMessage } from './messages/pong'
import { VerackMessage } from './messages/verack'
import { Message } from './messages/message'
import { PingMessage } from './messages/ping'
import { P2PTransport } from './transport'

export class PeerMessage {
    payload: any
    peer?: Peer
    constructor(public command: string) { }
}

export interface PeerOptions {
    transport: P2PTransport
    port?: number
    host?: string
    network?: NetworkConfig
    relay?: boolean
}

export class PeerReadyMessage extends PeerMessage {
    constructor() {
        super('ready')
    }
}

export class DataMessage extends Message {
    constructor(command: string, payload: object) {
        super(command)
        this.payload = payload
    }
}
export class PeerConnectMessage extends PeerMessage {
    constructor() {
        super('connect')
    }
}
export class PeerDisonnectMessage extends PeerMessage {
    constructor() {
        super('disconnect')
    }
}

export class PeerErrorMessage extends PeerMessage {
    constructor(error: Error) {
        super('error')
        this.payload = error
    }
}

export interface Proxy {
    host: string
    port: number
}

export class Peer {

    static MAX_RECEIVE_BUFFER = 10000000
    static STATUS = {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        READY: 'ready',
    }

    transport: P2PTransport
    host?: string
    port: number
    version = 0
    bestHeight = 0
    private _dataBuffer: DataBuffer = new DataBuffer()
    versionSent = false
    relay: boolean
    subversion?: string
    network: NetworkConfig
    $status = new Subject<string>()
    $ingress = new Subject<Message>()
    $egress = new Subject<Message>()
    $uplink = new Subject<PeerMessage>()
    currentStatus: string
    messageBuilder: MessageBuilder

    constructor(options: PeerOptions) {
        this.transport = options.transport
        this.host = options.host || '127.0.0.1'
        this.port = options.port || 5251
        this.currentStatus = Peer.STATUS.CONNECTED
        this.$status.next(Peer.STATUS.CONNECTED)

        this.network = options.network || DefaultNetwork
        if (!this.port) {
            this.port = this.network.port
        }

        this.messageBuilder = new MessageBuilder(this.network.networkMagic)

        this.relay = options.relay === false ? false : true

        this.$ingress.pipe(filter(message => message.command === 'verack'))
            .subscribe(() => {
                this._setStatus(Peer.STATUS.READY)
                this.$uplink.next(new PeerReadyMessage())
            })
        
        this.$ingress.pipe(filter(message => message.command === 'inv'))
            .subscribe((message) => {
                this.$uplink.next(message)
            })

        this.$ingress.pipe(filter(message => message.command === 'version'))
            .subscribe((message: VersionMessage) => {
                this.version = message.payload.version
                this.subversion = message.payload.subversion
                this.bestHeight = message.payload.startHeight
                this.sendMessage(new VerackMessage())
                if (!this.versionSent) {
                    this._sendVersion()
                }
            })

        this.$ingress.pipe(filter(message => message.command === 'ping'))
            .subscribe((message: PingMessage) => {
                return this._sendPong(message.payload.nonce)
            })

        this.$egress.subscribe(message => {
            if (this.transport) {
                return this.transport.$egress.next(this.messageBuilder.serialize(message))
            }
            throw Error('Transport not open')
        })

    }

    /**
    * Initialize the connection
    * 
    * @returns {Peer} peer instance.
    */
    connect(): Peer {
        this._setStatus(Peer.STATUS.CONNECTING)
        if (this.transport !== undefined) {
            this.transport.$status.pipe(filter(status => status === 'connected'))
                .subscribe(() => {
                    this._setStatus(Peer.STATUS.CONNECTED)
                    this.$uplink.next(new PeerConnectMessage())
                    this._sendVersion()
                })
            this._handleSocketEvents()
            this.transport.connect()
        }
        return this
    }

    /**
    * Disconnects the remote connection.
    * @returns {Peer} The same peer instance.
    */
    disconnect(): Peer {
        this._setStatus(Peer.STATUS.DISCONNECTED)
        if (this.transport) {
            this.transport.destroy()
        }
        this.$uplink.next(new PeerDisonnectMessage())
        return this
    }

    /**
    * Send a message
    * 
    * @param {Message} message target message
    */
    sendMessage(message: Message) {
        this.$egress.next(message)
    }

    /**
    * Send version message
    */
    private _sendVersion() {
        let message = new VersionMessage({
            relay: this.relay,
            version: 70012,
            timestamp: new Date(),
            services: 1,
            addrYou: {
                ip: {
                    v4: this.host,
                },
                port: this.port,
                services: 1,
            },
            addrMe: {
                ip: {
                    v4: '127.0.0.1', // TODO: get actual ip
                },
                port: 5251,
                services: 1,
            },
            startHeight: this.bestHeight,
        })
        this.versionSent = true
        this.sendMessage(message)
    }

    /**
    * Send pong message
    */
    private _sendPong(nonce: Buffer) {
        let message = new PongMessage({ nonce })
        this.sendMessage(message)
    }


    /**
     * Set the status of the peer connection
     * 
     * @param newStatus new status
     */
    private _setStatus(newStatus: string) {
        this.currentStatus = newStatus
        this.$status.next(newStatus)
    }

    /**
     * Handle errors
     * 
     * @param e Error
     */
    private _onError(e: Error) {
        console.error({ error: e })
        if (this.$uplink) {
            this.$uplink.next(new PeerErrorMessage(e))
            if (this.currentStatus !== Peer.STATUS.DISCONNECTED) {
                this.disconnect()
            }
        }
    }

    /**
     * Create the event handlers for the socket
     */
    private _handleSocketEvents() {
        this.transport.$errors.subscribe(this._onError)
        this.transport.$status.pipe(filter(status => status === 'disconnected'))
            .subscribe(() => this.disconnect())
        this.transport.$ingress.subscribe(data => {
            this._dataBuffer.push(data)
            if (this._dataBuffer.length > Peer.MAX_RECEIVE_BUFFER) {
                return this.disconnect()
            }
            return this._readMessage()
        })
    }

    /**
    * Read message from data buffer
    */
    private _readMessage() {
        let message = this.messageBuilder.fromBuffer(this._dataBuffer)
        if (message) {
            this.$ingress.next(message)
            this._readMessage()
        }
    }
}