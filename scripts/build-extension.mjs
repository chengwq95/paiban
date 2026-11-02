// Bundles the browser extension into extension/dist and zips it for the website's download link.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const out = "extension/dist";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: ["extension/src/background.ts", "extension/src/content.ts", "extension/src/popup.ts"],
  outdir: out,
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: true,
  legalComments: "none",
});

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const manifest = JSON.parse(readFileSync("extension/manifest.json", "utf8"));
writeFileSync(`${out}/manifest.json`, JSON.stringify({ ...manifest, version }, null, 2));
for (const path of ["popup.html", "popup.css", "icons", "_locales"]) cpSync(`extension/${path}`, `${out}/${path}`, { recursive: true });

mkdirSync("site/public", { recursive: true });
rmSync("site/public/paiban-extension.zip", { force: true });
execFileSync("zip", ["-qr", "../../site/public/paiban-extension.zip", "."], { cwd: out });
console.log(`Built ${out} and site/public/paiban-extension.zip (v${version})`);
