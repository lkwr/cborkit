import type { Decoder } from "../decoding/decoder.ts";
import type { Encoder } from "../encoding/encoder.ts";
import type { CborItem } from "../types.ts";

export type ClassTransformer<
  TTarget extends object = object,
  TCbor extends CborItem = CborItem,
> = {
  target: new (...args: any[]) => TTarget;
  encode(value: TTarget, encode: (value: unknown) => CborItem): TCbor;

  tag: number | bigint;
  decode(value: TCbor, decode: (value: CborItem) => unknown): TTarget;
};

export class ClassRegistry {
  #encoders: Map<
    Function,
    { tag: number | bigint; encode: ClassTransformer["encode"] }
  > = new Map();
  #decoders: Map<bigint, ClassTransformer["decode"]> = new Map();

  constructor(transformers: ClassTransformer[] = []) {
    transformers.forEach((transformers) => this.register(transformers));
  }

  get encoder(): Encoder {
    return {
      object: (value, next, encode) => {
        if (value === null) return next();

        const encoder = this.#encoders.get(value.constructor);
        return encoder
          ? {
              type: "tag",
              value: encoder.tag,
              item: encoder.encode(value, encode),
            }
          : next();
      },
    };
  }

  get decoder(): Decoder {
    return {
      tag: (tag, next, decode) => {
        const decoder = this.#decoders.get(BigInt(tag.value));
        return decoder
          ? decoder(tag.item, decode as <T>(value: CborItem) => T)
          : next();
      },
    };
  }

  register<TTarget extends object, TCbor extends CborItem>({
    target,
    tag,
    encode,
    decode,
  }: ClassTransformer<TTarget, TCbor>) {
    this.#encoders.set(target, {
      tag,
      encode,
    });
    this.#decoders.set(BigInt(tag), decode);
  }
}

export const createClassTransformer = <
  TTarget extends object,
  TCbor extends CborItem,
>(
  transformer: ClassTransformer<TTarget, TCbor>,
): ClassTransformer<TTarget, TCbor> => transformer;
