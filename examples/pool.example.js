const { Pool } = require('../lib')
const { P2PTransporterTCPIP } = require('metaversejs-transport-tcpip')

const pool = new Pool({}, new P2PTransporterTCPIP()).connect()

pool.$egress.subscribe(message=>{
    console.log('-->>', message.command, message.payload)
})

pool.$ingress.subscribe(message => {
    console.log('<<-- received from', message.peer.host, message.command, message.payload)
})

setInterval(() => console.log(pool.toString()), 10000)