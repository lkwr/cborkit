export class Writer {
  private chunkSize: number;
  private chunks: Uint8Array[];
  private currentChunk: Uint8Array;
  private offset: number;
  private totalSize: number;

  constructor(chunkSize: number = 128) {
    this.chunkSize = chunkSize;
    this.chunks = [];
    this.currentChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
    this.totalSize = 0;
  }

  push(data: Uint8Array | number[]): void {
    if (Array.isArray(data)) data = new Uint8Array(data);

    let dataOffset = 0;
    while (dataOffset < data.length) {
      let spaceLeft = this.chunkSize - this.offset;
      let bytesToWrite = Math.min(spaceLeft, data.length - dataOffset);

      this.currentChunk.set(
        data.subarray(dataOffset, dataOffset + bytesToWrite),
        this.offset,
      );
      this.offset += bytesToWrite;
      dataOffset += bytesToWrite;

      if (this.offset === this.chunkSize) {
        this.chunks.push(this.currentChunk);
        this.currentChunk = new Uint8Array(this.chunkSize);
        this.offset = 0;
      }
    }
    this.totalSize += data.length;
  }

  clear(): void {
    this.chunks.length = 0;
    this.currentChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
    this.totalSize = 0;
  }

  toBytes(): Uint8Array {
    const result = new Uint8Array(this.totalSize);
    let pos = 0;

    for (const chunk of this.chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }

    if (this.offset > 0) {
      result.set(this.currentChunk.subarray(0, this.offset), pos);
    }

    return result;
  }
}
