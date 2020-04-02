import { Message } from './message'
import { readSlice, toUInt32LE, readUInt32LE, BufferState, readVarInt, toVarInt } from '../encoding'
import { InventoryItem, InventoryBlock, InventoryTx } from './inventory'

export class GetDataMessage extends Message {
    getPayload() {
        return Buffer.concat([
            toVarInt(this.payload.length),
            Buffer.concat(
            this.payload.map(
                item => Buffer.concat([
                    toUInt32LE(item.type),
                    Buffer.from(item.hash, 'hex').reverse(),
                ], 36),
            ), this.payload.length * 36,
        )])
    }
    static parseInventoryItem(bufferState: BufferState): InventoryItem {
        const type = readUInt32LE(bufferState)
        const hash = readSlice(bufferState, 32).reverse().toString('hex')
        switch (type) {
            case InventoryItem.TYPES.TX:
                return new InventoryTx(hash)
            case InventoryItem.TYPES.BLOCK:
                return new InventoryBlock(hash)
            default:
                throw Error('invalid data type ' + type)
        }
    }
    static fromBuffer(buffer: Buffer) {
        const bufferState = { buffer, offset: 0 }
        const count = readVarInt(bufferState).number
        const inventory = []
        for(let i=0; i<count; i++){
            inventory.push(GetDataMessage.parseInventoryItem(bufferState))
        }
        
        return new GetDataMessage(inventory)
    }
    constructor(public payload: InventoryItem[]) {
        super('getdata')
    }
}