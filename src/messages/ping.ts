import { getRandomNonce } from '../crypto'
import { Message } from './message'

export interface PingMessagePayload {
    nonce: Buffer
}

export class PingMessage extends Message {
    getPayload() {
        return this.payload.nonce
    }
    constructor(public payload: PingMessagePayload = { nonce: getRandomNonce(8) }) {
        super('ping')
    }
    static fromBuffer(payload: Buffer){
        return new PingMessage({nonce: payload})
    }
}