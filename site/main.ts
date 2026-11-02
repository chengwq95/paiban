import { checkElement, fixElement } from "../src/dom";
import { check, fix, RULES, type Options, type Problem, type RuleId } from "../src/index";

type Lang = "zh" | "en";

const DICT = {
  zh: {
    brand: "排版",
    navTool: "在线修正", navRules: "规则", navExt: "浏览器插件", navCss: "网页排版", navDev: "开发者",
    extTitle: "在任何网页里，选中就能修正",
    extLead: "公众号后台、知乎、Notion、邮件、各种 CMS 编辑器……选中文字，右键一下就排好，粗体和链接都会保留。",
    extDemoBefore: "用iphone读唐诗,很方便!", extDemoAfter: "用 iPhone 读唐诗，很方便！",
    extMenuCopy: "复制", extMenuPaste: "粘贴", extMenuFix: "排版：修正选中的文字",
    extStep1: "下载并解压", extStep1d: "下载下面的压缩包，解压成一个文件夹。",
    extStep2: "在浏览器里载入", extStep2d: "打开 chrome://extensions（Edge 是 edge://extensions），开启右上角「开发者模式」，点「加载已解压的扩展程序」，选择刚才的文件夹。",
    extStep3: "选中文字，右键修正", extStep3d: "或按 Alt+Shift+F。没有选中文字时，会修正整个输入框；按 Ctrl+Z 可以撤销。",
    extDownload: "下载浏览器插件", extNote: "适用于 Chrome、Edge、Arc、Brave 等 Chromium 浏览器。插件只在你点它的那一刻读取当前网页，不收集任何数据。",
    eyebrow: "免安装 · 打开网页就能用",
    heroTitle: "贴上文字，一键排好。",
    heroLead: "自动补上中英文之间的空格，统一全角标点、引号、省略号和破折号。代码和链接原样保留。",
    step1: "粘贴文字，格式也能保留", step2: "看清每一处修改", step3: "复制排好的结果",
    paste: "粘贴", upload: "上传文件", sample: "示例", clear: "清空",
    viewMarks: "标注修改", viewResult: "修正结果",
    input: "原文", output: "结果", legendDel: "删除", legendIns: "加入",
    dropHint: "放开即可读取文件",
    placeholder: "在这里粘贴文章、Markdown 或任何中文文字……",
    empty: "修正后的文字会显示在这里。",
    chars: (n: number) => `${n.toLocaleString()} 字`,
    download: "下载", apply: "替换原文", copyResult: "复制结果",
    copied: "已复制到剪贴板", applied: "已替换原文", downloaded: "已下载",
    pasteDenied: "浏览器不允许读取剪贴板，请直接在左边按 Ctrl+V 粘贴",
    richMode: "富文本 · 保留格式", toPlain: "改为纯文本",
    richPasted: "已保留粗体、链接、标题等格式",
    share: "分享链接", shareCopied: "链接已复制。文字放在链接里，不经过任何服务器",
    shareTooLong: "文字太长，无法放进链接，请改用下载", shareOpened: "已打开分享的文字", shareBroken: "这个分享链接不完整，无法打开",
    nothing: "已经排好了，没有需要修改的地方",
    problems: (n: number) => `${n} 处修改`,
    privacy: "所有处理都在你的浏览器里完成，文字不会上传到任何地方。",
    rulesTitle: "十一条规则，照着通行的中文排版习惯",
    rulesLead: "默认开启十条。点卡片可以开关，修改会马上反映在上面的结果里。",
    quoteStyle: "引号样式", quoteCurly: "弯引号 “ ”（中国大陆）", quoteCorner: "直角引号 「 」（台湾、香港）",
    cssTitle: "网页排版 CSS",
    cssLead: "字体、行高、标点挤压和避头尾，是中文网页最常被忽略的细节。调好后复制即可使用。",
    script: "文字", scriptSc: "简体中文", scriptTc: "繁体中文",
    face: "字体", faceSans: "黑体", faceSerif: "宋体",
    size: "字号", leading: "行高", tracking: "字距",
    justify: "两端对齐", autospace: "中英文自动间距", trim: "标点挤压",
    strict: "严格避头尾", emphasis: "着重号代替斜体", indent: "段首缩进两字",
    copy: "复制",
    langNote: "记得在 <html> 写上 lang=\"zh-CN\" 或 lang=\"zh-TW\"。浏览器依据它选择字形，写错时简体字可能显示成繁体或日文字形。",
    devTitle: "也可以放进你的工作流",
    devLead: "同一套规则提供命令行、JavaScript 函数和 CI 检查，团队文档可以自动保持一致。",
    devCli: "命令行", cCheck: "# 检查", cFix: "# 直接修正", cRules: "# 查看规则",
    langSwitch: "EN",
  },
  en: {
    brand: "Paiban",
    navTool: "Fix text", navRules: "Rules", navExt: "Extension", navCss: "Web CSS", navDev: "Developers",
    extTitle: "Fix text right where you write it",
    extLead: "Blog dashboards, Notion, e-mail, any CMS editor… select text, right-click, done. Bold and links are kept.",
    extDemoBefore: "用iphone读唐诗,很方便!", extDemoAfter: "用 iPhone 读唐诗，很方便！",
    extMenuCopy: "Copy", extMenuPaste: "Paste", extMenuFix: "Paiban: fix selected text",
    extStep1: "Download and unzip", extStep1d: "Download the zip below and unzip it into a folder.",
    extStep2: "Load it in your browser", extStep2d: "Open chrome://extensions (edge://extensions in Edge), turn on Developer mode, click “Load unpacked” and pick the folder.",
    extStep3: "Select text and right-click", extStep3d: "Or press Alt+Shift+F. With nothing selected it fixes the whole field; Ctrl+Z undoes it.",
    extDownload: "Download the extension", extNote: "Works in Chrome, Edge, Arc, Brave and other Chromium browsers. It only reads the page at the moment you use it and collects no data.",
    eyebrow: "Nothing to install · works in your browser",
    heroTitle: "Paste. Fix. Copy.",
    heroLead: "Adds the spaces between Chinese and Latin text and fixes full-width punctuation, quotes, ellipses and dashes. Code and links stay untouched.",
    step1: "Paste text, formatting and all", step2: "Review every change", step3: "Copy the result",
    paste: "Paste", upload: "Upload", sample: "Sample", clear: "Clear",
    viewMarks: "Changes", viewResult: "Result",
    input: "Original", output: "Fixed", legendDel: "removed", legendIns: "added",
    dropHint: "Drop to open the file",
    placeholder: "Paste an article, Markdown or any Chinese text here…",
    empty: "The fixed text will appear here.",
    chars: (n: number) => `${n.toLocaleString()} chars`,
    download: "Download", apply: "Replace original", copyResult: "Copy result",
    copied: "Copied to clipboard", applied: "Original replaced", downloaded: "Downloaded",
    pasteDenied: "Clipboard access was blocked. Paste with Ctrl+V on the left instead.",
    richMode: "Rich text · formatting kept", toPlain: "Use plain text",
    richPasted: "Bold, links, headings and other formatting kept",
    share: "Share link", shareCopied: "Link copied. The text lives in the link and never touches a server",
    shareTooLong: "Too long to fit in a link. Download it instead", shareOpened: "Opened the shared text", shareBroken: "This share link is incomplete and can't be opened",
    nothing: "Already perfect: nothing to change",
    problems: (n: number) => `${n} change${n === 1 ? "" : "s"}`,
    privacy: "Everything runs in your browser. Your text is never uploaded.",
    rulesTitle: "Eleven rules from common Chinese style guides",
    rulesLead: "Ten are on by default. Click a card to toggle it; the result above updates immediately.",
    quoteStyle: "Quote style", quoteCurly: "Curly “ ” (mainland China)", quoteCorner: "Corner 「 」 (Taiwan, Hong Kong)",
    cssTitle: "Web typography CSS",
    cssLead: "Fonts, line height, punctuation trimming and line breaking are the details Chinese web pages most often miss. Tune them and copy the CSS.",
    script: "Script", scriptSc: "Simplified", scriptTc: "Traditional",
    face: "Typeface", faceSans: "Hei (sans)", faceSerif: "Song (serif)",
    size: "Size", leading: "Line height", tracking: "Tracking",
    justify: "Justify", autospace: "Auto CJK–Latin spacing", trim: "Punctuation trimming",
    strict: "Strict line breaking", emphasis: "Emphasis dots, not italics", indent: "Two-character indent",
    copy: "Copy",
    langNote: "Set lang=\"zh-CN\" or lang=\"zh-TW\" on <html>. Browsers choose glyphs from it; get it wrong and Simplified text can render with Traditional or Japanese glyph shapes.",
    devTitle: "Bring it into your workflow",
    devLead: "The same rules ship as a command-line tool, a JavaScript function and a CI check, so team docs stay consistent.",
    devCli: "Command line", cCheck: "# check", cFix: "# fix in place", cRules: "# list rules",
    langSwitch: "中文",
  },
};

