// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fixHtml } from "../src/dom";

describe("fixHtml", () => {
  it("keeps markup while fixing text", () => {
    expect(fixHtml("<p>用<b>iPhone</b>读<a href=\"/x\">唐诗</a>,很方便!</p>")).toBe("<p>用 <b>iPhone</b> 读<a href=\"/x\">唐诗</a>，很方便！</p>");
  });
  it("puts spaces outside links", () => {
    expect(fixHtml("访问<a href=\"#\">GitHub</a>获取")).toBe("访问 <a href=\"#\">GitHub</a> 获取");
  });
  it("does not join separate paragraphs", () => {
    expect(fixHtml("<p>床前明月光</p><p>Moonlight</p>")).toBe("<p>床前明月光</p><p>Moonlight</p>");
  });
  it("leaves code alone but spaces around it", () => {
    expect(fixHtml("<p>运行<code>npm安装,b</code>命令</p>")).toBe("<p>运行 <code>npm安装,b</code> 命令</p>");
    expect(fixHtml("<pre>代码,不变</pre>")).toBe("<pre>代码,不变</pre>");
    expect(fixHtml("<p>运行<code>npm安装</code>命令</p>")).toBe("<p>运行 <code>npm安装</code> 命令</p>");
  });
  it("honours skipped changes", () => {
    expect(fixHtml("<p>用<b>AI</b>读,好!</p>", { skip: [{ start: 1, end: 1 }] })).toBe("<p>用<b>AI</b> 读，好！</p>");
  });
  it("fixes punctuation split across nodes", () => {
    expect(fixHtml("<p>好诗<i>...</i></p>")).toBe("<p>好诗<i>……</i></p>");
  });
});
