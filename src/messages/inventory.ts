import { Message } from './message'
import { readSlice, toUInt32LE, readUInt32LE, BufferState, readVarInt, toVarInt } from '../encoding'

export class InventoryItem{
    constructor(public type: number, public hash: string){}
}
export class InventoryTx extends InventoryItem {
    constructor(public hash: string) {
        super(InventoryMessage.TYPES.TX, hash)
    }
}
export class InventoryBlock extends InventoryItem{
    constructor(public hash: string) {
        super(InventoryMessage.TYPES.BLOCK, hash)
    }
}

export interface InventoryMessagePayload {
    inventory: InventoryItem[]
}

export class InventoryMessage extends Message {
    static TYPES = {
        TX: 1,
        BLOCK: 2,
    }
    getPayload() {
        return Buffer.concat([
            toVarInt(this.payload.inventory.length),
            Buffer.concat(
            this.payload.inventory.map(
                item => Buffer.concat([
                    toUInt32LE(item.type),
                    Buffer.from(item.hash, 'hex').reverse(),
                ], 36),
            ), this.payload.inventory.length * 36,
        )])
    }
    static parseInventoryItem(bufferState: BufferState){
        const type = readUInt32LE(bufferState)
        const hash = readSlice(bufferState, 32).reverse().toString('hex')
        switch(type){
            case InventoryMessage.TYPES.TX:
                return new InventoryTx(hash)
            case InventoryMessage.TYPES.BLOCK:
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
        
        return new InventoryMessage({
            inventory,
        })
    }
    constructor(public payload: InventoryMessagePayload) {
        super('inv')
    }
}