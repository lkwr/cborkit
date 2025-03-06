import { type CborItem, MajorType, type MajorTypeValue } from "../types.ts";
import {
  FLOAT_16_SUPPORTED,
  readFloat16,
  readFloat32,
  writeFloat16,
  writeFloat32,
  writeFloat64,
} from "../utils/number.ts";
import { Writer } from "../utils/writer.ts";

export { Writer };

const textEncoder = new TextEncoder();

export const write = (
  item: CborItem,
  byteArray: Writer = new Writer(),
): Writer => {
  switch (item.type) {
    case "int":
      writeInt(item.value, byteArray);
      break;

    case "bytes":
      writeBytes(item.value, byteArray);
      break;

    case "text":
      writeText(item.value, byteArray);
      break;

    case "array":
      writeArrayHeader(item.value.length, byteArray);

      for (const innerItem of item.value) {
        write(innerItem, byteArray);
      }
      break;

    case "map":
      writeMapHeader(item.value.length, byteArray);

      for (const [key, value] of item.value) {
        write(key, byteArray);
        write(value, byteArray);
      }
      break;

    case "tag":
      writeTag(item.value, byteArray);
      write(item.item, byteArray);
      break;

    case "simple":
      writeSimple(item.value, byteArray);
      break;

    case "float":
      writeFloat(item.value, byteArray);
      break;
  }

  return byteArray;
};

export const writeHeader = (
  major: MajorTypeValue,
  shortCount: number,
  byteArray: Writer,
): Writer => {
  byteArray.push([(major << 5) | shortCount]);
  return byteArray;
};

const writeHeaderWithCount = (
  major: MajorTypeValue,
  length: number | bigint | null,
  writer: Writer,
): Writer => {
  // indefinite length
  if (length === null) {
    writeHeader(major, 31, writer);
    return writer;
  }

  if (length < 0) throw new Error("length must be positive");

  if (length <= 23) {
    writeHeader(major, Number(length), writer);
  } else if (length <= 0xff) {
    writeHeader(major, 24, writer);

    writer.push([Number(length)]);
  } else if (length <= 0xffff) {
    writeHeader(major, 25, writer);

    const len = Number(length);

    writer.push([len >> 8, len]);
  } else if (length <= 0xffff_ffff) {
    writeHeader(major, 26, writer);

    const len = Number(length);

    writer.push([len >> 24, len >> 16, len >> 8, len]);
  } else {
    writeHeader(major, 27, writer);
    const bigLength = BigInt(length);

    if (bigLength <= 0xffff_ffff_ffff_ffffn) {
      writer.push([
        Number((bigLength >> 56n) & 0xffn),
        Number((bigLength >> 48n) & 0xffn),
        Number((bigLength >> 40n) & 0xffn),
        Number((bigLength >> 32n) & 0xffn),
        Number((bigLength >> 24n) & 0xffn),
        Number((bigLength >> 16n) & 0xffn),
        Number((bigLength >> 8n) & 0xffn),
        Number(bigLength & 0xffn),
      ]);
    } else {
      throw new Error("length must be less than 2^64");
    }
  }

  return writer;
};

// major 0 - 1 - positive integers and negative integers
export const writeInt = (value: number | bigint, byteArray: Writer): Writer => {
  const isPositive = value >= 0;
  const absolute = isPositive
    ? value
    : typeof value === "bigint"
      ? -value - 1n
      : -value - 1;

  return writeHeaderWithCount(
    isPositive ? MajorType.PosInt : MajorType.NegInt,
    absolute,
    byteArray,
  );
};

export const writeInfiniteBytesHeader = (bytes: Writer): Writer => {
  return writeHeaderWithCount(MajorType.Bytes, null, bytes);
};

// major 2
export const writeBytes = (bytes: Uint8Array, byteArray: Writer): Writer => {
  writeHeaderWithCount(MajorType.Bytes, bytes.byteLength, byteArray);
  byteArray.push(bytes);
  return byteArray;
};

export const writeInfiniteTextHeader = (bytes: Writer): Writer => {
  return writeHeaderWithCount(MajorType.Text, null, bytes);
};

// major 3
export const writeText = (value: string, byteArray: Writer): Writer => {
  const valueBuffer = textEncoder.encode(value);
  writeHeaderWithCount(MajorType.Text, BigInt(valueBuffer.length), byteArray);
  byteArray.push(valueBuffer);
  return byteArray;
};

// major 4
export const writeArrayHeader = (
  length: number | bigint | null,
  byteArray: Writer,
): Writer => {
  writeHeaderWithCount(MajorType.Array, length, byteArray);
  return byteArray;
};

// major 5
export const writeMapHeader = (
  pairs: number | bigint | null,
  byteArray: Writer,
): Writer => {
  writeHeaderWithCount(MajorType.Map, pairs, byteArray);
  return byteArray;
};

// major 6
export const writeTag = (tag: number | bigint, byteArray: Writer): Writer => {
  writeHeaderWithCount(MajorType.Tag, tag, byteArray);
  return byteArray;
};

// major 7 - simple values
export const writeSimple = (
  value: number | bigint,
  byteArray: Writer,
): Writer => {
  if (value <= 23) {
    writeHeader(MajorType.Special, Number(value), byteArray);
    return byteArray;
  } else if (value <= 0xff) {
    writeHeader(MajorType.Special, 24, byteArray);
    byteArray.push([Number(value)]);
    return byteArray;
  } else {
    throw new Error("value must be less than 2^8");
  }
};

// major 7 - boolean
export const writeBoolean = (value: boolean, byteArray: Writer) => {
  return writeSimple(value ? 21 : 20, byteArray);
};

// major 7 - undefined
export const writeUndefined = (byteArray: Writer) => {
  return writeSimple(23, byteArray);
};

export const writeNull = (byteArray: Writer) => {
  return writeSimple(22, byteArray);
};

// major 7 - float
export const writeFloat = (value: number, writer: Writer): Writer => {
  const float = new Uint8Array(8);

  if (FLOAT_16_SUPPORTED) {
    writeFloat16(float, 0, value);
    if (readFloat16(float, 0) === value) {
      writeHeader(MajorType.Special, 25, writer);
      writer.push(float.slice(0, 2));
      return writer;
    }
  }

  writeFloat32(float, 0, value);
  if (readFloat32(float, 0) === value) {
    writeHeader(MajorType.Special, 26, writer);
    writer.push(float.slice(0, 4));
    return writer;
  }

  writeHeader(MajorType.Special, 27, writer);
  writeFloat64(float, 0, value);
  writer.push(float);

  return writer;
};

// major 7 - break
export const writeBreak = (byteArray: Writer): Writer => {
  return writeHeader(MajorType.Special, 31, byteArray);
};
