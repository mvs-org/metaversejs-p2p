import { Message } from './message'

export class MemPoolMessage extends Message {
    constructor() {
        super('mempool')
    }
}