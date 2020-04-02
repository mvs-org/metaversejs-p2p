const { Peer, GetDataMessage, PingMessage, InventoryBlock, GetBlocksMessage, MemPoolMessage, GetAddrMessage } = require('../lib')
const { P2PTransportTCPIP } = require('metaversejs-transport-tcpip')
const { take } = require('rxjs/operators')
const { resolve } = require('dns')

const PORT = 5251
const TIMEOUT = 5000

resolve('seed.getmvs.org', async (err, hosts) => {
    let up = 0
    await Promise.all(hosts.map(async host => {
        const result = await checkStatus(host, PORT, TIMEOUT)
        if (result.status === 'online') {
            up++
            console.log(`\x1b[32m[${result.status}]\x1b[0m\t${host}\t${result.height}`)
        } else {
            console.log(`\x1b[31m[${result.status}] \x1b[0m\t${host}\t\t${result.message || ""}`)
        }
    }))
    console.log(`done. checked ${hosts.length} hosts. ${up} up`)
})

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
            to.unref()
            return peer.disconnect()
        }

        peer.transport.$errors.subscribe(error => {
            return response({ status: 'error', message: error.message })
        })

        const to = setTimeout(() => {
            return response({ status: 'timeout' })
        }, timeout)

        peer.$ingress.pipe(take(1)).subscribe(message => {
            if (message.command === 'version') {
                return response({ status: 'online', height: peer.bestHeight, version: peer.subversion })
            }
        })
    })
}