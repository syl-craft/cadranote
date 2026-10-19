import { build } from "esbuild";

await build({
  entryPoints: {
    content: "src/entrypoints/content.ts",
    background: "src/entrypoints/background.ts",
    "page-inspector": "src/entrypoints/page-inspector.ts",
    options: "src/entrypoints/options.ts",
    unavailable: "src/entrypoints/unavailable.ts",
  },
  outdir: ".",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "chrome110",
  loader: { ".css": "text", ".html": "text", ".svg": "text" },
  banner: { js: "// Generated file. Edit src/ and run npm run build." },
  legalComments: "none",
  logLevel: "info",
});
