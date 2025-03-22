import { rm } from "fs/promises";
import { build } from "tsup";

import packageJson from "./package.json" with { type: "json" };

await rm(import.meta.dirname + "/dist", { recursive: true, force: true });

await build({
  entry: Object.fromEntries(
    Object.entries(packageJson.exports).map(([key, value]) => [
      key.replace(/^\.\/?/, "") || "index",
      import.meta.dirname + "/" + value,
    ]),
  ),
  format: ["esm", "cjs"],
  outDir: import.meta.dirname + "/dist",
  splitting: true,
  clean: true,
  minify: true,
  dts: true,
  target: "es2020",
});

const glob = new Bun.Glob(import.meta.dirname + "/dist/**/*.d.cts");

for await (const file of glob.scan()) {
  await Bun.file(file).delete();
}

const exports = Object.fromEntries(
  Object.keys(packageJson.exports).map((key) => {
    let fileWithoutExtension = key.replace(/\.ts$/, "");
    if (fileWithoutExtension === ".") fileWithoutExtension = "./index";

    return [
      key,
      {
        import: `${fileWithoutExtension}.js`,
        require: `${fileWithoutExtension}.cjs`,
        types: `${fileWithoutExtension}.d.ts`,
      },
    ];
  }),
);

const distPackageJson = {
  ...packageJson,
  exports,
  scripts: undefined,
  devDependencies: undefined,
};

await Promise.all([
  Bun.file(import.meta.dirname + "/dist/package.json").write(
    JSON.stringify(distPackageJson, undefined, 2),
  ),
  await Bun.file(import.meta.dirname + "/dist/README.md").write(
    Bun.file(import.meta.dirname + "/README.md"),
  ),
]);

console.log("🚀 Build successful 🚀");
