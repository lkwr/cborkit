export class Tagged<T = unknown> {
  readonly tag: bigint | number;
  readonly item: T;

  constructor(tag: bigint | number, item: T) {
    this.tag = tag;
    this.item = item;
  }

  static from<T>(tag: bigint | number, item: T): Tagged<T> {
    return new Tagged(tag, item);
  }
}
