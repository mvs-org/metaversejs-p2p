import { Message } from './message'

export interface PongMessagePayload{
    nonce: Buffer
}
export class PongMessage extends Message {
    getPayload(){
        return this.payload.nonce
    }
    constructor(public payload: PongMessagePayload) {
        super('pong')
    }
}