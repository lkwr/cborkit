import { describe, expect, test } from "bun:test";

import { defaultEncoder } from "../src/encoding/default.ts";
import { encode as emptyEncode } from "../src/encoding/encoder.ts";
import { Simple } from "../src/simple.ts";
import { Tagged } from "../src/tagged.ts";
import { FLOAT_16_SUPPORTED } from "../src/utils/number.ts";

const encode = (value: unknown) =>
  emptyEncode(value, { encoders: [defaultEncoder] });

describe("encode", () => {
  test("major 0 - positive integers", () => {
    expect(encode(0x00)).toEqual(new Uint8Array([0x00]));
    expect(encode(0x01)).toEqual(new Uint8Array([0x01]));
    expect(encode(0x02)).toEqual(new Uint8Array([0x02]));
    expect(encode(0x17)).toEqual(new Uint8Array([0x17]));

    // uint8
    expect(encode(0x18)).toEqual(new Uint8Array([0x18, 0x18]));
    expect(encode(0x19)).toEqual(new Uint8Array([0x18, 0x19]));
    expect(encode(0xff)).toEqual(new Uint8Array([0x18, 0xff]));

    // uint16
    expect(encode(0x0100)).toEqual(new Uint8Array([0x19, 0x01, 0x00]));
    expect(encode(0xffff)).toEqual(new Uint8Array([0x19, 0xff, 0xff]));

    // uint32
    expect(encode(0x0001_0000)).toEqual(
      new Uint8Array([0x1a, 0x00, 0x01, 0x00, 0x00]),
    );
    expect(encode(0xffff_ffff)).toEqual(
      new Uint8Array([0x1a, 0xff, 0xff, 0xff, 0xff]),
    );

    // uint64
    expect(encode(0x0000_0001_0000_0000)).toEqual(
      new Uint8Array([0x1b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
    );
    expect(encode(0xffff_ffff_ffff_ffffn)).toEqual(
      new Uint8Array([0x1b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    );
  });

  test("major 1 - negative integers", () => {
    expect(encode(-0x01)).toEqual(new Uint8Array([0x20]));
    expect(encode(-0x02)).toEqual(new Uint8Array([0x21]));
    expect(encode(-0x18)).toEqual(new Uint8Array([0x37]));

    // neg uint8
    expect(encode(-0x19)).toEqual(new Uint8Array([0x38, 0x18]));
    expect(encode(-0x1a)).toEqual(new Uint8Array([0x38, 0x19]));
    expect(encode(-0x0100)).toEqual(new Uint8Array([0x38, 0xff]));

    // neg uint16
    expect(encode(-0x0101)).toEqual(new Uint8Array([0x39, 0x01, 0x00]));
    expect(encode(-0x0001_0000)).toEqual(new Uint8Array([0x39, 0xff, 0xff]));

    // neg uint32
    expect(encode(-0x0001_0001)).toEqual(
      new Uint8Array([0x3a, 0x00, 0x01, 0x00, 0x00]),
    );
    expect(encode(-0x0000_0001_0000_0000)).toEqual(
      new Uint8Array([0x3a, 0xff, 0xff, 0xff, 0xff]),
    );

    // neg uint64
    expect(encode(-0x0000_0001_0000_0001)).toEqual(
      new Uint8Array([0x3b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
    );
    expect(encode(-0x0000_0000_0000_0001_0000_0000_0000_0000n)).toEqual(
      new Uint8Array([0x3b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    );
  });

  test("major 2 - bytes", () => {
    // length 0
    expect(encode(new Uint8Array([]))).toEqual(new Uint8Array([0x40]));

    // length 1
    expect(encode(new Uint8Array([0x00]))).toEqual(
      new Uint8Array([0x41, 0x00]),
    );

    // length 2
    expect(encode(new Uint8Array([0x01, 0x00]))).toEqual(
      new Uint8Array([0x42, 0x01, 0x00]),
    );

    // length 23
    expect(encode(new Uint8Array(23))).toEqual(
      new Uint8Array([0x57, ...Array(23)]),
    );

    // length 24 (uint8)
    expect(encode(new Uint8Array(24))).toEqual(
      new Uint8Array([0x58, 0x18, ...Array(24)]),
    );

    // length 255 (uint8)
    expect(encode(new Uint8Array(255))).toEqual(
      new Uint8Array([0x58, 0xff, ...Array(255)]),
    );

    // length 256 (uint16)
    expect(encode(new Uint8Array(256))).toEqual(
      new Uint8Array([0x59, 0x01, 0x00, ...Array(256)]),
    );

    // length 65535 (uint16)
    expect(encode(new Uint8Array(65535))).toEqual(
      new Uint8Array([0x59, 0xff, 0xff, ...Array(65535)]),
    );

    // length 65536 (uint32)
    expect(encode(new Uint8Array(65536))).toEqual(
      new Uint8Array([0x5a, 0x00, 0x01, 0x00, 0x00, ...Array(65536)]),
    );

    // length 8388607 (uint32)
    expect(encode(new Uint8Array(8388607))).toEqual(
      new Uint8Array([0x5a, 0x00, 0x7f, 0xff, 0xff, ...Array(8388607)]),
    );

    // skip rest because it's too big
  });

  test("major 3 - text", () => {
    // length 0
    expect(encode("")).toEqual(new Uint8Array([0x60]));

    // length 1
    expect(encode("a")).toEqual(new Uint8Array([0x61, 0x61]));

    // length 2
    expect(encode("ab")).toEqual(new Uint8Array([0x62, 0x61, 0x62]));

    // length 23
    expect(encode("12345678901234567890123")).toEqual(
      new Uint8Array([
        0x77, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31,
        0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33,
      ]),
    );

    // length 24 (uint8)
    expect(encode(Array(24).fill("0").join(""))).toEqual(
      new Uint8Array([0x78, 0x18, ...Array(24).fill(0x30)]),
    );

    // length 255 (uint8)
    expect(encode(Array(255).fill("1").join(""))).toEqual(
      new Uint8Array([0x78, 0xff, ...Array(255).fill(0x31)]),
    );

    // length 256 (uint16)
    expect(encode(Array(256).fill("2").join(""))).toEqual(
      new Uint8Array([0x79, 0x01, 0x00, ...Array(256).fill(0x32)]),
    );

    // length 65535 (uint16)
    expect(encode(Array(65535).fill("3").join(""))).toEqual(
      new Uint8Array([0x79, 0xff, 0xff, ...Array(65535).fill(0x33)]),
    );

    // length 65536 (uint32)
    expect(encode(Array(65536).fill("4").join(""))).toEqual(
      new Uint8Array([
        0x7a,
        0x00,
        0x01,
        0x00,
        0x00,
        ...Array(65536).fill(0x34),
      ]),
    );

    // length 8388607 (uint32)
    expect(encode(Array(8388607).fill("5").join(""))).toEqual(
      new Uint8Array([
        0x7a,
        0x00,
        0x7f,
        0xff,
        0xff,
        ...Array(8388607).fill(0x35),
      ]),
    );

    // skip rest because it's too big
  });

  test("major 4 - array", () => {
    // length 0
    expect(encode([])).toEqual(new Uint8Array([0x80]));

    // length 1
    expect(encode([0])).toEqual(new Uint8Array([0x81, 0x00]));

    // length 2
    expect(encode([0, 1])).toEqual(new Uint8Array([0x82, 0x00, 0x01]));

    // length 23
    expect(encode(Array(23).fill(0))).toEqual(
      new Uint8Array([0x97, ...Array(23).fill(0x00)]),
    );

    // length 24 (uint8)
    expect(encode(Array(24).fill(0))).toEqual(
      new Uint8Array([0x98, 0x18, ...Array(24).fill(0x00)]),
    );

    // length 255 (uint8)
    expect(encode(Array(255).fill(0))).toEqual(
      new Uint8Array([0x98, 0xff, ...Array(255).fill(0x00)]),
    );

    // length 256 (uint16)
    expect(encode(Array(256).fill(0))).toEqual(
      new Uint8Array([0x99, 0x01, 0x00, ...Array(256).fill(0x00)]),
    );

    // length 65535 (uint16)
    expect(encode(Array(65535).fill(0))).toEqual(
      new Uint8Array([0x99, 0xff, 0xff, ...Array(65535).fill(0x00)]),
    );

    // length 65536 (uint32)
    expect(encode(Array(65536).fill(0))).toEqual(
      new Uint8Array([
        0x9a,
        0x00,
        0x01,
        0x00,
        0x00,
        ...Array(65536).fill(0x00),
      ]),
    );

    // skip rest because it's too big
  });

  test("major 5 - map", () => {
    // length 0
    expect(encode({})).toEqual(new Uint8Array([0xa0]));

    // length 1
    expect(encode({ a: 0 })).toEqual(new Uint8Array([0xa1, 0x61, 0x61, 0x00]));

    // length 23
    expect(
      encode(
        Object.fromEntries(
          Array(23)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xb7,
        ...Array(23)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // length 24 (uint8)
    expect(
      encode(
        Object.fromEntries(
          Array(24)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xb8,
        0x18,
        ...Array(24)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // length 255 (uint8)
    expect(
      encode(
        Object.fromEntries(
          Array(255)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xb8,
        0xff,
        ...Array(255)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // length 256 (uint16)
    expect(
      encode(
        Object.fromEntries(
          Array(256)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xb9,
        0x01,
        0x00,
        ...Array(256)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // length 65535 (uint16)
    expect(
      encode(
        Object.fromEntries(
          Array(65535)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xb9,
        0xff,
        0xff,
        ...Array(65535)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // length 65536 (uint32)
    expect(
      encode(
        Object.fromEntries(
          Array(65536)
            .fill(0)
            .map((_, i) => [i, 0]),
        ),
      ),
    ).toEqual(
      new Uint8Array([
        0xba,
        0x00,
        0x01,
        0x00,
        0x00,
        ...Array(65536)
          .fill(0x00)
          .flatMap((_, i) => [...encode(i.toString()), 0x00]),
      ]),
    );

    // skip rest because it's too big
  });

  test("major 6 - tag", () => {
    // tag 0
    expect(encode(Tagged.from(0, 0))).toEqual(new Uint8Array([0xc0, 0x00]));

    // tag 1
    expect(encode(Tagged.from(1, 0))).toEqual(new Uint8Array([0xc1, 0x00]));

    // tag 23
    expect(encode(Tagged.from(23, 0))).toEqual(new Uint8Array([0xd7, 0x00]));

    // tag 24 (uint8)
    expect(encode(Tagged.from(24, 0))).toEqual(
      new Uint8Array([0xd8, 0x18, 0x00]),
    );

    // tag 255 (uint8)
    expect(encode(Tagged.from(255, 0))).toEqual(
      new Uint8Array([0xd8, 0xff, 0x00]),
    );

    // tag 256 (uint16)
    expect(encode(Tagged.from(256, 0))).toEqual(
      new Uint8Array([0xd9, 0x01, 0x00, 0x00]),
    );

    // tag 65535 (uint16)
    expect(encode(Tagged.from(65535, 0))).toEqual(
      new Uint8Array([0xd9, 0xff, 0xff, 0x00]),
    );

    // tag 65536 (uint32)
    expect(encode(Tagged.from(65536, 0))).toEqual(
      new Uint8Array([0xda, 0x00, 0x01, 0x00, 0x00, 0x00]),
    );

    // tag 4294967295 (uint32)
    expect(encode(Tagged.from(4294967295, 0))).toEqual(
      new Uint8Array([0xda, 0xff, 0xff, 0xff, 0xff, 0x00]),
    );

    // tag 4294967296 (uint64)
    expect(encode(Tagged.from(4294967296, 0))).toEqual(
      new Uint8Array([
        0xdb, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]),
    );

    // tag 18446744073709551615 (uint64)
    expect(encode(Tagged.from(18446744073709551615n, 0))).toEqual(
      new Uint8Array([
        0xdb, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]),
    );
  });

  test("major 7 - simple", () => {
    // simple 0
    expect(encode(new Simple(0))).toEqual(new Uint8Array([0xe0]));

    // simple 1
    expect(encode(new Simple(1))).toEqual(new Uint8Array([0xe1]));

    // simple 20 - false
    expect(encode(false)).toEqual(new Uint8Array([0xf4]));

    // simple 21 - true
    expect(encode(true)).toEqual(new Uint8Array([0xf5]));

    // simple 22 - null
    expect(encode(null)).toEqual(new Uint8Array([0xf6]));

    // simple 23 - undefined
    expect(encode(undefined)).toEqual(new Uint8Array([0xf7]));

    // simple 23
    expect(encode(new Simple(23))).toEqual(new Uint8Array([0xf7]));

    // simple 24 (uint8)
    expect(encode(new Simple(24))).toEqual(new Uint8Array([0xf8, 0x18]));

    // simple 255 (uint8)
    expect(encode(new Simple(255))).toEqual(new Uint8Array([0xf8, 0xff]));
  });

  test("major 7 - float", () => {
    // should encode to pos uint8
    expect(encode(0.0)).toEqual(new Uint8Array([0x00]));

    // should encode to pos uint8
    expect(encode(1.0)).toEqual(new Uint8Array([0x01]));

    // float 16
    if (FLOAT_16_SUPPORTED) {
      expect(encode(1.5)).toEqual(new Uint8Array([0xf9, 0x3e, 0x00]));
      expect(encode(2.5)).toEqual(new Uint8Array([0xf9, 0x41, 0x00]));
      expect(encode(5.125)).toEqual(new Uint8Array([0xf9, 0x45, 0x20]));
      expect(encode(2.5625)).toEqual(new Uint8Array([0xf9, 0x41, 0x20]));
    }

    // float 32
    expect(encode(0.000000000116415321826934814453125)).toEqual(
      new Uint8Array([0xfa, 0x2f, 0x00, 0x00, 0x00]),
    );

    // float 64
    expect(encode(1.33)).toEqual(
      new Uint8Array([0xfb, 0x3f, 0xf5, 0x47, 0xae, 0x14, 0x7a, 0xe1, 0x48]),
    );
  });
});
