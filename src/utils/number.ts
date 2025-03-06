// -----------------------------------------------------------------------------
//                                    FLOAT16
// -----------------------------------------------------------------------------
//
// As float16 is not supported in all runtimes, we need to check if it is
// supported before using it.
//
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/setFloat16#browser_compatibility
//

export type DataViewFloat16 = DataView & {
  setFloat16(byteOffset: number, value: number): void;
  getFloat16(byteOffset: number): number;
};

export const FLOAT_16_SUPPORTED: boolean =
  "setFloat16" in DataView.prototype && "getFloat16" in DataView.prototype;

// -----------------------------------------------------------------------------
//                                    READER
// -----------------------------------------------------------------------------

export const readUint8 = (bytes: Uint8Array, offset: number): number => {
  return bytes[offset];
};

export const readUint16 = (bytes: Uint8Array, offset: number): number => {
  return (bytes[offset] << 8) | bytes[offset + 1];
};

export const readUint32 = (bytes: Uint8Array, offset: number): number => {
  const signedInt =
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3];

  // convert to unsigned
  return signedInt >>> 0;
};

export const readBigUint64 = (bytes: Uint8Array, offset: number): bigint => {
  return (
    (BigInt(bytes[offset]) << 56n) |
    (BigInt(bytes[offset + 1]) << 48n) |
    (BigInt(bytes[offset + 2]) << 40n) |
    (BigInt(bytes[offset + 3]) << 32n) |
    (BigInt(bytes[offset + 4]) << 24n) |
    (BigInt(bytes[offset + 5]) << 16n) |
    (BigInt(bytes[offset + 6]) << 8n) |
    BigInt(bytes[offset + 7])
  );
};

export const readFloat16 = (bytes: Uint8Array, offset: number): number => {
  const view = new DataView(bytes.buffer) as DataViewFloat16;
  return view.getFloat16(offset);
};

export const readFloat32 = (bytes: Uint8Array, offset: number): number => {
  const view = new DataView(bytes.buffer);
  return view.getFloat32(offset);
};

export const readFloat64 = (bytes: Uint8Array, offset: number): number => {
  const view = new DataView(bytes.buffer);
  return view.getFloat64(offset);
};

// -----------------------------------------------------------------------------
//                                    WRITER
// -----------------------------------------------------------------------------

export const writeUint8 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  bytes[offset] = value;
};

export const writeUint16 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  bytes[offset] = value >> 8;
  bytes[offset + 1] = value;
};

export const writeUint32 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  bytes[offset] = value >> 24;
  bytes[offset + 1] = value >> 16;
  bytes[offset + 2] = value >> 8;
  bytes[offset + 3] = value;
};

export const writeBigUint64 = (
  bytes: Uint8Array,
  offset: number,
  value: bigint,
) => {
  bytes[offset] = Number(value >> 56n);
  bytes[offset + 1] = Number(value >> 48n);
  bytes[offset + 2] = Number(value >> 40n);
  bytes[offset + 3] = Number(value >> 32n);
  bytes[offset + 4] = Number(value >> 24n);
  bytes[offset + 5] = Number(value >> 16n);
  bytes[offset + 6] = Number(value >> 8n);
  bytes[offset + 7] = Number(value);
};

export const writeFloat16 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  const view = new DataView(bytes.buffer) as DataViewFloat16;
  view.setFloat16(offset, value);
};

export const writeFloat32 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  const view = new DataView(bytes.buffer);
  view.setFloat32(offset, value);
};

export const writeFloat64 = (
  bytes: Uint8Array,
  offset: number,
  value: number,
) => {
  const view = new DataView(bytes.buffer);
  view.setFloat64(offset, value);
};

// -----------------------------------------------------------------------------
//                                    CASTING
// -----------------------------------------------------------------------------

export const asBigInt = (value: number | bigint): bigint => {
  if (typeof value === "number") return BigInt(asInt(value));
  return value;
};

export const asInt = (value: number | bigint): number => {
  if (typeof value === "bigint") value = Number(value);

  if (!Number.isSafeInteger(value))
    throw new Error("value must be a safe integer");

  if (Number.isNaN(value)) throw new Error("value must be a number");

  return value;
};

export const tryInt = (value: number | bigint): number | bigint => {
  try {
    return asInt(value);
  } catch {
    return value;
  }
};
