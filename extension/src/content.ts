// Runs in the page on demand: fixes the selection (or the focused field) in place.
import { fixElement } from "../../src/dom";
import { check, fix, type Options } from "../../src/index";

type TextField = HTMLInputElement | HTMLTextAreaElement;

const zh = /^zh/i.test(navigator.language);
const say = {
  fixed: (n: number) => (zh ? `排版：已修正 ${n} 处` : `Paiban: fixed ${n} issue${n === 1 ? "" : "s"}`),
  clean: zh ? "排版：已经排好了，没有需要修改的地方" : "Paiban: nothing to fix",
  copied: zh ? "排版：这里不能编辑，已把修正后的文字复制到剪贴板" : "Paiban: not editable here, so the fixed text was copied",
  nothing: zh ? "排版：请先选中文字，或点进一个输入框" : "Paiban: select some text or click into a text field first",
};

function toast(message: string) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `<style>div{font:500 14px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:10px 16px 10px 12px;border-radius:12px;background:#1b1814;color:#f6f3ec;box-shadow:0 8px 30px rgb(0 0 0/.25);display:flex;gap:10px;align-items:center;animation:in .2s ease-out}b{display:grid;place-items:center;width:22px;height:22px;border-radius:5px;background:#b4232a;color:#fff;font:700 13px serif}@keyframes in{from{opacity:0;transform:translateY(8px)}}</style><div><b>排</b>${message}</div>`;
  document.documentElement.append(host);
  setTimeout(() => host.remove(), 2600);
}

const isTextField = (el: Element | null): el is TextField =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && /^(text|search|url|email|)$/i.test(el.type));

/** The focused element, looking inside shadow roots (many editors use them). */
function focused() {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

function editableRoot(node: Node | null) {
  let el = node instanceof Element ? node : node?.parentElement ?? null;
  let root: HTMLElement | null = null;
  while (el) {
    if (el instanceof HTMLElement && el.isContentEditable) root = el;
    el = el.parentElement;
  }
  return root;
}

function fixField(el: TextField, options: Options, whole: boolean) {
  const hasSelection = el.selectionStart !== el.selectionEnd && !whole;
  const start = hasSelection ? el.selectionStart! : 0;
  const end = hasSelection ? el.selectionEnd! : el.value.length;
  const before = el.value.slice(start, end);
  const after = fix(before, options);
  if (after === before) return toast(say.clean);
  el.focus();
  el.setSelectionRange(start, end);
  // insertText keeps the editor's undo history and notifies frameworks like React.
  if (!document.execCommand("insertText", false, after)) {
    el.setRangeText(after, start, end, "select");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: after }));
  }
  toast(say.fixed(check(before, options).length || 1));
}

function fixRich(root: HTMLElement, selection: Selection, options: Options, whole: boolean) {
  if (whole || selection.isCollapsed) {
    const range = document.createRange();
    range.selectNodeContents(root);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  const range = selection.getRangeAt(0);
  const box = document.createElement("div");
  box.append(range.cloneContents());
  const before = box.innerHTML;
  const changes = fixElement(box, options);
  if (!changes || box.innerHTML === before) return toast(say.clean);
  // insertHTML goes through the editor (undo works, frameworks see the change) and keeps formatting.
  if (!document.execCommand("insertHTML", false, box.innerHTML)) document.execCommand("insertText", false, box.textContent ?? "");
  toast(say.fixed(changes));
}

async function main() {
  const whole = Boolean((globalThis as { __paibanWhole?: boolean }).__paibanWhole);
  const stored = await chrome.storage.sync.get(["quotes", "rules"]).catch(() => ({} as Record<string, unknown>));
  const options: Options = { quotes: stored.quotes === "corner" ? "corner" : "curly", rules: (stored.rules as Options["rules"]) ?? {} };

  const el = focused();
  if (isTextField(el)) return fixField(el, options, whole);

  const selection = getSelection();
  const root = editableRoot(selection?.anchorNode ?? null) ?? (el instanceof HTMLElement && el.isContentEditable ? el : null);
  if (root && selection) return fixRich(root, selection, options, whole);

  const text = selection?.toString() ?? "";
  if (!text.trim()) return toast(say.nothing);
  await navigator.clipboard.writeText(fix(text, options));
  toast(say.copied);
}

main();
