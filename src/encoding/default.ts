import { Simple } from "../simple.ts";
import { Tagged } from "../tagged.ts";
import type { Encoder } from "./encoder.ts";

export const defaultEncoder: Encoder = {
  number: (value) =>
    Number.isInteger(value)
      ? { type: "int", value: value }
      : { type: "float", value },

  bigint: (value) => ({ type: "int", value }),

  string: (value) => ({ type: "text", value }),

  boolean: (value) => ({ type: "simple", value: value ? 21 : 20 }),

  undefined: () => ({ type: "simple", value: 23 }),

  object: (value, next, encode) => {
    // null
    if (value === null) return { type: "simple", value: 22 };

    // array
    if (Array.isArray(value))
      return { type: "array", value: value.map((item) => encode(item)) };

    // raw object
    if (Object.getPrototypeOf(value) === Object.prototype) {
      return {
        type: "map",
        value: Object.entries(value).map(([key, value]) => [
          encode(key),
          encode(value),
        ]),
      };
    }

    // uint8array
    if (value instanceof Uint8Array)
      return {
        type: "bytes",
        value,
      };

    // tagged
    if (value instanceof Tagged)
      return {
        type: "tag",
        value: value.tag,
        item: encode(value.item),
      };

    // simple
    if (value instanceof Simple)
      return {
        type: "simple",
        value: value.value,
      };

    // we can encode the value so we pass it to the next middleware
    return next();
  },
};
