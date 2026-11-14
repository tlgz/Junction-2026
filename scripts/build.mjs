// Bundles the TypeScript sources into dist/ and copies static assets.
// Load dist/ as the unpacked extension in Chrome.

import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const outdir = "dist";

const staticFiles = [
  ["src/manifest.json", "manifest.json"],
  ["src/frontend/popup/popup.html", "popup/popup.html"],
  ["src/frontend/popup/popup.css", "popup/popup.css"],
];

async function copyStatic() {
  for (const [from, to] of staticFiles) {
    await cp(from, `${outdir}/${to}`);
  }
}

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: {
    content: "src/backend/content/main.ts",
    background: "src/backend/background/service-worker.ts",
  },
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  logLevel: "info",
};

await rm(outdir, { recursive: true, force: true });
await mkdir(`${outdir}/popup`, { recursive: true });
await mkdir(`${outdir}/icons`, { recursive: true });
await copyStatic();
await cp("src/icons", `${outdir}/icons`, { recursive: true });

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("Watching for changes. Static files are copied once; rerun after editing them.");
} else {
  await esbuild.build(options);
}
