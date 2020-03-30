export class Message {
    payload: any
    getPayload() {
        return Buffer.from('')
    }
    constructor(public command: string) { }
}