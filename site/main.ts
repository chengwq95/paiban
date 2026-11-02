import { check, fix, RULES, type Options, type Problem, type RuleId } from "../src/index";

type Lang = "zh" | "en";

const DICT = {
  zh: {
    brand: "中文排版助手",
    navChecker: "检查", navCss: "网页排版", navUse: "使用方式",
    heroTitle: "让中文排版，一眼就舒服。",
    heroLead: "自动补上中英文之间的空格，统一全角标点、引号、省略号和破折号；会跳过代码和链接。也可以生成适合中文阅读的网页 CSS。",
    before: "修正前", after: "修正后",
    checkerTitle: "在线检查",
    checkerLead: "贴上文章或 Markdown，右边会标出每一处问题。文字只在你的浏览器里处理，不会上传。",
    input: "原文", sample: "示例", clear: "清空",
    viewMarks: "标注", viewResult: "修正结果", copy: "复制", copied: "已复制",
    apply: "一键修正", applied: "已修正",
    settings: "规则设置", quoteStyle: "引号样式", quoteCurly: "弯引号 “ ”（大陆）", quoteCorner: "直角引号 「 」（台湾、香港）",
    none: "没有发现问题 ✓", empty: "在左边输入文字……",
    problems: (n: number) => `${n} 处问题`,
    cssTitle: "网页排版 CSS",
    cssLead: "中文网页最常见的问题是字体、行高和标点。调好下面的选项，复制 CSS 就能用。",
    script: "文字", scriptSc: "简体中文", scriptTc: "繁体中文",
    face: "字体", faceSans: "黑体（无衬线）", faceSerif: "宋体（衬线）",
    size: "字号", leading: "行高", tracking: "字距",
    justify: "两端对齐", autospace: "自动留出中英文间距（text-autospace）", trim: "标点挤压（text-spacing-trim）",
    strict: "严格避头尾：标点不出现在行首（line-break）", emphasis: "强调用着重号代替斜体", indent: "段首缩进两个字",
    langNote: "记得在 <html> 上写好语言，例如 lang=\"zh-CN\" 或 lang=\"zh-TW\"。浏览器会依据它选择字形，写错时简体页面可能显示成繁体或日文的字形。",
    useTitle: "在项目里使用",
    useLead: "同一套规则也可以在命令行、代码和 CI 里运行。",
    useCli: "命令行", useJs: "JavaScript / TypeScript", useCi: "持续集成",
    cCheck: "# 检查", cFix: "# 直接修正", cRules: "# 查看规则",
    langSwitch: "English",
  },
  en: {
    brand: "paiban",
    navChecker: "Checker", navCss: "Web CSS", navUse: "Usage",
    heroTitle: "Chinese typography, done right.",
    heroLead: "Adds the spaces between Chinese and Latin text, and fixes full-width punctuation, quotes, ellipses and dashes, while leaving code and links alone. It also generates CSS for comfortable Chinese reading on the web.",
    before: "Before", after: "After",
    checkerTitle: "Online checker",
    checkerLead: "Paste an article or Markdown and every problem is marked on the right. Text is processed in your browser and never uploaded.",
    input: "Text", sample: "Sample", clear: "Clear",
    viewMarks: "Marked", viewResult: "Fixed", copy: "Copy", copied: "Copied",
    apply: "Fix all", applied: "Fixed",
    settings: "Rules", quoteStyle: "Quote style", quoteCurly: "Curly “ ” (mainland)", quoteCorner: "Corner 「 」 (Taiwan, Hong Kong)",
    none: "No problems found ✓", empty: "Type or paste on the left…",
    problems: (n: number) => `${n} problem${n === 1 ? "" : "s"}`,
    cssTitle: "Web typography CSS",
    cssLead: "Fonts, line height and punctuation are where Chinese web pages usually go wrong. Tune the options and copy the CSS.",
    script: "Script", scriptSc: "Simplified", scriptTc: "Traditional",
    face: "Typeface", faceSans: "Hei (sans-serif)", faceSerif: "Song (serif)",
    size: "Size", leading: "Line height", tracking: "Tracking",
    justify: "Justify", autospace: "Auto spacing between Chinese and Latin (text-autospace)", trim: "Punctuation trimming (text-spacing-trim)",
    strict: "Strict line breaking: no punctuation at line start (line-break)", emphasis: "Emphasis dots instead of italics", indent: "Indent paragraphs by two characters",
    langNote: "Set the page language on <html>, e.g. lang=\"zh-CN\" or lang=\"zh-TW\". Browsers pick glyphs from it; get it wrong and Simplified text can render with Traditional or Japanese glyph shapes.",
    useTitle: "Use it in your project",
    useLead: "The same rules run on the command line, in code and in CI.",
    useCli: "Command line", useJs: "JavaScript / TypeScript", useCi: "Continuous integration",
    cCheck: "# check", cFix: "# fix in place", cRules: "# list rules",
    langSwitch: "中文",
  },
};

