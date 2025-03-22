# CBOR Kit

A modern, extensible CBOR (Concise Binary Object Representation) library for TypeScript and JavaScript.

By default, CBOR Kit does not support tags and custom objects like JavaScript `Map`s. However, it can be easily supported by adding custom encoders and decoders. See the [Advanced Usage](#advanced-usage) section for more details.

## Features

- 🚀 Fast & Lightweight: Optimized encoding and decoding.
- 🔌 Extensible: Easily add custom encoders and decoders.
- 🎯 Customizable: Fine-tune decoding and encoding options.
- ✅ Spec-Compliant: Adheres to RFC 8949.
- 📦 Tree-Shakable: Bundles only the necessary code for your project.
- 💻 TypeScript: Written in TypeScript for type safety and better DX.

## Installation

```bash
# npm
npm install cborkit

# pnpm
pnpm add cborkit

# yarn
yarn add cborkit

# bun
bun add cborkit
```

## Basic Usage

### Encoding

```ts
import { encode } from "cborkit/encoder";

const data = { foo: "bar", baz: 123 };
const encoded = encode(data);

console.log(encoded); // [130, 169, 102, 111, 111, 98, 97, 114]
```

### Decoding

```ts
import { decode } from "cborkit/decoder";

const encoded = [130, 169, 102, 111, 111, 98, 97, 114];
const decoded = decode(encoded);

console.log(decoded); // { foo: 'bar', baz: 123 }
```

## Advanced Usage

TODO encoders / decoders plugins

TODO codec

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).
