import type { CborItem } from "../types.ts";
import { Writer } from "../utils/writer.ts";
import { NoEncoderError } from "./errors.ts";
import { write } from "./writer.ts";

type TypeofMapping = {
  number: number;
  bigint: bigint;
  string: string;
  boolean: boolean;
  undefined: undefined;
  object: object | null;
  symbol: symbol;
  function: Function;
};

export type EncoderFn<T = unknown> = (
  value: T,
  next: () => CborItem,
  encode: (value: unknown) => CborItem,
) => CborItem;

export type Encoder = {
  [Key in keyof TypeofMapping]?: EncoderFn<TypeofMapping[Key]>;
};

export type EncodeOptions = {
  encoders?: Encoder[];
  writer?: Writer;
};

export const encode = (value: unknown, options?: EncodeOptions): Uint8Array => {
  const byteArray = options?.writer ?? new Writer();
  const encoders = options?.encoders ?? [];

  const item = walkEncoders(value, typeof value, null, 0, encoders);
  write(item, byteArray);

  return byteArray.toBytes();
};

const walkEncoders = (
  value: unknown,
  type: keyof TypeofMapping,
  item: CborItem | null,
  index: number,
  encoders: Encoder[],
): CborItem => {
  const encoder = encoders[index];

  // if no middleware is found, the middleware chain is done. Returns the current item.
  if (!encoder) {
    // if no item is passed until the end, we throw an error as we cannot encode the value
    if (!item) throw new NoEncoderError(value);
    return item;
  }

  const fn = encoder[type] as EncoderFn | undefined;

  // if no encoder is found, continue with the next middleware
  if (!fn) return walkEncoders(value, type, item, index + 1, encoders);

  return fn(
    value,
    () => walkEncoders(value, type, item, index + 1, encoders),
    (inner) => walkEncoders(inner, typeof inner, null, 0, encoders),
  );
};
