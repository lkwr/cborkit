import * as cbor2 from "cbor2";
import * as cborx from "cbor-x";
import * as cborg from "cborg";
import { Bench } from "tinybench";

import { decode } from "../src/decoding/decoder.ts";
import { defaultDecoder } from "../src/decoding/default.ts";
import { read } from "../src/decoding/reader.ts";
import { defaultEncoder } from "../src/encoding/default.ts";
import { encode } from "../src/encoding/encoder.ts";
import { write } from "../src/encoding/writer.ts";

const encoding = new Bench({ name: "encoding" });
const decoding = new Bench({ name: "decoding" });

const value = {
  asd: 1,
  array: [true, null, undefined, 1, 2, 2.5],
  somenestedShit: {
    asd: 1,
    array: [
      true,
      null,
      undefined,
      1,
      2,
      2.5,
      true,
      null,
      undefined,
      1,
      2,
      2.5,
      "asdasdtrue, null, undefined, 1, 2, 2.5",
    ],
    somenestedShit: { asd: 1, array: [true, null, undefined, 1, 2, 2.5] },
  },
};

const decoded = encode(value, {
  encoders: [defaultEncoder],
});

const decodedJson = JSON.stringify(value);

encoding.add("json", () => {
  JSON.stringify(value);
});

encoding.add("cborg", () => {
  cborg.encode(value);
});

encoding.add("cbor-x", () => {
  cborx.encode(value);
});

encoding.add("cbor2", () => {
  cbor2.encode(value);
});

encoding.add("supercbor", () => {
  encode(value, { encoders: [defaultEncoder] });
});

encoding.add("supercbor writer", () => {
  write({
    type: "map",
    value: [
      [
        { type: "text", value: "asd" },
        { type: "int", value: 1 },
      ],
      [
        { type: "text", value: "array" },
        {
          type: "array",
          value: [
            { type: "simple", value: 21 },
            { type: "simple", value: 22 },
            { type: "simple", value: 23 },
            { type: "int", value: 1 },
            { type: "int", value: 2 },
            { type: "float", value: 2.5 },
          ],
        },
      ],
    ],
  });
});

decoding.add("json", () => {
  JSON.parse(decodedJson);
});

decoding.add("cborg", () => {
  cborg.decode(decoded);
});

decoding.add("cbor-x", () => {
  cborx.decode(decoded);
});

decoding.add("cbor2", () => {
  cbor2.decode(decoded);
});

decoding.add("supercbor", () => {
  decode(decoded, { decoders: [defaultDecoder] });
});

decoding.add("supercbor reader", () => {
  read(decoded);
});

await Promise.all([encoding.run(), decoding.run()]);

console.log(encoding.name);
console.table(encoding.table());

console.log(decoding.name);
console.table(decoding.table());
