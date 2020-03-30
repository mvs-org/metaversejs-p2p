
import { sha256sha256} from './crypto'
import { VersionMessage } from './messages/version'
import { PongMessage } from './messages/pong'
import { PingMessage } from './messages/ping'
import { VerackMessage } from './messages/verack'
import { Message } from './messages/message'
import { DataMessage } from './peer'
import { DataBuffer } from './databuffer'

export {
    PongMessage,
    PingMessage,
    VerackMessage,
    DataMessage,
    VersionMessage,
}

export class MessageBuilder {
    static PAYLOAD_START = 16
    static MINIMUM_LENGTH = 20
    constructor(private magic: Buffer) { }
    fromBuffer(dataBuffer: DataBuffer) {
        if (dataBuffer.length < MessageBuilder.MINIMUM_LENGTH) {
            return
        }
        // skip until magic number
        if (!this._discardUntilNextMessage(dataBuffer)) {
            return
        }
        let payloadLen: number = (dataBuffer.get(MessageBuilder.PAYLOAD_START)) +
            (dataBuffer.get(MessageBuilder.PAYLOAD_START + 1) << 8) +
            (dataBuffer.get(MessageBuilder.PAYLOAD_START + 2) << 16) +
            (dataBuffer.get(MessageBuilder.PAYLOAD_START + 3) << 24)

        let messageLength = 24 + payloadLen
        if (dataBuffer.length < messageLength) {
            return
        }

        let command = dataBuffer.slice(4, 16).toString('ascii').replace(/\0+$/, '')
        let payload = dataBuffer.slice(24, messageLength)
        let checksum = dataBuffer.slice(20, 24)

        let checksumConfirm = sha256sha256(payload).slice(0, 4)
        if (checksumConfirm.toString('hex') != checksum.toString('hex')) {
            dataBuffer.skip(messageLength)
            return
        }

        dataBuffer.skip(messageLength)

        return this._buildFromBuffer(command, payload)
    }

    private _discardUntilNextMessage(dataBuffer: DataBuffer) {
        let i = 0
        for (; ;) {
            // check if it's the beginning of a new message
            let packageNumber = dataBuffer.slice(0, 4).toString('hex')
            if (packageNumber === this.magic.toString('hex')) {
                dataBuffer.skip(i)
                return true
            }
            // did we reach the end of the buffer?
            if (i > (dataBuffer.length - 4)) {
                dataBuffer.skip(i)
                return false
            }
            i++ // continue scanning
        }
    }

    _buildFromBuffer(command: string, payload: Buffer) {
        switch (command) {
            case 'verack':
                return new VerackMessage()
            case 'ping':
                return PingMessage.fromBuffer(payload)
            case 'pong':
                return new PongMessage({nonce: payload})
            case 'version':
                return VersionMessage.fromBuffer(payload)
            default:
                return new DataMessage(command, payload)
                // throw new Error('Unsupported message command: ' + command);
        }
    }

    serialize(message: Message ) {
        const command = Buffer.alloc(12)
        command.write(message.command, 'ascii')
        const payload = message.getPayload()
        const checksum = sha256sha256(payload).slice(0, 4)
        const payloadLength = Buffer.alloc(4)
        payloadLength.writeInt32LE(payload.length, 0)
        return Buffer.concat([
            this.magic,
            command,
            payloadLength,
            checksum,
            payload,
        ])
    }
}