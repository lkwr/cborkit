import { decode } from "../decoding/decoder.ts";
import { defaultDecoder } from "../decoding/default.ts";
import { defaultEncoder } from "../encoding/default.ts";
import { encode } from "../encoding/encoder.ts";
import {
  ClassRegistry,
  type ClassTransformer,
} from "../plugins/class_transformer.ts";

export class CborCodec {
  #classRegistry: ClassRegistry;

  constructor(transformers?: ClassTransformer[]) {
    this.#classRegistry = new ClassRegistry(transformers);
  }

  encode(value: unknown): Uint8Array {
    return encode(value, {
      encoders: [this.#classRegistry.encoder, defaultEncoder],
    });
  }

  decode<T = unknown>(bytes: Uint8Array): T {
    return decode(bytes, {
      decoders: [this.#classRegistry.decoder, defaultDecoder],
    }) as T;
  }
}
