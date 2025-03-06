import { createClassTransformer } from "../plugins/class_transformer.ts";

export const tag0_Date = createClassTransformer({
  target: Date,
  tag: 0,
  encode: (value) => ({ type: "text", value: value.toISOString() }),
  decode: ({ value }) => new Date(value),
});

export const tag1_Date = createClassTransformer({
  target: Date,
  tag: 1,
  encode: (value) => ({
    type: "int",
    value: Math.floor(value.getTime() / 1000),
  }),
  decode: ({ value }) => new Date(value * 1000),
});
