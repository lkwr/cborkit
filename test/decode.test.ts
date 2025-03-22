import { describe, expect, test } from "bun:test";

import { decode as emptyDecode } from "../src/decoding/decoder.ts";
import { defaultDecoder } from "../src/decoding/default.ts";
import { defaultEncoder } from "../src/encoding/default.ts";
import { encode as emptyEncode } from "../src/encoding/encoder.ts";
import { Simple } from "../src/simple.ts";
import { Tagged } from "../src/tagged.ts";
import { FLOAT_16_SUPPORTED } from "../src/utils/number.ts";
import { bytes } from "./utils.ts";

const decode = (value: Uint8Array): unknown =>
  emptyDecode(value, { decoders: [defaultDecoder] });

const encode = (value: unknown): Uint8Array =>
  emptyEncode(value, { encoders: [defaultEncoder] });

describe("decode", () => {
  test("major 0 - positive integers", () => {
    expect(decode(bytes(0x00))).toEqual(0x00);
    expect(decode(bytes(0x01))).toEqual(0x01);
    expect(decode(bytes(0x02))).toEqual(0x02);
    expect(decode(bytes(0x17))).toEqual(0x17);

    // uint8
    expect(decode(bytes(0x18, 0x18))).toEqual(0x18);
    expect(decode(bytes(0x18, 0x19))).toEqual(0x19);
    expect(decode(bytes(0x18, 0xff))).toEqual(0xff);

    // uint16
    expect(decode(bytes(0x19, 0x01, 0x00))).toEqual(0x0100);
    expect(decode(bytes(0x19, 0xff, 0xff))).toEqual(0xffff);

    // uint32
    expect(decode(bytes(0x1a, 0x00, 0x01, 0x00, 0x00))).toEqual(0x0001_0000);
    expect(decode(bytes(0x1a, 0xff, 0xff, 0xff, 0xff))).toEqual(0xffff_ffff);

    // uint64
    expect(
      decode(bytes(0x1b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00)),
    ).toEqual(0x0000_0001_0000_0000n);
    expect(
      decode(bytes(0x1b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)),
    ).toEqual(0xffff_ffff_ffff_ffffn);
  });

  test("major 1 - negative integers", () => {
    expect(decode(bytes(0x20))).toEqual(-0x01);
    expect(decode(bytes(0x21))).toEqual(-0x02);
    expect(decode(bytes(0x37))).toEqual(-0x18);

    // neg uint8
    expect(decode(bytes(0x38, 0x18))).toEqual(-0x19);
    expect(decode(bytes(0x38, 0x19))).toEqual(-0x1a);
    expect(decode(bytes(0x38, 0xff))).toEqual(-0x100);

    // neg uint16
    expect(decode(bytes(0x39, 0x01, 0x00))).toEqual(-0x0101);
    expect(decode(bytes(0x39, 0xff, 0xff))).toEqual(-0x0001_0000);

    // neg uint32
    expect(decode(bytes(0x3a, 0x00, 0x01, 0x00, 0x00))).toEqual(-0x0001_0001);
    expect(decode(bytes(0x3a, 0xff, 0xff, 0xff, 0xff))).toEqual(
      -0x0000_0001_0000_0000,
    );

    // neg uint64
    expect(
      decode(bytes(0x3b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00)),
    ).toEqual(-0x0000_0001_0000_0001n);
    expect(
      decode(bytes(0x3b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)),
    ).toEqual(-0x0000_0000_0000_0001_0000_0000_0000_0000n);
  });

  test("major 2 - bytes", () => {
    // length 0
    expect(decode(bytes(0x40))).toEqual(bytes());

    // length 1
    expect(decode(bytes(0x41, 0x00))).toEqual(bytes(0x00));

    // length 2
    expect(decode(bytes(0x42, 0x01, 0x00))).toEqual(bytes(0x01, 0x00));

    // length 23
    expect(decode(bytes(0x57, ...Array(23)))).toEqual(bytes(...Array(23)));

    // length 24 (uint8)
    expect(decode(bytes(0x58, 0x18, ...Array(24)))).toEqual(
      bytes(...Array(24)),
    );

    // length 255 (uint8)
    expect(decode(bytes(0x58, 0xff, ...Array(255)))).toEqual(
      bytes(...Array(255)),
    );

    // length 256 (uint16)
    expect(decode(bytes(0x59, 0x01, 0x00, ...Array(256)))).toEqual(
      bytes(...Array(256)),
    );

    // length 65535 (uint16)
    expect(decode(bytes(0x59, 0xff, 0xff, ...Array(65535)))).toEqual(
      bytes(...Array(65535)),
    );

    // length 65536 (uint32)
    expect(
      decode(bytes(0x5a, 0x00, 0x01, 0x00, 0x00, ...Array(65536))),
    ).toEqual(bytes(...Array(65536)));

    // length 8388607 (uint32)
    // using "bytes" here causes a max stack size exceeded error
    expect(
      decode(new Uint8Array([0x5a, 0x00, 0x7f, 0xff, 0xff, ...Array(8388607)])),
    ).toEqual(new Uint8Array(8388607));

    // skip rest because it's too big
  });

  test("major 3 - text", () => {
    // length 0
    expect(decode(bytes(0x60))).toEqual("");

    // length 1
    expect(decode(bytes(0x61, 0x61))).toEqual("a");

    // length 2
    expect(decode(bytes(0x62, 0x61, 0x62))).toEqual("ab");

    // length 23
    expect(
      decode(
        bytes(
          0x77,
          0x31,
          0x32,
          0x33,
          0x34,
          0x35,
          0x36,
          0x37,
          0x38,
          0x39,
          0x30,
          0x31,
          0x32,
          0x33,
          0x34,
          0x35,
          0x36,
          0x37,
          0x38,
          0x39,
          0x30,
          0x31,
          0x32,
          0x33,
        ),
      ),
    ).toEqual("12345678901234567890123");

    // length 24 (uint8)
    expect(decode(bytes(0x78, 0x18, ...Array(24).fill(0x30)))).toEqual(
      Array(24).fill("0").join(""),
    );

    // length 255 (uint8)
    expect(decode(bytes(0x78, 0xff, ...Array(255).fill(0x31)))).toEqual(
      Array(255).fill("1").join(""),
    );

    // length 256 (uint16)
    expect(decode(bytes(0x79, 0x01, 0x00, ...Array(256).fill(0x32)))).toEqual(
      Array(256).fill("2").join(""),
    );

    // length 65535 (uint16)
    expect(decode(bytes(0x79, 0xff, 0xff, ...Array(65535).fill(0x33)))).toEqual(
      Array(65535).fill("3").join(""),
    );

    // length 65536 (uint32)
    expect(
      decode(bytes(0x7a, 0x00, 0x01, 0x00, 0x00, ...Array(65536).fill(0x34))),
    ).toEqual(Array(65536).fill("4").join(""));

    // length 8388607 (uint32)
    expect(
      decode(
        new Uint8Array([
          0x7a,
          0x00,
          0x7f,
          0xff,
          0xff,
          ...Array(8388607).fill(0x35),
        ]),
      ),
    ).toEqual(Array(8388607).fill("5").join(""));

    // skip rest because it's too big
  });

  test("major 4 - array", () => {
    // length 0
    expect(decode(bytes(0x80))).toEqual([]);

    // length 1
    expect(decode(bytes(0x81, 0x00))).toEqual([0x00]);

    // length 2
    expect(decode(bytes(0x82, 0x01, 0x00))).toEqual([0x01, 0x00]);

    // length 23
    expect(decode(bytes(0x97, ...Array(23)))).toEqual(Array(23).fill(0x00));

    // length 24 (uint8)
    expect(decode(bytes(0x98, 0x18, ...Array(24)))).toEqual(
      Array(24).fill(0x00),
    );

    // length 255 (uint8)
    expect(decode(bytes(0x98, 0xff, ...Array(255)))).toEqual(
      Array(255).fill(0x00),
    );

    // length 256 (uint16)
    expect(decode(bytes(0x99, 0x01, 0x00, ...Array(256)))).toEqual(
      Array(256).fill(0x00),
    );

    // length 65535 (uint16)
    expect(decode(bytes(0x99, 0xff, 0xff, ...Array(65535)))).toEqual(
      Array(65535).fill(0x00),
    );

    // length 65536 (uint32)
    expect(
      decode(bytes(0x9a, 0x00, 0x01, 0x00, 0x00, ...Array(65536))),
    ).toEqual(Array(65536).fill(0x00));

    // skip rest because it's too big
  });

  test("major 5 - map", () => {
    // length 0
    expect(decode(bytes(0xa0))).toEqual({});

    // length 1
    expect(decode(bytes(0xa1, 0x61, 0x61, 0x00))).toEqual({ a: 0 });

    // length 23
    expect(
      decode(
        bytes(
          0xb7,
          ...Array(23)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(23)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // length 24 (uint8)
    expect(
      decode(
        bytes(
          0xb8,
          0x18,
          ...Array(24)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(24)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // length 255 (uint8)
    expect(
      decode(
        bytes(
          0xb8,
          0xff,
          ...Array(255)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(255)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // length 256 (uint16)
    expect(
      decode(
        bytes(
          0xb9,
          0x01,
          0x00,
          ...Array(256)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(256)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // length 65535 (uint16)
    expect(
      decode(
        bytes(
          0xb9,
          0xff,
          0xff,
          ...Array(65535)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(65535)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // length 65536 (uint32)
    expect(
      decode(
        bytes(
          0xba,
          0x00,
          0x01,
          0x00,
          0x00,
          ...Array(65536)
            .fill(0x00)
            .flatMap((_, i) => [...encode(i.toString()), 0x00]),
        ),
      ),
    ).toEqual(
      Object.fromEntries(
        Array(65536)
          .fill(0)
          .map((_, i) => [i, 0]),
      ),
    );

    // skip rest because it's too big
  });

  // TODO test major 6 - tag
  test("major 6 - tag", () => {
    // tag 0
    expect(decode(bytes(0xc0, 0x00))).toEqual(Tagged.from(0, 0));

    // tag 1
    expect(decode(bytes(0xc1, 0x00))).toEqual(Tagged.from(1, 0));

    // tag 23
    expect(decode(bytes(0xd7, 0x00))).toEqual(Tagged.from(23, 0));

    // tag 24 (uint8)
    expect(decode(bytes(0xd8, 0x18, 0x00))).toEqual(Tagged.from(24, 0));

    // tag 255 (uint8)
    expect(decode(bytes(0xd8, 0xff, 0x00))).toEqual(Tagged.from(255, 0));

    // tag 256 (uint16)
    expect(decode(bytes(0xd9, 0x01, 0x00, 0x00))).toEqual(Tagged.from(256, 0));

    // tag 65535 (uint16)
    expect(decode(bytes(0xd9, 0xff, 0xff, 0x00))).toEqual(
      Tagged.from(65535, 0),
    );

    // tag 65536 (uint32)
    expect(decode(bytes(0xda, 0x00, 0x01, 0x00, 0x00, 0x00))).toEqual(
      Tagged.from(65536, 0),
    );

    // tag 4294967295 (uint32)
    expect(decode(bytes(0xda, 0xff, 0xff, 0xff, 0xff, 0x00))).toEqual(
      Tagged.from(4294967295, 0),
    );

    // tag 4294967296 (uint64)
    expect(
      decode(bytes(0xdb, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00)),
    ).toEqual(Tagged.from(4294967296, 0));

    // tag 18446744073709551615n (uint64)
    expect(
      decode(bytes(0xdb, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)),
    ).toEqual(Tagged.from(18446744073709551615n, 0));
  });

  test("major 7 - simple", () => {
    // simple 0
    expect(decode(bytes(0xe0))).toEqual(Simple.from(0));

    // simple 1
    expect(decode(bytes(0xe1))).toEqual(Simple.from(1));

    // simple 20 - false
    expect(decode(bytes(0xf4))).toEqual(false);

    // simple 21 - true
    expect(decode(bytes(0xf5))).toEqual(true);

    // simple 22 - null
    expect(decode(bytes(0xf6))).toEqual(null);

    // simple 23 - undefined
    expect(decode(bytes(0xf7))).toEqual(undefined);

    // simple 24 (uint8)
    expect(decode(bytes(0xf8, 0x18))).toEqual(Simple.from(24));

    // simple 255 (uint8)
    expect(decode(bytes(0xf8, 0xff))).toEqual(Simple.from(255));
  });

  test("major 7 - float", () => {
    // float 16
    if (FLOAT_16_SUPPORTED) {
      expect(decode(bytes(0xf9, 0x3e, 0x00))).toEqual(1.5);
      expect(decode(bytes(0xf9, 0x41, 0x00))).toEqual(2.5);
      expect(decode(bytes(0xf9, 0x45, 0x20))).toEqual(5.125);
      expect(decode(bytes(0xf9, 0x41, 0x20))).toEqual(2.5625);
    }

    // float 32
    expect(decode(bytes(0xfa, 0x2f, 0x00, 0x00, 0x00))).toEqual(
      0.000000000116415321826934814453125,
    );

    // float 64
    expect(
      decode(bytes(0xfb, 0x3f, 0xf5, 0x47, 0xae, 0x14, 0x7a, 0xe1, 0x48)),
    ).toEqual(1.33);
  });
});
