// The toolbar popup: paste text for a quick fix, and choose the options the page fixer uses.
import { check, fix, RULES, type Options, type RuleId } from "../../src/index";

const zh = /^zh/i.test(navigator.language);
const T = zh
  ? { title: "排版", site: "打开网站 ↗", how: "在网页编辑器里选中文字，按右键选「排版：修正选中的文字」，或按 <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>。也可以把文字贴在下面：", copy: "复制修正结果", copied: "已复制 ✓", settings: "规则设置", quotes: "引号样式", changes: (n: number) => (n ? `${n} 处修改` : "没有需要修改的地方"), placeholder: "粘贴文字……" }
  : { title: "Paiban", site: "Open website ↗", how: "Select text in any web editor, right-click and choose “Paiban: fix selected text”, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>. Or paste text below:", copy: "Copy fixed text", copied: "Copied ✓", settings: "Rules", quotes: "Quote style", changes: (n: number) => (n ? `${n} change${n === 1 ? "" : "s"}` : "Nothing to fix"), placeholder: "Paste text…" };

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
document.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => { el.innerHTML = String(T[el.dataset.i as keyof typeof T]); });

const text = $<HTMLTextAreaElement>("text");
const quotes = $<HTMLSelectElement>("quotes");
text.placeholder = T.placeholder;
let rules: Partial<Record<RuleId, boolean>> = {};

const options = (): Options => ({ quotes: quotes.value as Options["quotes"], rules });
function update() {
  const blank = !text.value.trim();
  $("count").textContent = blank ? "" : T.changes(check(text.value, options()).length);
  $<HTMLButtonElement>("copy").disabled = blank;
}

function renderRules() {
  $("rules").innerHTML = RULES.map((r) => `<label><input type="checkbox" data-rule="${r.id}" ${(rules[r.id] ?? r.defaultOn) ? "checked" : ""}> ${r.title[zh ? "zh" : "en"]}</label>`).join("");
}

chrome.storage.sync.get(["quotes", "rules"]).then((s) => {
  if (s.quotes === "corner") quotes.value = "corner";
  rules = (s.rules as typeof rules) ?? {};
  renderRules();
});

text.addEventListener("input", update);
quotes.addEventListener("change", () => { chrome.storage.sync.set({ quotes: quotes.value }); update(); });
$("rules").addEventListener("change", (e) => {
  const box = e.target as HTMLInputElement;
  rules = { ...rules, [box.dataset.rule!]: box.checked };
  chrome.storage.sync.set({ rules });
  update();
});
$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(fix(text.value, options()));
  $("copy").textContent = T.copied;
  setTimeout(() => ($("copy").textContent = T.copy), 1400);
});
update();
text.focus();
