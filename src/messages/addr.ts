import { Message } from './message'
import { toUInt32LE, toUInt64LE, toUInt16BE, toIP, readUInt32LE, readInt64LE, readIP, readUInt16BE, readVarInt } from '../encoding'

export interface NetAddress{
    timestamp?: Date
    services: number
    ip: {
        v6?: string
        v4?: string,
    },
    port: number
}

export interface AddrMessagePayload {
    addresses: NetAddress[]
}

export class AddrMessage extends Message {
    getPayload(){
        return Buffer.concat(this.payload.addresses.map(
            address => Buffer.concat([
                toUInt32LE(Math.round((address.timestamp||new Date()).getTime() / 1000)),
                toUInt64LE(address.services),
                toIP(address.ip),
                toUInt16BE(address.port || 5251),
            ]),
        ))
    }
    static fromBuffer(buffer: Buffer){
        const bufferState = { buffer, offset: 0 }
        const count = readVarInt(bufferState).number
        const addresses: NetAddress[] = []
        for(let i=0; i<count; i++){
            addresses.push({
                timestamp: new Date(readUInt32LE(bufferState)*1000),
                services: readInt64LE(bufferState),
                ip: readIP(bufferState),
                port: readUInt16BE(bufferState),
            })
        }
        return new AddrMessage({
            addresses,
        })
    }
    constructor(public payload: AddrMessagePayload) {
        super('addr')
    }
}