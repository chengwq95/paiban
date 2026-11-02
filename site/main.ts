import { checkElement, fixElement } from "../src/dom";
import { DICT } from "./i18n";
import { check, fix, RULES, suggest, type Options, type Problem, type RuleId, type Span, type Suggestion } from "../src/index";

type Lang = "zh" | "en";


const SAMPLE = `# 枫桥夜泊:一夜的钟声

张继(字懿孙)约在756年途经苏州,夜泊枫桥,静静的听着远处的钟声,写下了这首只有28个字的诗...

> 月落乌啼霜满天,江枫渔火对愁眠.
> 姑苏城外寒山寺,夜半钟声到客船.

1200多年后,寒山寺的钟声仍在--每年除夕都会敲响108下。现在打开地图App就能导航到枫桥,问AI"渔火"是什么也立刻有答案,但那份客愁依旧动人!

\`\`\`text
代码块不会被修改:月落乌啼霜满天,江枫渔火对愁眠.
\`\`\`
`;

const PREVIEW = {
  sc: `<h3>枫桥夜泊</h3><p>月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。</p><p>这首诗只有 28 个字，却流传了 1200 多年。张继写下它时<em>正夜泊枫桥</em>，听着远处的钟声，久久不能入眠。</p><p>“好的诗不需要解释，”老师说，“读出声来就够了。”</p>`,
  tc: `<h3>楓橋夜泊</h3><p>月落烏啼霜滿天，江楓漁火對愁眠。姑蘇城外寒山寺，夜半鐘聲到客船。</p><p>這首詩只有 28 個字，卻流傳了 1200 多年。張繼寫下它時<em>正夜泊楓橋</em>，聽著遠處的鐘聲，久久不能入眠。</p><p>「好的詩不需要解釋，」老師說，「讀出聲來就夠了。」</p>`,
};

const FONTS = {
  sc: {
    sans: `-apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif`,
    serif: `"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "STSong", "SimSun", serif`,
  },
  tc: {
    sans: `-apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "Source Han Sans TC", sans-serif`,
    serif: `"Songti TC", "Noto Serif CJK TC", "Source Han Serif TC", "PMingLiU", serif`,
  },
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

let lang: Lang = document.documentElement.lang === "en" ? "en" : "zh";
const t = () => DICT[lang];

// ---------- State ----------
const ruleState: Partial<Record<RuleId, boolean>> = (() => {
  try { return JSON.parse(store.get("paiban-rules") ?? "{}"); } catch { return {}; }
})();
let view: "marks" | "result" = "marks";
// "plain" edits text in the textarea; "rich" keeps formatting pasted from Word, web pages or editors.
type Mode = "plain" | "rich";
let mode: Mode = "plain";
let fileName = "paiban.md";
// Changes the user clicked to turn down, as spans of the current text. Cleared whenever the text changes.
let rejected: Span[] = [];
let showHints = store.get("paiban-hints") !== "off";
let hints: Suggestion[] = [];
const options = (): Options => ({ rules: ruleState, quotes: $<HTMLSelectElement>("#quotes").value as Options["quotes"], skip: rejected });
const isRejected = (p: Span) => rejected.some((r) => r.start === p.start && r.end === p.end);
const isOn = (id: RuleId) => ruleState[id] ?? RULES.find((r) => r.id === id)!.defaultOn;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ruleTitle = (id: RuleId) => RULES.find((r) => r.id === id)!.title[lang];

function marked(text: string, problems: Problem[], suggestions: Suggestion[]) {
  // Changes and suggestions in text order; anything overlapping an earlier one waits.
  const items = [
    ...problems.map((p) => ({ kind: "fix" as const, p, start: p.start, end: p.end })),
    ...suggestions.map((h, i) => ({ kind: "hint" as const, h, i, start: h.start, end: h.end })),
  ].sort((a, b) => a.start - b.start || a.end - b.end);
  let html = "";
  let pos = 0;
  for (const item of items) {
    if (item.start < pos) continue;
    html += escapeHtml(text.slice(pos, item.start));
    if (item.kind === "hint") {
      const tip = escapeHtml(`${item.h.message[lang]} → ${item.h.replacement}（${t().hintClick}）`);
      html += `<span class="hint" data-hint="${item.i}" data-tip="${tip}">${escapeHtml(item.h.original)}</span>`;
    } else {
      const p = item.p;
      const off = isRejected(p);
      const tip = escapeHtml(`${ruleTitle(p.rule)}（${off ? t().markRestore : t().markReject}）`);
      const del = p.original ? `<del>${escapeHtml(p.original.replace(/ /g, "\u00a0"))}</del>` : "";
      const ins = p.replacement === " " ? `<ins class="space"> </ins>` : p.replacement ? `<ins>${escapeHtml(p.replacement)}</ins>` : "";
      html += `<span class="mark${off ? " off" : ""}" data-start="${p.start}" data-end="${p.end}" data-tip="${tip}">${del}${ins}</span>`;
    }
    pos = item.end;
  }
  return html + escapeHtml(text.slice(pos));
}

let toastTimer = 0;
function toast(message: string) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2400);
}

