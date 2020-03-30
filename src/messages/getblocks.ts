import { Message } from './message'
import { toVarInt, readVarInt, readSlice, toUInt32LE, readUInt32LE } from '../encoding'

export interface GetBlocksMessagePayload {
    version: number
    startHashes?: string[]
    stopHash?: string
}
export class GetBlocksMessage extends Message {
    getPayload() {
        return Buffer.concat([
            toUInt32LE(this.payload.version || 70012),
            toVarInt((this.payload.startHashes||[]).length),
            Buffer.concat((this.payload.startHashes||[]).map(hash=>Buffer.from(hash, 'hex').reverse())),
            Buffer.from(this.payload.stopHash||'0000000000000000000000000000000000000000000000000000000000000000', 'hex').reverse(),
        ])
    }
    static fromBuffer(buffer: Buffer){
        const bufferState = { buffer, offset: 0}
        const version = readUInt32LE(bufferState)
        const numberOfHashes = readVarInt(bufferState).number
        const startHashes = []
        for(let i=0; i<numberOfHashes; i++){
            startHashes.push(readSlice(bufferState, 32).reverse().toString('hex'))
        }
        const stopHash = readSlice(bufferState, 32).reverse().toString('hex')
        return new GetBlocksMessage({
            version,
            startHashes,
            stopHash,
        })
    }
    constructor(public payload: GetBlocksMessagePayload) {
        super('getblocks')
    }
}