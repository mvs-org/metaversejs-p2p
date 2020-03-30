import { Subject } from 'rxjs'
export type P2PTransportStatus = 'connected' | 'disconnected'

export interface P2PTransport {
    connect: () => void
    destroy: () => void
    $ingress: Subject<Buffer>
    $egress: Subject<Buffer>
    $status: Subject<P2PTransportStatus>
    $errors: Subject<Error>
}

export interface P2PTransporter {
    get: (options: any) => P2PTransport
}