// ---------- Tool ----------
const input = $<HTMLTextAreaElement>("#input");
const rich = $("#rich");

/** Current content: plain text, or HTML in rich mode. */
const value = () => (mode === "rich" ? rich.innerHTML : input.value);
const isBlank = () => (mode === "rich" ? !rich.textContent!.trim() : !input.value.trim());

function fixedHtml() {
  const doc = new DOMParser().parseFromString(`<body>${rich.innerHTML}</body>`, "text/html");
  fixElement(doc.body, options());
  return doc.body.innerHTML;
}
const fixedText = () => fix(input.value, options());

function render() {
  const blank = isBlank();
  // Marks show every change, including turned-down ones (greyed out) so they can be turned back on.
  const all = { ...options(), skip: [] };
  const { text, problems } = mode === "rich"
    ? checkElement(rich, all)
    : { text: input.value, problems: check(input.value, all) };
  hints = showHints && !blank ? suggest(text, { markdown: mode === "plain" }) : [];
  const active = problems.filter((p) => !isRejected(p));
  const out = $("#output");
  out.classList.toggle("is-empty", blank);
  out.classList.toggle("rich-out", mode === "rich" && view === "result");
  if (blank) out.textContent = t().empty;
  else if (view === "marks") out.innerHTML = marked(text, problems, hints);
  else if (mode === "rich") out.innerHTML = fixedHtml();
  else out.textContent = fixedText();

  $("#count").textContent = blank ? "" : t().chars(text.length);
  const summary = $("#summary");
  if (blank) summary.innerHTML = "";
  else {
    const counts = new Map<RuleId, number>();
    for (const p of active) counts.set(p.rule, (counts.get(p.rule) ?? 0) + 1);
    const parts = [];
    if (!problems.length) parts.push(`<span class="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>${t().nothing}</span>`);
    else parts.push(`<strong>${t().problems(active.length)}</strong>`);
    if (rejected.length) parts.push(`<span class="chip chip-off">${t().rejectedCount(rejected.length)}<button type="button" id="restore">${t().restoreAll}</button></span>`);
    if (hints.length) parts.push(`<span class="chip chip-hint">${t().hintsCount(hints.length)}</span>`);
    parts.push(...[...counts].sort((a, b) => b[1] - a[1]).map(([id, n]) => `<span class="chip">${escapeHtml(ruleTitle(id))}<b>${n}</b></span>`));
    summary.innerHTML = parts.join("");
  }
  for (const id of ["#copy", "#download", "#share"]) $<HTMLButtonElement>(id).disabled = blank;
  $<HTMLButtonElement>("#apply").disabled = blank || !active.length;
  saveDraft();
}

