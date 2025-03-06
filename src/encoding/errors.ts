export class NoEncoderError extends Error {
  value: unknown;

  constructor(value: unknown) {
    super("No encoder found for type: " + typeof value);
    this.value = value;
  }
}
