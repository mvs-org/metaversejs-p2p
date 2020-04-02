<p align="center">
  <a href="https://mvs.org/">
    <img width="200" src="https://raw.githubusercontent.com/mvs-org/lightwallet/master/src/assets/logo.png" alt="">
  </a>
  <br>
  <br>
  JavaScript library for the Metaverse Blockchain P2P network
</p>

## Install

Install base package
``` bash
npm install metaversejs-p2p
```

Install a transport plugin
``` bash
npm install metaversejs-transport-tcpip
```

## Usage

Please see the examples directory for more complete examples.

### Pool

#### Create a pool
``` javascript
const { Pool } = require('metaversejs-p2p')
const { P2PTransporterTCPIP } = require('metaversejs-transport-tcpip')

const pool = new Pool({}, new P2PTransporterTCPIP()).connect()
```

#### Receive Messages
To access the incomming messages you can subscribe to $ingress
``` javascript
pool.$ingress.subscribe(message => {
    console.log('<<-- received from', message.peer.host, message.command, message.payload)
})
```

#### Get Pool Actions
Pool actions are available on the $egress subject
``` javascript
pool.$egress.subscribe(message=>{
    console.log('-->>', message.command)
})
```

#### Number Of Connected Peers
``` javascript
const q = pool.numberConnected()
```

### Peer

#### Connect to peer
  It will automatically send the version message and respond with verack if version messages are received.
``` javascript
const { Peer } = require('metaversejs-p2p')
const { P2PTransportTCPIP } = require('metaversejs-transport-tcpip')

const transport = new P2PTransportTCPIP({host: '198.199.84.199', port: 5251})
const peer = new Peer({
    transport,
    host: '198.199.84.199',
    port: 5251,
    relay: true,
}).connect()
```

#### Peer Status
The current status is avalable as a variable.
``` javascript
const status = peer.currentStatus
```
You can also subscibe to status changes on $status
``` javascript
peer.$status.subscribe(status=>console.log('peer status:', status))
```
#### Send Messages
The sendMessage function can send messages. The following example will send a Ping.
``` javascript
const { PingMessage } = require('metaversejs-p2p')

peer.sendMessage(new PingMessage())
```

You can access all outgoing messages by subscribing to $egress
``` javascript
peer.$egress.subscribe(message => {
    console.log('-->> egress to',peer.host, message.command, message.payload)
})
```

#### Receive
The received messages are available on the $ingress subject
``` javascript
peer.$ingress.subscribe(message => {
    console.log('<<-- ingress from', peer.host, message.command, message.payload)
})
```

### Messages

Messages are transferred as binary data.

| length  | content          |                                        |
|---------|------------------|----------------------------------------|
| 4 byte  | NETWORK_MAGIC    | mainnet value: 4d56534d                |
| 12 byte | COMMAND          | ascii encoded command                  |
| 4 byte  | PAYLOAD LENGTH   | Int32LE encoded                        |
| 4 byte  | PAYLOAD CHECKSUM | first 4 bytes of sha256sha256(payload) |
| rest    | PAYLOAD          |                                        |

To make message handling easier there are classes for the supported
messages.

#### Ping
To keep a connection open you should send ping messages to the other peer.
``` javascript
const { PingMessage } = require('metaversejs-p2p')
const message = new PingMessage({
  nonce?: Buffer // if not defined a random nonce will be generated
})
```

#### Pong
Send pong messages as a response of another peer's ping message.
``` javascript
const { PongMessage } = require('metaversejs-p2p')
const message = new PongMessage({
  nonce: Buffer // must be the nonce of the previous ping received from the peer
})
```

#### Verack
After receiving a version message from another peer you need to answer with a verack message.
``` javascript
const { VerackMessage } = require('metaversejs-p2p')
const message = new VerackMessage()
```

#### Version
The version message is the first message of a peer connecting to another peer. The version
message contains information about both peers and the own services and state.
``` javascript
const { VersionkMessage } = require('metaversejs-p2p')
const message = new VersionMessage({
  relay: true, // receive unconfirmed transactions
  version: 70012, // version
  services: 1, // services your node provides
  startHeight: 3514519, // your current bestblockheight
  subversion: "/metaverse:0.9.0/", // subversion name
  nonce?: Buffer.from('fa4eba0d6e8b659e', 'hex'), // optional - default: random buffer
  timestamp: new Date("2020-03-29T19:11:25.000Z"), // optional - default: current timestamp
  addrMe: {
    ip: { // works without providing real ip but nodes should try to provide real ip
      v4: '95.116.169.107', // your ipv4 address
      v6: '0000:0000:0000:0000:0000:ffff:5f74:a96b' // your ipv6 address
    },
    port: 58616, // port number
    services: 1 // provided services
  },
  addrYou: { // similar to addMe
    ip: {
      v4: '198.199.84.199',
      v6: '0000:0000:0000:0000:0000:ffff:c6c7:54c7'
    },
    port: 5251,
    services: 0
  },
})
```

#### Inventory
Peers exchange information about each others transactions and blocks via inventory messages.
The messages only contain the hashes of the transactions and blocks.
``` javascript
const { InventoryMessage, InventoryTx, InventoryBlock, } = require('metaversejs-p2p')

// can contain transactions
const message = new InventoryMessage([
    new InventoryTx('3550047ed23a5e68c5fca0f6cb1ddd0df69998c73e0318dc9c57adb376784849'),
    new InventoryTx('bfee531c274585ca3e222bc39e0fbad94b8e1a9b2cda09892d5e27d02caa3db9'),
])

// or blocks
const message = new InventoryMessage([
    new InventoryBlock('a2e5e162a0b6d0faeb71ced40836b6fdf3715e4950d7ac9dd02bd80daea33de7'),
    new InventoryBlock('8f3cc621407f2b749bb807d855db6c0787a543d6956148684c0804279c35e8ce'),
  ])
```

#### GetAddr
Ask the other peer for a list of other connected peers.
``` javascript
const { GetAddrMessage } = require('metaversejs-p2p')
const message = new GetAddrMessage()
```

#### MemPool
Ask the other peer to send the inventory of the mempool.
``` javascript
const { MemPoolMessage } = require('metaversejs-p2p')
const message = new MemPoolMessage()
```

#### Addr
Answer to the GetAddr message. It contains a list of addresses of the connected peers.
``` javascript
const { AddrMessage } = require('metaversejs-p2p')
const message = new AddrMessage({
  addresses: [
    {
      timestamp: new Date(),
      services: 1, // list of services that peer provides
      ip: {
        v6?: '0000:0000:0000:0000:0000:ffff:1b25:4427',
        v4?: '27.37.68.39',
      },
      port: 5251
    },
    // ... can and in most cases will contain more addresses
  ]
})
```

## License
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.