// Click a change to turn it down (or back on); click a suggestion to accept it.
$("#output").addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const mark = target.closest<HTMLElement>(".mark");
  if (mark) {
    const span = { start: Number(mark.dataset.start), end: Number(mark.dataset.end) };
    rejected = isRejected(span) ? rejected.filter((r) => r.start !== span.start || r.end !== span.end) : [...rejected, span];
    return render();
  }
  const hint = target.closest<HTMLElement>(".hint");
  if (hint) {
    const h = hints[Number(hint.dataset.hint)];
    if (mode === "rich") return toast(t().hintRich(h.replacement));
    input.value = input.value.slice(0, h.start) + h.replacement + input.value.slice(h.end);
    rejected = [];
    render();
  }
});
$("#summary").addEventListener("click", (e) => {
  if ((e.target as HTMLElement).id === "restore") { rejected = []; render(); }
});

function renderRules() {
  $("#rule-grid").innerHTML = RULES.map((r) => `
    <button type="button" class="rule-card" data-rule="${r.id}" aria-pressed="${isOn(r.id)}">
      <span class="rule-top"><span class="rule-name">${escapeHtml(r.title[lang])}</span><i class="toggle" aria-hidden="true"></i></span>
      <span class="specimen"><s>${escapeHtml(r.example[0]).replace(/\u3000/g, '<mark class="ws">\u3000</mark>')}</s><span>${escapeHtml(r.example[1])}</span></span>
      <code>${r.id}</code>
    </button>`).join("") + `
    <button type="button" class="rule-card rule-hint" data-hints aria-pressed="${showHints}">
      <span class="rule-top"><span class="rule-name">${escapeHtml(t().hintsTitle)}</span><i class="toggle" aria-hidden="true"></i></span>
      <span class="specimen"><s>${escapeHtml(t().hintsBefore)}</s><span>${escapeHtml(t().hintsAfter)}</span></span>
      <code>${escapeHtml(t().hintsNote)}</code>
    </button>`;
}

// The draft is kept between visits, unless it is just the built-in sample (which may have changed).
function saveDraft() {
  const v = value();
  if (mode === "plain" && (v === SAMPLE || v === fix(SAMPLE))) store.set("paiban-draft", "");
  else store.set("paiban-draft", JSON.stringify({ mode, value: v }));
}

function setMode(next: Mode) {
  mode = next;
  input.hidden = mode === "rich";
  rich.hidden = mode === "plain";
  $("#mode").hidden = mode === "plain";
  fileName = fileName.replace(/\.[^.]+$/, mode === "rich" ? ".html" : ".md");
}

function load(content: string, as: Mode = "plain", name?: string) {
  setMode(as);
  rejected = [];
  if (as === "rich") rich.innerHTML = sanitize(content);
  else input.value = content;
  if (name) fileName = name;
  render();
}

