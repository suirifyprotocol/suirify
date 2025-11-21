import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "rollup-plugin-typescript2";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const input = "src/index.ts";

export default {
  input,
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ],
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true
    },
    {
      file: pkg.module,
      format: "es",
      sourcemap: true
    }
  ],
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    typescript({ useTsconfigDeclarationDir: true })
  ]
};
