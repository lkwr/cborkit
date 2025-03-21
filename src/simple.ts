export class Simple {
  readonly value: number;

  constructor(value: number | bigint) {
    this.value = Number(value);
    if (!Number.isInteger(this.value))
      throw new Error("Simple value must be an integer");
    if (this.value < 0 || this.value > 255)
      throw new Error("Simple value must be between 0 and 255");
  }

  static false = new Simple(20);
  static true = new Simple(21);

  static null = new Simple(22);
  static undefined = new Simple(23);

  static boolean(value: boolean) {
    return value ? Simple.true : Simple.false;
  }

  static from(value: number | bigint) {
    return new Simple(value);
  }
}
