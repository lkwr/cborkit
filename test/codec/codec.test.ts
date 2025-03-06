import { describe, expect, test } from "bun:test";

import { c } from "../../dist/chunk-S75S2I3V.cjs";
import { CborCodec } from "../../src/codec/codec.ts";
import { NoEncoderError } from "../../src/encoding/errors.ts";
import { createClassTransformer } from "../../src/plugins/class_transformer.ts";

const encodeAndDecode = (codec: CborCodec, value: unknown): unknown =>
  codec.decode(codec.encode(value));

const dateTransformer = createClassTransformer({
  target: Date,
  tag: 0,
  encode: (value) => ({ type: "text", value: value.toISOString() }),
  decode: ({ value }) => new Date(value),
});

const SOME_DATE = new Date("2025-04-23T14:33:29.000+01:00");

describe("CborCodec", () => {
  test("empty", () => {
    const codec = new CborCodec();

    expect(encodeAndDecode(codec, { foo: "bar" })).toEqual({ foo: "bar" });
    expect(() => encodeAndDecode(codec, SOME_DATE)).toThrowError(
      NoEncoderError,
    );
  });

  test("with class transformer", () => {
    const codec = new CborCodec([dateTransformer]);

    expect(encodeAndDecode(codec, { foo: "bar" })).toEqual({
      foo: "bar",
    });
    expect(encodeAndDecode(codec, SOME_DATE)).toEqual(SOME_DATE);
    expect(() => encodeAndDecode(codec, new Set())).toThrowError(
      NoEncoderError,
    );
  });
});
