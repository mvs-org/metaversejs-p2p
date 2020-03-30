import { Message } from './message'

export class VerackMessage extends Message {
    constructor() {
        super('verack')
    }
}