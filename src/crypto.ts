import { createHash, randomBytes } from 'crypto'

export function sha256(payload: Buffer) {
    return createHash("sha256")
        .update(payload)
        .digest()
}

export function sha256sha256(payload: Buffer) {
    return sha256(sha256(payload))
}

export function getRandomNonce(size: number): Buffer{
    return randomBytes(size)
}