// Keep only formatting that matters for text (no styles, classes, scripts or event handlers).
const KEEP = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "DEL", "A", "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI", "BLOCKQUOTE", "CODE", "PRE", "HR", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "IMG", "SUB", "SUP", "MARK"]);
const DROP = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "NOSCRIPT", "TEMPLATE"]);
function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const clean = (node: Element) => {
    for (const child of [...node.children]) {
      clean(child);
      if (DROP.has(child.tagName)) { child.remove(); continue; }
      if (!KEEP.has(child.tagName)) {
        // Unwrap (keep the text), turning div-like blocks into paragraphs.
        const block = /^(DIV|SECTION|ARTICLE|HEADER|FOOTER|MAIN|ASIDE|FIGURE|FIGCAPTION)$/.test(child.tagName);
        const replacement = block ? doc.createElement("p") : doc.createDocumentFragment();
        replacement.append(...child.childNodes);
        child.replaceWith(replacement);
        continue;
      }
      for (const attr of [...child.attributes]) {
        const ok = (child.tagName === "A" && attr.name === "href" && /^(https?:|mailto:|#)/i.test(attr.value))
          || (child.tagName === "IMG" && attr.name === "src" && /^(https?:|data:image\/)/i.test(attr.value))
          || (child.tagName === "IMG" && attr.name === "alt")
          || (/^T[DH]$/.test(child.tagName) && /^(colspan|rowspan)$/.test(attr.name));
        if (!ok) child.removeAttribute(attr.name);
      }
    }
  };
  clean(doc.body);
  // Paragraphs that only wrap other blocks or nothing are noise.
  doc.body.querySelectorAll("p").forEach((p) => {
    if (!p.textContent!.trim() && !p.querySelector("img")) p.remove();
    else if (p.querySelector(":scope > p, :scope > ul, :scope > ol, :scope > h1, :scope > h2, :scope > h3, :scope > table, :scope > blockquote")) p.replaceWith(...p.childNodes);
  });
  return doc.body.innerHTML;
}

const FORMATTED = /<(b|strong|i|em|u|a|h[1-6]|ul|ol|li|blockquote|table|img|code)\b/i;
input.addEventListener("paste", (e) => {
  const html = e.clipboardData?.getData("text/html");
  if (!html || !FORMATTED.test(html)) return;
  e.preventDefault();
  load(html, "rich");
  toast(t().richPasted);
});
rich.addEventListener("paste", (e) => {
  e.preventDefault();
  const html = e.clipboardData?.getData("text/html");
  const text = e.clipboardData?.getData("text/plain") ?? "";
  document.execCommand("insertHTML", false, html ? sanitize(html) : escapeHtml(text).replace(/\n/g, "<br>"));
});
const edited = () => { rejected = []; render(); };
input.addEventListener("input", edited);
rich.addEventListener("input", edited);
$("#to-plain").addEventListener("click", () => {
  const text = checkElement(rich).text.trim();
  load(text, "plain");
});

$("#quotes").addEventListener("change", () => { store.set("paiban-quotes", $<HTMLSelectElement>("#quotes").value); render(); });
$("#rule-grid").addEventListener("click", (e) => {
  const hintCard = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-hints]");
  if (hintCard) {
    showHints = !showHints;
    hintCard.setAttribute("aria-pressed", String(showHints));
    store.set("paiban-hints", showHints ? "on" : "off");
    return render();
  }
  const card = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-rule]");
  if (!card) return;
  const id = card.dataset.rule as RuleId;
  ruleState[id] = !isOn(id);
  card.setAttribute("aria-pressed", String(isOn(id)));
  store.set("paiban-rules", JSON.stringify(ruleState));
  render();
});
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((tab) => tab.addEventListener("click", () => {
  view = tab.dataset.view as typeof view;
  document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-selected", String(x === tab)));
  render();
}));

$("#paste").addEventListener("click", async () => {
  try {
    // Prefer formatted content when the clipboard has it.
    const items = await navigator.clipboard.read().catch(() => null);
    const htmlItem = items?.find((i) => i.types.includes("text/html"));
    if (htmlItem) {
      const html = await (await htmlItem.getType("text/html")).text();
      if (FORMATTED.test(html)) { load(html, "rich"); toast(t().richPasted); return; }
    }
    load(await navigator.clipboard.readText());
  } catch {
    toast(t().pasteDenied);
    input.focus();
  }
});
$("#sample").addEventListener("click", () => load(SAMPLE, "plain", "sample.md"));
$("#clear").addEventListener("click", () => { load(""); input.focus(); });

const readFile = async (file: File) => load(await file.text(), /\.html?$/i.test(file.name) ? "rich" : "plain", file.name);
$<HTMLInputElement>("#file").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
});
const drop = $("#drop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("dragging"); });
drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("dragging");
  const file = e.dataTransfer?.files[0];
  if (file) readFile(file);
});

