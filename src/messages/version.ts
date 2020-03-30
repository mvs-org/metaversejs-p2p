import { Message } from './message'
import { NetAddress } from './addr'
import { toUInt32LE, toUInt64LE, toAddress, toVarStr, toUInt8, readUInt32LE, readInt64LE, readIP, readUInt16BE, readSlice, readString, readInt8 } from '../encoding'
import { getRandomNonce } from '../crypto'

const pkg : {version: string} = require('../../package.json')


export interface VersionMessagePayload {
    version: number
    services?: number
    timestamp: Date
    addrMe: NetAddress
    addrYou: NetAddress
    nonce?: Buffer
    subversion?: string
    startHeight: number
    relay: boolean
}


export class VersionMessage extends Message {

    constructor(public payload: VersionMessagePayload) {
        super('version')
    }
    getPayload(){
        return Buffer.concat([
            toUInt32LE(this.payload.version || 70012),
            toUInt64LE(this.payload.services || 0),
            toUInt64LE(Math.round((this.payload.timestamp).getTime() / 1000)),
            toAddress(this.payload.addrMe),
            toAddress(this.payload.addrYou),
            this.payload.nonce || getRandomNonce(8),
            toVarStr(this.payload.subversion || `/mvsjs:${pkg.version}/`, 'ascii'),
            toUInt32LE(this.payload.startHeight || 0),
            toUInt8(this.payload.relay ? 1 : 0),
        ])
    }
    static fromBuffer(buffer: Buffer) {
        const bufferState = { buffer, offset: 0 }
        return new VersionMessage({
            version: readUInt32LE(bufferState),
            services: readInt64LE(bufferState),
            timestamp: new Date(readInt64LE(bufferState) * 1000),
            addrMe: {
                services: readInt64LE(bufferState),
                ip: readIP(bufferState),
                port: readUInt16BE(bufferState),
            },
            addrYou: {
                services: readInt64LE(bufferState),
                ip: readIP(bufferState),
                port: readUInt16BE(bufferState),
            },
            nonce: readSlice(bufferState, 8),
            subversion: readString(bufferState).toString(),
            startHeight: readUInt32LE(bufferState),
            relay: bufferState.offset < buffer.length ? !!readInt8(bufferState) : true,
        })
    }
}
