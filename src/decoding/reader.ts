import { MajorType } from "../types.ts";
import type {
  CborArray,
  CborBytes,
  CborFloat,
  CborHeader,
  CborInt,
  CborItem,
  CborMap,
  CborSimple,
  CborTag,
  CborText,
  MajorTypeValue,
} from "../types.ts";
import {
  FLOAT_16_SUPPORTED,
  readBigUint64,
  readFloat16,
  readFloat32,
  readFloat64,
  readUint8,
  readUint16,
  readUint32,
} from "../utils/number.ts";
import { Writer } from "../utils/writer.ts";

const textDecoder = new TextDecoder();

export type WithLength<T extends CborItem> = T & {
  length: number;
};

export type ReadOptions = {
  offset?: number;
};

export const readHeader = (
  bytes: Uint8Array,
  offset: number = 0,
): CborHeader => {
  const byte = readUint8(bytes, offset);

  const major = (byte >> 5) as MajorTypeValue;
  const shortCount = byte & 0b00011111;

  // special handling for major 7 (special)
  if (major === MajorType.Special)
    return readHeaderSpecial(bytes, offset, major, shortCount);

  if (shortCount <= 23) {
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: shortCount,
    };
  } else if (shortCount === 24) {
    const extendedCount = readUint8(bytes, offset + 1);

    return {
      major,
      shortCount,
      extendedCount,
      headerLength: 2,
      itemLength: extendedCount,
    };
  } else if (shortCount === 25) {
    const extendedCount = readUint16(bytes, offset + 1);

    return {
      major,
      shortCount,
      extendedCount,
      headerLength: 3,
      itemLength: extendedCount,
    };
  } else if (shortCount === 26) {
    const extendedCount = readUint32(bytes, offset + 1);

    return {
      major,
      shortCount,
      extendedCount,
      headerLength: 5,
      itemLength: extendedCount,
    };
  } else if (shortCount === 27) {
    const extendedCount = readBigUint64(bytes, offset + 1);

    return {
      major,
      shortCount,
      extendedCount,
      headerLength: 9,
      itemLength: Number(extendedCount),
    };
  } else if (shortCount === 31) {
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: null,
    };
  } else {
    throw new Error("Invalid cbor header");
  }
};

const readHeaderSpecial = (
  bytes: Uint8Array,
  offset: number,
  major: MajorTypeValue,
  shortCount: number,
): CborHeader => {
  if (shortCount <= 23) {
    // simple values
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: shortCount,
    };
  } else if (shortCount === 24) {
    // simple values with following byte
    const extendedCount = readUint8(bytes, offset + 1);

    return {
      major,
      shortCount,
      extendedCount,
      headerLength: 2,
      itemLength: extendedCount,
    };
  } else if (shortCount === 25) {
    // float16 (half)
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: 2,
    };
  } else if (shortCount === 26) {
    // float32 (single)
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: 4,
    };
  } else if (shortCount === 27) {
    // float64 (double)
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: 8,
    };
  } else if (shortCount === 31) {
    // break
    return {
      major,
      shortCount,
      headerLength: 1,
      itemLength: 0,
    };
  } else {
    throw new Error("Invalid cbor header");
  }
};

export const read = (
  bytes: Uint8Array,
  options?: ReadOptions,
): WithLength<CborItem> => {
  const offset = options?.offset ?? 0;
  const header = readHeader(bytes, offset);

  switch (header.major) {
    case MajorType.PosInt:
    case MajorType.NegInt:
      return readInt(header);
    case MajorType.Bytes:
    case MajorType.Text:
      return readString(header, bytes, offset);
    case MajorType.Array:
      return readArray(header, bytes, offset);
    case MajorType.Map:
      return readMap(header, bytes, offset);
    case MajorType.Tag:
      return readTag(header, bytes, offset);
    case MajorType.Special:
      return readSpecial(header, bytes, offset);
  }
};

const readInt = (header: CborHeader): WithLength<CborInt> => {
  if (header.itemLength === null)
    throw new Error("Indefinite length currently not supported");

  const isPositive = header.major !== MajorType.NegInt;

  return {
    type: "int",
    value: isPositive ? header.itemLength : -header.itemLength,
    length: header.headerLength,
  };
};