const SAMPLE = `# 静夜思:一首读了1300年的乡愁

李白(字太白)写下《静夜思》时,大约26岁.全诗只有20个字,却被译成English、French等30多种语言...

> 床前明月光,疑是地上霜.
> 举头望明月,低头思故乡.

很多人第一次读到它,是在小学2年级--那时还不懂什么叫"乡愁"。如今打开App就能听到朗读,问AI也能背出全诗,但那份思念从未改变!

\`\`\`text
代码块不会被修改:床前明月光,疑是地上霜.
\`\`\`
`;

const PREVIEW = {
  sc: `<h3>静夜思</h3><p>床前明月光，疑是地上霜。举头望明月，低头思故乡。</p><p>这首诗只有 20 个字，却流传了 1300 多年。李白写下它时<em>大约 26 岁</em>，身在异乡，望著月亮想起了故乡。</p><p>“好的诗不需要解释，”老师说，“读出声来就够了。”</p>`,
  tc: `<h3>靜夜思</h3><p>床前明月光，疑是地上霜。舉頭望明月，低頭思故鄉。</p><p>這首詩只有 20 個字，卻流傳了 1300 多年。李白寫下它時<em>大約 26 歲</em>，身在異鄉，望著月亮想起了故鄉。</p><p>「好的詩不需要解釋，」老師說，「讀出聲來就夠了。」</p>`,
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
const options = (): Options => ({ rules: ruleState, quotes: $<HTMLSelectElement>("#quotes").value as Options["quotes"] });
const isOn = (id: RuleId) => ruleState[id] ?? RULES.find((r) => r.id === id)!.defaultOn;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ruleTitle = (id: RuleId) => RULES.find((r) => r.id === id)!.title[lang];

function marked(text: string, problems: Problem[]) {
  let html = "";
  let pos = 0;
  for (const p of problems) {
    if (p.start < pos) continue;
    html += escapeHtml(text.slice(pos, p.start));
    const title = escapeHtml(ruleTitle(p.rule));
    const del = p.original ? `<del>${escapeHtml(p.original.replace(/ /g, " "))}</del>` : "";
    const ins = p.replacement === " " ? `<ins class="space"> </ins>` : p.replacement ? `<ins>${escapeHtml(p.replacement)}</ins>` : "";
    html += `<span class="mark" data-tip="${title}">${del}${ins}</span>`;
    pos = p.end;
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
  const { text, problems } = mode === "rich"
    ? checkElement(rich, options())
    : { text: input.value, problems: check(input.value, options()) };
  const out = $("#output");
  out.classList.toggle("is-empty", blank);
  out.classList.toggle("rich-out", mode === "rich" && view === "result");
  if (blank) out.textContent = t().empty;
  else if (view === "marks") out.innerHTML = marked(text, problems);
  else if (mode === "rich") out.innerHTML = fixedHtml();
  else out.textContent = fixedText();

  $("#count").textContent = blank ? "" : t().chars(text.length);
  const summary = $("#summary");
  if (blank) summary.innerHTML = "";
  else if (!problems.length) summary.innerHTML = `<span class="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>${t().nothing}</span>`;
  else {
    const counts = new Map<RuleId, number>();
    for (const p of problems) counts.set(p.rule, (counts.get(p.rule) ?? 0) + 1);
    summary.innerHTML = `<strong>${t().problems(problems.length)}</strong>` +
      [...counts].sort((a, b) => b[1] - a[1]).map(([id, n]) => `<span class="chip">${escapeHtml(ruleTitle(id))}<b>${n}</b></span>`).join("");
  }
  for (const id of ["#copy", "#download", "#share"]) $<HTMLButtonElement>(id).disabled = blank;
  $<HTMLButtonElement>("#apply").disabled = blank || !problems.length;
  saveDraft();
}

function renderRules() {
  $("#rule-grid").innerHTML = RULES.map((r) => `
    <button type="button" class="rule-card" data-rule="${r.id}" aria-pressed="${isOn(r.id)}">
      <span class="rule-top"><span class="rule-name">${escapeHtml(r.title[lang])}</span><i class="toggle" aria-hidden="true"></i></span>
      <span class="specimen"><s>${escapeHtml(r.example[0]).replace(/\u3000/g, '<mark class="ws">\u3000</mark>')}</s><span>${escapeHtml(r.example[1])}</span></span>
      <code>${r.id}</code>
    </button>`).join("");
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
input.addEventListener("input", render);
rich.addEventListener("input", render);
$("#to-plain").addEventListener("click", () => {
  const text = checkElement(rich).text.trim();
  load(text, "plain");
});

$("#quotes").addEventListener("change", () => { store.set("paiban-quotes", $<HTMLSelectElement>("#quotes").value); render(); });
$("#rule-grid").addEventListener("click", (e) => {
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
  ].filter(Boolean).join("\n");
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
  $("#css-code").innerHTML = highlightCss(cssFor(".article"));
}
form.addEventListener("input", renderCss);
$("#copy-css").addEventListener("click", async () => {
  await navigator.clipboard.writeText(cssFor(".article"));
  toast(t().copied);
});

// ---------- Language ----------
function renderLang() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = lang === "zh" ? "排版 · 中文排版在线修正" : "Paiban · Fix Chinese typography online";
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
