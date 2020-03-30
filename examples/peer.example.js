const { Peer, PingMessage, GetBlocksMessage, MemPoolMessage, GetAddrMessage } = require('../lib')
const { P2PTransportTCPIP } = require('metaversejs-transport-tcpip')

const transport = new P2PTransportTCPIP({host: '198.199.84.199', port: 5251})
const peer = new Peer({
    transport,
    host: '198.199.84.199',
    port: 5251,
    relay: true,
}).connect()

peer.$egress.subscribe(message => {
    console.log('-->> egress to',peer.host, message.command, message.payload ? message.payload : '')
})

peer.$ingress.subscribe(message => {
    console.log(JSON.stringify(message.payload, null, 4))
    console.log('<<-- ingress from',peer.host, message.command, message.payload ? message.payload : '')
})

// setInterval(() => { peer.sendMessage(new PingMessage()) }, 5000)
setTimeout(() => { peer.sendMessage(new GetBlocksMessage({
    startHashes: ['e5ce278c601f5e326de3210f2871ede99e4f8db740dc93c45205232765d1d3a5'],
})) }, 2000)

peer.$status.subscribe(status=>{
    if(status===Peer.STATUS.READY){
        peer.sendMessage(new MemPoolMessage())
        peer.sendMessage(new GetAddrMessage())
    }
    console.log('connection status:', status)
})