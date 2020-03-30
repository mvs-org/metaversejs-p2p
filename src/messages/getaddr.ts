import { Message } from './message'

export class GetAddrMessage extends Message {
    constructor() {
        super('getaddr')
    }
}