import stream from 'stream'

import { MessageParser } from './message-parser'

export class MessageStream extends stream.Writable {
  rest: Buffer | undefined

  _write(chunk: Buffer, enc: BufferEncoding, next: (error?: Error | null) => void) {
    this.read(this.rest ? Buffer.concat([this.rest, chunk]) : chunk)
    next()
  }

  read(data: Buffer) {
    while (true) {
      if (data.length < 4) {
        this.rest = data.length > 0 ? data : undefined
        return
      }

      const size = data.readUInt32LE()
      if (size + 4 <= data.length) {
        this.emit('message', new MessageParser(data.slice(0, size + 4)))
        data = data.slice(size + 4)
      } else {
        this.rest = data
        return
      }
    }
  }

  reset() {
    this.rest = undefined
  }
}
