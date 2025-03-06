import { Simple } from "../simple.ts";
import { Tagged } from "../tagged.ts";
import type { Decoder } from "./decoder.ts";

export const defaultDecoder: Decoder = {
  int: ({ value }) => value,

  bytes: ({ value }) => value,

  text: ({ value }) => value,

  array: ({ value }, _, decode) => value.map((item) => decode(item)),

  map: ({ value }, _, decode) =>
    Object.fromEntries(
      value
        // filter out all non-text keys
        .filter(([key]) => key.type === "text")
        .map(([key, value]) => [decode(key), decode(value)]),
    ),

  tag: ({ value, item }, _, decode) => new Tagged(value, decode(item)),

  simple: ({ value }) => {
    switch (value) {
      case 20:
        return false;
      case 21:
        return true;
      case 22:
        return null;
      case 23:
        return undefined;
      default:
        return new Simple(value);
    }
  },

  float: ({ value }) => value,
};
