import type { Decoder } from "../decoding/decoder.ts";

export type MapDecoderOptions = {
  /**
   * Determines when to return a map.
   *
   * - `"always"` - Always return a map.
   * - `"if-needed"` - Return a map only if some keys are not text.
   *
   * @default "if-needed"
   */
  mode?: "always" | "if-needed";
};

export const mapDecoder = (options?: MapDecoderOptions): Decoder => {
  return {
    map: (item, next) => {
      switch (options?.mode ?? "if-needed") {
        case "always":
          // always return a map
          return new Map(item.value);

        case "if-needed": {
          // check if some keys are not text
          const containsNonTextKeys = item.value.some(
            ([key]) => key.type !== "text",
          );

          // if all keys are text, continue with the next decoder
          if (!containsNonTextKeys) break;

          // if some keys are not text, return a map
          return new Map(item.value);
        }
      }

      return next();
    },
  };
};
