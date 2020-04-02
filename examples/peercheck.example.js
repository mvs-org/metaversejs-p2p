const { Peer } = require('../lib')
const { P2PTransportTCPIP } = require('metaversejs-transport-tcpip')
const { take } = require('rxjs/operators')
const peers = require('./peercheck.list.json')

function checkStatus(host, port, timeout = 10000) {
    return new Promise((resolve) => {
        let peer = new Peer({
            transport: new P2PTransportTCPIP({ host, port }),
            host,
            port,
            relay: false,
        }).connect()

        function response(result) {
            resolve(result)
            timeoutScheduler.unref()
            return peer.disconnect()
        }

        peer.transport.$errors.subscribe(error => {
            return response({ status: 'error', message: error.message })
        })

        const timeoutScheduler = setTimeout(() => response({ status: 'timeout' }), timeout)

        peer.$ingress.pipe(take(5)).subscribe(message => {
            if (message.command === 'version') {
                return response({ status: 'online', height: peer.bestHeight, version: peer.subversion })
            }
        })
    })
}

(async () => {
    let up = 0
    for (let peer of peers) {
        const result = await checkStatus(peer.host, peer.port, 10000)
        if (result.status === 'online') {
            up++
            console.log(`\x1b[32m[${result.status}]\x1b[0m\t${peer.location.toUpperCase()}\t${peer.host}:${peer.port}\t${result.height}`)
        } else {
            console.log(`\x1b[31m[${result.status}] \x1b[0m\t${peer.location.toUpperCase()}\t${peer.host}:${peer.port}\t\t${result.message || ""}`)
        }
    }
    console.log(`done. checked ${peers.length} hosts. ${up} up`)
})()