import { expect } from 'chai'
// import { DataBuffer } from '../src/buffer'
import { toIP, toUInt32LE, } from '../src/encoding'

describe('Encoding', () => {

  // const builder = new MessageBuilder(Buffer.from('4d56534d', 'hex'))



  it('netaddress', ()=>{
    expect(toIP({
        v4: '198.199.84.199'
    }).toString('hex')).to.equal('00000000000000000000ffffc6c754c7')
  })

  it('toUInt32LE', ()=>{
    expect(toUInt32LE(70012).toString('hex')).to.equal('7c110100')
  })
  

})