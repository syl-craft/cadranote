import { build } from "esbuild";

await build({
  entryPoints: ["tests/locator-harness.ts"],
  outfile: ".test-build/locator.js",
  bundle: true,
  platform: "browser",
  format: "iife",
});

await build({
  entryPoints: ["tests/session-machine.test.ts"],
  outfile: ".test-build/session-machine.test.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
});
