import type { CborItem, CborType } from "../types.ts";
import { read } from "./reader.ts";

export type DecoderFn<T extends CborItem = CborItem> = (
  value: T,
  next: () => unknown,
  decode: (item: CborItem) => unknown,
) => unknown;

export type Decoder = {
  [Key in CborType]?: DecoderFn<Extract<CborItem, { type: Key }>>;
};

export type DecodeOptions = {
  decoders?: Decoder[];
};

export const decode = (bytes: Uint8Array, options?: DecodeOptions): unknown => {
  const item = read(bytes);
  const decoders = options?.decoders ?? [];

  const value = walkDecoders(item, item, 0, decoders);

  return value;
};

const walkDecoders = (
  item: CborItem,
  value: unknown,
  index: number,
  decoders: Decoder[],
): unknown => {
  const decoder = decoders.at(index);

  // if no decoder is found, the decoder chain is done. Returns the current value.
  if (!decoder) return value;

  const fn = decoder[item.type] as DecoderFn | undefined;

  // if no decoder is found, continue with the next decoder
  if (!fn) return walkDecoders(item, value, index + 1, decoders);

  return fn(
    item,
    () => walkDecoders(item, value, index + 1, decoders),
    (inner) => walkDecoders(inner, value, 0, decoders),
  );
};
