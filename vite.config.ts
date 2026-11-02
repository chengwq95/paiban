import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { DICT } from "./site/i18n";

// Fill every [data-t] element with its Chinese text at build time, so the page reads correctly
// before JavaScript runs (search engines, link previews, slow connections).
function prefill(): Plugin {
  return {
    name: "prefill-text",
    transformIndexHtml(html) {
      return html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-t="(\w+)"[^>]*>)(<\/\2>)/g, (all, open: string, _tag, key: string, close: string) => {
        const value = DICT.zh[key as keyof typeof DICT.zh];
        return typeof value === "string" ? open + value.replace(/&/g, "&amp;").replace(/</g, "&lt;") + close : all;
      });
    },
  };
}

export default defineConfig({
  root: "site",
  base: "./",
  plugins: [prefill()],
  test: { root: "." },
});
