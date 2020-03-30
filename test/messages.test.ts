import { expect } from 'chai'
import { MessageBuilder } from '../src/messages'
import { VerackMessage } from '../src/messages/verack'
import { VersionMessage } from '../src/messages/version'
import { DataBuffer } from '../src/databuffer'
import { PongMessage } from '../src/messages/pong'
import { PingMessage } from '../src/messages/ping'

describe('Messages', () => {

  const builder = new MessageBuilder(Buffer.from('4d56534d', 'hex'))

  describe('Verack', () => {
    it('deserialize', ()=>{
      const db = new DataBuffer()
      db.push(Buffer.from('4d56534d76657261636b000000000000000000005df6e0e2', 'hex'))
      const m = builder.fromBuffer(db)
      expect(m).to.deep.equal(new VerackMessage())
    })
    it('serialize', ()=>{
      const m = new VerackMessage()
      expect(builder.serialize(m).toString('hex')).to.equal('4d56534d76657261636b000000000000000000005df6e0e2')
    })
  })

  describe('Ping', () => {
    it('deserialize', ()=>{
      const db = new DataBuffer()
      db.push(Buffer.from('4d56534d70696e67000000000000000008000000c93efcb1251c07167428ba3d', 'hex'))
      const m = builder.fromBuffer(db)
      expect(m).to.deep.equal(new PingMessage({nonce: Buffer.from('251c07167428ba3d', 'hex')}))
    })
    it('serialize', ()=>{
      const m = new PingMessage({nonce: Buffer.from('251c07167428ba3d', 'hex')})
      expect(builder.serialize(m).toString('hex')).to.equal('4d56534d70696e67000000000000000008000000c93efcb1251c07167428ba3d')
    })
  })

  describe('Pong', () => {
    it('deserialize', ()=>{
      const db = new DataBuffer()
      db.push(Buffer.from('4d56534d706f6e67000000000000000008000000c93efcb1251c07167428ba3d', 'hex'))
      const m = builder.fromBuffer(db)
      expect(m).to.deep.equal(new PongMessage({nonce: Buffer.from('251c07167428ba3d', 'hex')}))
    })
    it('serialize', ()=>{
      const m = new PongMessage({nonce: Buffer.from('251c07167428ba3d', 'hex')})
      expect(builder.serialize(m).toString('hex')).to.equal('4d56534d706f6e67000000000000000008000000c93efcb1251c07167428ba3d')
    })
  })

  describe('Version', () => {
    it('deserialize', ()=>{
      const buffer = Buffer.from('4d56534d76657273696f6e000000000067000000ee92d4037c1101000100000000000000ddf2805e00000000010000000000000000000000000000000000ffff5f74a96be4f8000000000000000000000000000000000000ffffc6c754c71483fa4eba0d6e8b659e112f6d65746176657273653a302e392e302f97a0350001', 'hex')
      const db = new DataBuffer()
      db.push(buffer)
      const message = builder.fromBuffer(db)
      expect(message).to.deep.equal(new VersionMessage({
        relay: true,
        version: 70012,
        services: 1,
        startHeight: 3514519,
        subversion: "/metaverse:0.9.0/",
        nonce: Buffer.from('fa4eba0d6e8b659e', 'hex'),
        timestamp: new Date("2020-03-29T19:11:25.000Z"),
        addrMe: {
          ip: {
            v4: '95.116.169.107',
            v6: '0000:0000:0000:0000:0000:ffff:5f74:a96b'
          },
          port: 58616,
          services: 1
        },
        addrYou: {
          ip: {
            v4: '198.199.84.199',
            v6: '0000:0000:0000:0000:0000:ffff:c6c7:54c7'
          },
          port: 5251,
          services: 0
        },
      }))
    })
    it('serialize', ()=>{
      const m = new VersionMessage({
        relay: true,
        version: 70012,
        services: 1,
        startHeight: 3514519,
        subversion: "/metaverse:0.9.0/",
        nonce: Buffer.from('fa4eba0d6e8b659e', 'hex'),
        timestamp: new Date("2020-03-29T19:11:25.000Z"),
        addrMe: {
          ip: {
            v4: '95.116.169.107',
          },
          port: 58616,
          services: 1
        },
        addrYou: {
          ip: {
            v4: '198.199.84.199',
          },
          port: 5251,
          services: 0
        },
      })
      expect(builder.serialize(m).toString('hex')).to.equal('4d56534d76657273696f6e000000000067000000ee92d4037c1101000100000000000000ddf2805e00000000010000000000000000000000000000000000ffff5f74a96be4f8000000000000000000000000000000000000ffffc6c754c71483fa4eba0d6e8b659e112f6d65746176657273653a302e392e302f97a0350001')
    })
  })
})