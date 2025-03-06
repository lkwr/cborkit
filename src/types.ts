export const MajorType = {
  // major 0: positive integer (unsigned)
  PosInt: 0,
  // major 1: negative integer
  NegInt: 1,
  // major 2: byte string
  Bytes: 2,
  // major 3: text (utf8) string
  Text: 3,
  // major 4: array
  Array: 4,
  // major 5: map
  Map: 5,
  // major 6: semantic tag
  Tag: 6,
  // major 7: special / floating point
  Special: 7,
} as const;

export type MajorTypeValue = (typeof MajorType)[keyof typeof MajorType];

export type CborHeader = {
  major: MajorTypeValue;

  shortCount: number;
  extendedCount?: number | bigint;

  headerLength: number;
  itemLength: number | null;
};

// TODO use cbor type as an bridge type between cbor and javascript (reader/writer uses this type)
// decoder/encoder translate javascrpt types to this bridge type and use reader/writer
export type CborType =
  | "int"
  | "bytes"
  | "text"
  | "array"
  | "map"
  | "tag"
  | "simple"
  | "float";

export type CborItem =
  | CborInt
  | CborBytes
  | CborText
  | CborArray
  | CborMap
  | CborTag
  | CborSimple
  | CborFloat;

export type CborInt = {
  type: "int";
  value: number | bigint;
};

export type CborBytes = {
  type: "bytes";
  value: Uint8Array;
};

export type CborText = {
  type: "text";
  value: string;
};

export type CborArray = {
  type: "array";
  value: CborItem[];
};

export type CborMap = {
  type: "map";
  value: [CborItem, CborItem][];
};

export type CborSimple = {
  type: "simple";
  value: number;
};

export type CborFloat = {
  type: "float";
  value: number;
};

export type CborTag = {
  type: "tag";
  value: number | bigint;
  item: CborItem;
};
