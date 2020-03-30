import { decode, encode } from 'varuint-bitcoin'
import { NetAddress } from './pool'

export type VarStrEncoding = 'utf-8' | 'ascii' | 'hex'


export type BufferState = {
    buffer: Buffer,
    offset: number,
}

export function parseIP(bufferState: BufferState) {
    let ipv6 = []
    let ipv4 = []
    for (let a = 0; a < 8; a++) {
        let word = readSlice(bufferState, 2)
        ipv6.push(word.toString('hex'))
        if (a >= 6) {
            ipv4.push(word[0])
            ipv4.push(word[1])
        }
    }
    const ipv6str = ipv6.join(':')
    const ipv4str = ipv4.join('.')
    return {
        v6: ipv6str,
        v4: ipv4str,
    }
}


export function readString(bufferstate: BufferState): Buffer {
    const length = readVarInt(bufferstate)
    return readSlice(bufferstate, length.number)
}

export function readSlice(bufferstate: BufferState, n: number): Buffer {
    bufferstate.offset += n
    return bufferstate.buffer.slice(bufferstate.offset - n, bufferstate.offset)
}

export function readVarInt(bufferstate: BufferState): { number: number, size: number } {
    const result = decode(bufferstate.buffer, bufferstate.offset)
    const size = decode.bytes
    bufferstate.offset += size
    return {
        number: result,
        size,
    }
}

export function verifuint(value: number, max: number) {
    if (typeof value !== 'number') throw new Error('cannot write a non-number as a number')
    if (value < 0) throw new Error('specified a negative value for writing an unsigned value')
    if (value > max) throw new Error('RangeError: value out of range')
    if (Math.floor(value) !== value) throw new Error('value has a fractional component')
}

export function readInt64LE(bufferstate: { buffer: Buffer, offset: number }): number {
    const a = bufferstate.buffer.readUInt32LE(bufferstate.offset)
    let b = bufferstate.buffer.readUInt32LE(bufferstate.offset + 4)
    b *= 0x100000000
    bufferstate.offset += 8
    verifuint(b + a, 0x01ffffffffffffff)
    return b + a
}

export function readInt8(bufferstate: BufferState) {
    bufferstate.offset++
    return bufferstate.buffer.readInt8(bufferstate.offset - 1)
}

export function readUInt32LE(bufferstate: BufferState) {
    bufferstate.offset += 4
    return bufferstate.buffer.readInt32LE(bufferstate.offset - 4)
}

export function readUInt16BE(bufferstate: BufferState) {
    bufferstate.offset += 2
    return bufferstate.buffer.readUInt16BE(bufferstate.offset - 2)
}


export function writeIP(ip: { v6?: string, v4?: string }, bw: Buffer) {
    if (ip.v6) {
        let words = ip.v6.split(':').map(function (s) {
            return Buffer.from(s, 'hex')
        })
        for (let i = 0; i < words.length; i++) {
            let word = words[i]
            bw = Buffer.concat([bw, word])
        }
    }
}

export function toAddress(address: NetAddress) {
    // if (address === undefined) {
    //     return Buffer.alloc(26, 0)
    // }
    return Buffer.concat([
        toUInt64LE(address.services),
        toIP(address.ip),
        toUInt16BE(address.port || 5251),
    ])
}

export function toUInt32LE(number: number): Buffer {
    const buffer = Buffer.alloc(8)
    return buffer.slice(0, buffer.writeUInt32LE(number, 0))
}

export function toUInt16BE(number: number): Buffer {
    const buffer = Buffer.alloc(4)
    return buffer.slice(0, buffer.writeUInt16BE(number, 0))
}

export function toUInt64LE(value: number) {

    verifuint(Number(value), 0x01ffffffffffffff)

    const buffer = Buffer.allocUnsafe(8)
    buffer.writeInt32LE(Number(value) & -1, 0)
    buffer.writeUInt32LE(Math.floor(Number(value) / 0x100000000), 4)
    return buffer
}

export function toVarStr(str: string, encoding: VarStrEncoding = 'utf-8'): Buffer {
    const payload = Buffer.from(str, encoding)
    return Buffer.concat([
        toVarInt(payload.length),
        payload,
    ])
}

export function toVarInt(number: number): Buffer {
    return encode(number)
}

export function toIP(ip: { v6?: string, v4?: string }) {
    if (ip.v6) {
        return Buffer.concat(ip.v6.split(':').map(function (s) {
            return Buffer.from(s, 'hex')
        }))
    }
    if(ip.v4){
        return Buffer.concat([Buffer.from('00000000000000000000ffff', 'hex'), Buffer.concat(ip.v4.split('.').map(part=>toUInt8(parseInt(part))))])
    }
    throw Error('ipv4 or ipv6 must be provided')
}

export function toUInt8(number: number): Buffer {
    const buffer = Buffer.alloc(8)
    return buffer.slice(0, buffer.writeUInt8(number, 0))
}