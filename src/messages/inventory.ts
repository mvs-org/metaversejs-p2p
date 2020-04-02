import { Message } from './message'
import { readSlice, toUInt32LE, readUInt32LE, BufferState, readVarInt, toVarInt } from '../encoding'

export class InventoryItem{
    static TYPES = {
        TX: 1,
        BLOCK: 2,
    }
    constructor(public type: number, public hash: string){}
}

export class InventoryTx extends InventoryItem {
    constructor(public hash: string) {
        super(InventoryItem.TYPES.TX, hash)
    }
}

export class InventoryBlock extends InventoryItem{
    constructor(public hash: string) {
        super(InventoryItem.TYPES.BLOCK, hash)
    }
}

export class InventoryMessage extends Message {
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
    static parseInventoryItem(bufferState: BufferState){
        const type = readUInt32LE(bufferState)
        const hash = readSlice(bufferState, 32).reverse().toString('hex')
        switch(type){
            case InventoryItem.TYPES.TX:
                return new InventoryTx(hash)
            case InventoryItem.TYPES.BLOCK:
                return new InventoryBlock(hash)
            default:
                return new InventoryItem(type, hash)
        }
    }
    static fromBuffer(buffer: Buffer) {
        const bufferState = { buffer, offset: 0 }
        const count = readVarInt(bufferState).number
        const inventory = []
        for(let i=0; i<count; i++){
            inventory.push(InventoryMessage.parseInventoryItem(bufferState))
        }
        return new InventoryMessage(inventory)
    }
    constructor(public payload: InventoryItem[]) {
        super('inv')
    }
}