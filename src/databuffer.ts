/**
 * Class to organize buffers received from p2p network
 * 
 * TypeScript implementation for functionality taken from:
 * https://github.com/bitpay/node-buffers/blob/master/index.js
 */
export class DataBuffer {

    length: number

    constructor(public buffers: Buffer[] = []){
        this.length = this.buffers.reduce(function (size, buf) {
            return size + buf.length
        }, 0)
    }

    skip(i: number) {
        if (i === 0) {
            return
        }

        if (i >= this.length) {
            this.buffers = []
            this.length = 0
            return
        }
        
        let pos = this.pos(i)
        this.buffers = this.buffers.slice(pos.buf)
        this.buffers[0] = this.buffers[0].slice(pos.offset)
        this.length -= i
    }

    push (...args: Buffer[]) {
        args.forEach(arg=>{
            if (!Buffer.isBuffer(arg)) throw Error('Invalid parameter for buffer push')
            this.buffers.push(arg)
            this.length += arg.length
        })
        return this.length
    }

    unshift(...args: Buffer[]) {
        args.forEach(buffer=>{
            if (!Buffer.isBuffer(buffer)) {
                throw new TypeError('Tried to unshift a non-buffer')
            }
            this.buffers.unshift(buffer)
            this.length += buffer.length
        })
        return this.length
    }

    copy(dst: Buffer, dStart: number, start: number, end: number) {
        return this.slice(start, end).copy(dst, dStart, 0, end - start)
    }

    slice (i=0, j = this.length) {
    
        if (j > this.length) j = this.length
    
        let startBytes = 0
        let si = 0
        for (
            ;
            si < this.buffers.length && startBytes + this.buffers[si].length <= i;
            si ++
        ) { startBytes += this.buffers[si].length }
    
        let target = Buffer.alloc(j - i)
    
        let ti = 0
        for (let ii = si; ti < j - i && ii < this.buffers.length; ii++) {
            let len = this.buffers[ii].length
    
            let start = ti === 0 ? i - startBytes : 0
            let end = ti + len >= j - i
                ? Math.min(start + (j - i) - ti, len)
                : len
            
    
            this.buffers[ii].copy(target, ti, start, end)
            ti += end - start
        }
    
        return target
    }

    pos(i: number) {
        if (i < 0 || i >= this.length) throw new Error('Position parameter out of range')
        let l = i, bi = 0, bu = null
        for (;;) {
            bu = this.buffers[bi]
            if (l < bu.length) {
                return {buf: bi, offset: l}
            } else {
                l -= bu.length
            }
            bi++
        }
    }

    get (i: number) {
        let pos = this.pos(i)
    
        return this.buffers[pos.buf][pos.offset]
    }

    set (i: number, b: number) {
        let pos = this.pos(i)
    
        return this.buffers[pos.buf].set([pos.offset], b)
    }

    toBuffer() {
        return this.slice()
    }

    toString(encoding: string, start: number, end: number) {
        return this.slice(start, end).toString(encoding)
    }
}