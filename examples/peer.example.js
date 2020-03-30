const { Peer, PingMessage } = require('../lib')
const { P2PTransportTCPIP } = require('metaversejs-transport-tcpip')

const transport = new P2PTransportTCPIP({host: '198.199.84.199', port: 5251})
const peer = new Peer({
    transport,
    host: '198.199.84.199',
    port: 5251,
    relay: true,
}).connect()

peer.$egress.subscribe(message => {
    console.log('-->> egress to',peer.host, message.command, message.payload)
})

peer.$ingress.subscribe(message => {
    console.log('<<-- ingress from',peer.host, message.command, message.payload)
})

setInterval(() => { peer.sendMessage(new PingMessage()) }, 5000)

peer.$status.subscribe(status=>{
    console.log('connection status:', status)
})