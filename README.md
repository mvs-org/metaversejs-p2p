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