const readString = (
  header: CborHeader,
  bytes: Uint8Array,
  offset: number,
): WithLength<CborText | CborBytes> => {
  const start = offset + header.headerLength;

  // Indefinite length string
  if (header.itemLength === null) {
    const { items, length } = readIndefinite(bytes, start);

    return header.major === MajorType.Text
      ? {
          type: "text",
          value: items.reduce((acc, item) => {
            if (item.type !== "text")
              throw new Error(
                `Invalid cbor type '${item.type}' in indefinite length text`,
              );
            return acc + item.value;
          }, ""),
          length: header.headerLength + length,
        }
      : {
          type: "bytes",
          value: items
            .reduce((acc, item) => {
              if (item.type !== "bytes")
                throw new Error(
                  `Invalid cbor type '${item.type}' in indefinite length bytes`,
                );
              acc.push(item.value);
              return acc;
            }, new Writer())
            .toBytes(),
          length: header.headerLength + length,
        };
  }

  const end = start + header.itemLength;
  const slice = bytes.slice(start, end);
  const length = end - offset;

  return header.major === MajorType.Text
    ? {
        type: "text",
        value: textDecoder.decode(slice),
        length,
      }
    : {
        type: "bytes",
        value: slice,
        length,
      };
};

const readArray = (
  header: CborHeader,
  bytes: Uint8Array,
  offset: number,
): WithLength<CborArray> => {
  const start = offset + header.headerLength;

  // Indefinite length array
  if (header.itemLength === null) {
    const { items, length } = readIndefinite(bytes, start);

    return {
      type: "array",
      value: items,
      length: header.headerLength + length,
    };
  }

  const currentValue: Array<WithLength<CborItem>> = [];
  let currentLength = 0;

  for (let i = 0; i < header.itemLength; i++) {
    const result = read(bytes, {
      offset: start + currentLength,
    });
    currentValue.push(result);
    currentLength += result.length;
  }

  return {
    type: "array",
    value: currentValue,
    length: header.headerLength + currentLength,
  };
};

const readMap = (
  header: CborHeader,
  bytes: Uint8Array,
  offset: number,
): WithLength<CborMap> => {
  const start = offset + header.headerLength;

  // Indefinite length map
  if (header.itemLength === null) {
    const { items, length } = readIndefinite(bytes, start);
    if (items.length % 2 !== 0) throw new Error("Infinite map has odd length");

    const entries: Array<[WithLength<CborItem>, WithLength<CborItem>]> = [];

    for (let i = 0; i < items.length; i += 2) {
      entries.push([items[i], items[i + 1]]);
    }

    return {
      type: "map",
      value: entries,
      length: header.headerLength + length,
    };
  }

  const currentValue: Array<[WithLength<CborItem>, WithLength<CborItem>]> = [];
  let currentLength = 0;

  for (let i = 0; i < header.itemLength; i++) {
    const key = read(bytes, {
      offset: start + currentLength,
    });
    currentLength += key.length;

    const value = read(bytes, {
      offset: start + currentLength,
    });
    currentLength += value.length;

    currentValue.push([key, value]);
  }

  return {
    type: "map",
    value: currentValue,
    length: header.headerLength + currentLength,
  };
};

const readIndefinite = (
  bytes: Uint8Array,
  offset: number,
): { length: number; items: WithLength<CborItem>[] } => {
  let currentLength = 0;
  const items: WithLength<CborItem>[] = [];

  while (true) {
    const nextHeader = readHeader(bytes, offset + currentLength);

    // On break, break :)
    if (
      nextHeader.major === MajorType.Special &&
      nextHeader.shortCount === 31
    ) {
      currentLength += 1;
      break;
    }

    const nextItem = read(bytes, { offset: offset + currentLength });

    currentLength += nextItem.length;
    items.push(nextItem);
  }

  return { length: currentLength, items };
};

const readTag = (
  header: CborHeader,
  bytes: Uint8Array,
  offset: number,
): WithLength<CborTag> => {
  if (header.itemLength === null)
    throw new Error("Illegal cbor header", { cause: header });

  const start = offset + header.headerLength;
  const item = read(bytes, { offset: start });

  return {
    type: "tag",
    value: header.itemLength,
    item,
    length: header.headerLength + item.length,
  };
};

const readSpecial = (
  header: CborHeader,
  bytes: Uint8Array,
  offset: number,
): WithLength<CborSimple | CborFloat> => {
  if (header.shortCount <= 23) {
    return {
      type: "simple",
      value: header.shortCount,
      length: header.headerLength,
    };
  } else if (header.shortCount === 24 && header.extendedCount) {
    return {
      type: "simple",
      value: Number(header.extendedCount),
      length: header.headerLength,
    };
  } else if (header.shortCount === 25 && FLOAT_16_SUPPORTED) {
    return {
      type: "float",
      value: readFloat16(bytes, offset + header.headerLength),
      length: header.headerLength + 2,
    };
  } else if (header.shortCount === 26) {
    return {
      type: "float",
      value: readFloat32(bytes, offset + header.headerLength),
      length: header.headerLength + 4,
    };
  } else if (header.shortCount === 27) {
    return {
      type: "float",
      value: readFloat64(bytes, offset + header.headerLength),
      length: header.headerLength + 8,
    };
  }

  throw new Error("Invalid cbor type");
};