const applyFix = () => {
  if (isBlank()) return;
  if (mode === "rich") load(fixedHtml(), "rich");
  else load(fixedText());
  toast(t().applied);
};
$("#apply").addEventListener("click", applyFix);
$("#copy").addEventListener("click", async () => {
  if (mode === "rich") {
    // Both flavours, so formatting survives in editors and plain text still works elsewhere.
    const html = fixedHtml();
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([checkElement(doc.body).text.trim()], { type: "text/plain" }),
    })]);
  } else await navigator.clipboard.writeText(fixedText());
  toast(t().copied);
});
$("#download").addEventListener("click", () => {
  const body = mode === "rich"
    ? `<!doctype html>\n<html lang="zh-CN">\n<meta charset="utf-8">\n<body>\n${fixedHtml()}\n</body>\n</html>\n`
    : fixedText();
  const url = URL.createObjectURL(new Blob([body], { type: `${mode === "rich" ? "text/html" : "text/plain"};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
  toast(t().downloaded);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); applyFix(); }
});
if (/Mac|iPhone|iPad/.test(navigator.platform)) $("#mod").textContent = "⌘";

// ---------- Share links ----------
// The text travels in the part of the URL after "#", which browsers never send to a server.
interface Shared { m: Mode; v: string; q?: string; r?: typeof ruleState }

async function pack(data: Shared) {
  const stream = new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unpack(code: string): Promise<Shared> {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text());
}

$("#share").addEventListener("click", async () => {
  const code = await pack({ m: mode, v: value(), q: $<HTMLSelectElement>("#quotes").value, r: ruleState });
  const url = `${location.origin}${location.pathname}#s=${code}`;
  if (url.length > 60000) return toast(t().shareTooLong);
  await navigator.clipboard.writeText(url);
  toast(t().shareCopied);
});

async function loadShared() {
  const code = new URLSearchParams(location.hash.slice(1)).get("s");
  if (!code) return false;
  try {
    const data = await unpack(code);
    if (data.q === "corner" || data.q === "curly") $<HTMLSelectElement>("#quotes").value = data.q;
    if (data.r) Object.assign(ruleState, data.r);
    renderRules();
    load(data.v, data.m === "rich" ? "rich" : "plain");
    toast(t().shareOpened);
  } catch {
    toast(t().shareBroken);
  }
  history.replaceState(null, "", location.pathname + location.search + "#tool");
  return true;
}

// ---------- CSS generator ----------
const form = $<HTMLFormElement>("#css-form");

function cssFor(scope: string) {
  const f = new FormData(form);
  const script = f.get("script") as "sc" | "tc";
  const on = (k: string) => f.has(k);
  return [
    `${scope} {`,
    `  font-family: ${FONTS[script][f.get("face") as "sans" | "serif"]};`,
    `  font-size: ${f.get("size")}px;`,
    `  line-height: ${Number(f.get("leading")).toFixed(2).replace(/0$/, "")};`,
    `  letter-spacing: ${f.get("tracking")}em;`,
    on("justify") && `  text-align: justify;`,
    on("strict") && `  line-break: strict;`,
    on("autospace") && `  text-autospace: normal;`,
    on("trim") && `  text-spacing-trim: normal;`,
    `  overflow-wrap: break-word;`,
    `}`,
    `${scope} p { margin: 0 0 1em;${on("indent") ? " text-indent: 2em;" : ""} }`,
    `${scope} h1, ${scope} h2, ${scope} h3 { line-height: 1.4; letter-spacing: 0; }`,
    on("emphasis") && `${scope} em { font-style: normal; text-emphasis: filled circle; text-emphasis-position: under right; }`,
    ...headingMotion(scope, String(f.get("motion") ?? "none")),
  ].filter(Boolean).join("\n");
}

// Heading animations from the Chinese-style series in the Motion Library; each plays once.
function headingMotion(scope: string, kind: string) {
  const h = `${scope} h1, ${scope} h2, ${scope} h3`;
  const quiet = `@media (prefers-reduced-motion: reduce) { ${h} { animation: none; } }`;
  switch (kind) {
    case "brush": return [
      `${h} { -webkit-mask: linear-gradient(90deg, #000 40%, transparent 60%) 100% 0 / 260% 100% no-repeat; mask: linear-gradient(90deg, #000 40%, transparent 60%) 100% 0 / 260% 100% no-repeat; animation: pb-brush 1.6s cubic-bezier(.5, 0, .3, 1) both; }`,
      `@keyframes pb-brush { to { -webkit-mask-position: 0 0; mask-position: 0 0; } }`, quiet];
    case "stamp": return [
      `${h} { display: inline-block; animation: pb-stamp .7s cubic-bezier(.2, .9, .25, 1.2) both; }`,
      `@keyframes pb-stamp { from { opacity: 0; transform: scale(1.8) rotate(-8deg); } to { opacity: 1; transform: none; } }`, quiet];
    case "ink": return [
      `${h} { animation: pb-ink 1.4s ease-out both; }`,
      `@keyframes pb-ink { from { opacity: 0; filter: blur(10px); letter-spacing: .3em; } to { opacity: 1; filter: none; } }`, quiet];
    case "underline": return [
      `${h} { display: inline-block; padding-bottom: .1em; background: linear-gradient(90deg, #b4232a, #b4232a) 0 100% / 0 .12em no-repeat; animation: pb-underline 1s .2s cubic-bezier(.6, 0, .2, 1) both; }`,
      `@keyframes pb-underline { to { background-size: 100% .12em; } }`, quiet];
    default: return [];
  }
}

function highlightCss(css: string) {
  return escapeHtml(css)
    .replace(/^([^{}\n]+)\{/gm, '<span class="sel">$1</span>{')
    .replace(/([a-z-]+): /g, '<span class="prop">$1</span>: ');
}

let styleEl: HTMLStyleElement | null = null;
function renderCss() {
  const f = new FormData(form);
  (form.elements.namedItem("sizeOut") as HTMLOutputElement).value = `${f.get("size")}px`;
  (form.elements.namedItem("leadingOut") as HTMLOutputElement).value = String(f.get("leading"));
  (form.elements.namedItem("trackingOut") as HTMLOutputElement).value = `${f.get("tracking")}em`;
  const script = f.get("script") as "sc" | "tc";
  const preview = $("#preview");
  preview.lang = script === "sc" ? "zh-CN" : "zh-TW";
  preview.innerHTML = PREVIEW[script];
  styleEl ??= document.head.appendChild(document.createElement("style"));
  styleEl.textContent = cssFor("#preview");
  $("#replay").hidden = f.get("motion") === "none";
  $("#css-code").innerHTML = highlightCss(cssFor(".article"));
}
form.addEventListener("input", renderCss);
// Re-insert the preview so a one-off heading animation plays again.
$("#replay").addEventListener("click", () => { const el = $("#preview"); el.innerHTML = el.innerHTML; });
$("#copy-css").addEventListener("click", async () => {
  await navigator.clipboard.writeText(cssFor(".article"));
  toast(t().copied);
});

// ---------- Language ----------
function renderLang() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = lang === "zh" ? "排版 · 中文排版在线修正工具（中英文空格、全角标点一键修正）" : "Paiban · Fix Chinese typography online";
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    const value = t()[el.dataset.t as keyof typeof DICT.zh];
    if (typeof value === "string") el.textContent = value;
  });
  input.placeholder = t().placeholder;
  $("#lang").textContent = t().langSwitch;
  renderRules();
  render();
}
$("#lang").addEventListener("click", () => {
  lang = lang === "zh" ? "en" : "zh";
  store.set("paiban-lang", lang);
  renderLang();
});

const savedQuotes = store.get("paiban-quotes");
if (savedQuotes === "corner") $<HTMLSelectElement>("#quotes").value = "corner";
// Restore the last draft (or show the sample), then open a shared link if there is one.
try {
  const draft = JSON.parse(store.get("paiban-draft") || "null");
  if (draft?.value) load(draft.value, draft.mode === "rich" ? "rich" : "plain");
  else input.value = SAMPLE;
} catch {
  input.value = SAMPLE;
}
renderLang();
loadShared();
addEventListener("hashchange", loadShared);
renderCss();