const SAMPLE = `# 第1章:快速开始

本教程介绍如何在macOS上安装Node.js(v20以上)。整个过程大概需要5分钟...

1. 打开终端,运行\`npm install paiban\`
2. 访问https://nodejs.org下载安装包
3. 价格:1,000元,首月折扣10%!

> 他说:"这个工具真好用"--我也这么觉得。

\`\`\`js
console.log("代码块里的内容不会被修改,放心");
\`\`\`
`;

const PREVIEW = {
  sc: `<h3>排版的细节</h3><p>好的中文排版，读起来几乎感觉不到它的存在。我们在 2024 年重新设计了文档，统一了标点、引号和中英文间距，阅读速度提升了 <em>将近两成</em>。</p><p>“排版不是装饰，”她说，“而是让文字更容易被理解。”就算只是一篇 README，也值得认真对待。</p>`,
  tc: `<h3>排版的細節</h3><p>好的中文排版，讀起來幾乎感覺不到它的存在。我們在 2024 年重新設計了文件，統一了標點、引號和中英文間距，閱讀速度提升了 <em>將近兩成</em>。</p><p>「排版不是裝飾，」她說，「而是讓文字更容易被理解。」就算只是一篇 README，也值得認真對待。</p>`,
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

let lang: Lang = document.documentElement.lang === "en" ? "en" : "zh";
const t = () => DICT[lang];

// ---------- State ----------
const ruleState: Partial<Record<RuleId, boolean>> = {};
let view: "marks" | "result" = "marks";
const options = (): Options => ({ rules: ruleState, quotes: $<HTMLSelectElement>("#quotes").value as Options["quotes"] });

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const ruleTitle = (id: RuleId) => RULES.find((r) => r.id === id)!.title[lang];

function marked(text: string, problems: Problem[]) {
  let html = "";
  let pos = 0;
  for (const p of problems) {
    if (p.start < pos) continue;
    html += escapeHtml(text.slice(pos, p.start));
    const title = escapeHtml(ruleTitle(p.rule));
    const ins = p.replacement === " " ? `<ins class="space" title="${title}"> </ins>` : `<ins title="${title}">${escapeHtml(p.replacement)}</ins>`;
    html += (p.original ? `<del title="${title}">${escapeHtml(p.original.replace(/ /g, " "))}</del>` : "") + ins;
    pos = p.end;
  }
  return html + escapeHtml(text.slice(pos));
}

// ---------- Checker ----------
const input = $<HTMLTextAreaElement>("#input");

function renderChecker() {
  const text = input.value;
  const problems = check(text, options());
  const out = $("#output");
  if (!text.trim()) out.innerHTML = `<span class="muted">${t().empty}</span>`;
  else out.innerHTML = view === "marks" ? marked(text, problems) : escapeHtml(fix(text, options()));

  const summary = $("#summary");
  if (!text.trim()) summary.innerHTML = "";
  else if (!problems.length) summary.innerHTML = `<span class="ok">${t().none}</span>`;
  else {
    const counts = new Map<RuleId, number>();
    for (const p of problems) counts.set(p.rule, (counts.get(p.rule) ?? 0) + 1);
    summary.innerHTML = `<strong>${t().problems(problems.length)}</strong>` +
      [...counts].map(([id, n]) => `<span class="chip">${escapeHtml(ruleTitle(id))} <b>${n}</b></span>`).join("");
  }
  $<HTMLButtonElement>("#apply").disabled = !problems.length;
  try { localStorage.setItem("paiban-text", text); } catch { /* storage unavailable */ }
}

function renderRules() {
  $("#rules").innerHTML = RULES.map((r) => `
    <label class="rule">
      <input type="checkbox" data-rule="${r.id}" ${ruleState[r.id] ?? r.defaultOn ? "checked" : ""}>
      <span><b>${escapeHtml(r.title[lang])}</b><small>${escapeHtml(r.example[0])} → ${escapeHtml(r.example[1])}</small></span>
    </label>`).join("");
}

function flash(button: HTMLButtonElement, label: string) {
  const original = button.textContent;
  button.textContent = label;
  setTimeout(() => (button.textContent = original), 1200);
}

input.addEventListener("input", renderChecker);
$("#quotes").addEventListener("change", renderChecker);
$("#rules").addEventListener("change", (e) => {
  const box = e.target as HTMLInputElement;
  ruleState[box.dataset.rule as RuleId] = box.checked;
  renderChecker();
});
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((tab) => tab.addEventListener("click", () => {
  view = tab.dataset.view as typeof view;
  document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-selected", String(x === tab)));
  renderChecker();
}));
$("#sample").addEventListener("click", () => { input.value = SAMPLE; renderChecker(); });
$("#clear").addEventListener("click", () => { input.value = ""; renderChecker(); input.focus(); });
$<HTMLButtonElement>("#apply").addEventListener("click", (e) => {
  input.value = fix(input.value, options());
  renderChecker();
  flash(e.currentTarget as HTMLButtonElement, t().applied);
});
$<HTMLButtonElement>("#copy").addEventListener("click", async (e) => {
  await navigator.clipboard.writeText(fix(input.value, options()));
  flash(e.currentTarget as HTMLButtonElement, t().copied);
});

// ---------- CSS generator ----------
const form = $<HTMLFormElement>("#css-form");

function cssFor(scope: string) {
  const f = new FormData(form);
  const script = f.get("script") as "sc" | "tc";
  const on = (k: string) => f.has(k);
  const lines = [
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
  ];
  return lines.filter(Boolean).join("\n");
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
  $("#css-code").textContent = cssFor(".article");
}
form.addEventListener("input", renderCss);
$<HTMLButtonElement>("#copy-css").addEventListener("click", async (e) => {
  await navigator.clipboard.writeText(cssFor(".article"));
  flash(e.currentTarget as HTMLButtonElement, t().copied);
});

// ---------- Language ----------
function renderLang() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = lang === "zh" ? "中文排版助手 paiban" : "paiban — Chinese typography checker";
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    const value = t()[el.dataset.t as keyof typeof DICT.zh];
    if (typeof value === "string") el.textContent = value;
  });
  $("#lang").textContent = t().langSwitch;
  renderRules();
  renderChecker();
}
$("#lang").addEventListener("click", () => {
  lang = lang === "zh" ? "en" : "zh";
  try { localStorage.setItem("paiban-lang", lang); } catch { /* storage unavailable */ }
  renderLang();
});

// ---------- Hero demo ----------
const DEMO = "我用Mac写代码,效率提高了30%!他说:\"这就是好工具\"...";
$("#demo-before").textContent = DEMO;
$("#demo-after").textContent = fix(DEMO);

let saved: string | null = null;
try { saved = localStorage.getItem("paiban-text"); } catch { /* storage unavailable */ }
input.value = saved ?? SAMPLE;
renderLang();
renderCss();
