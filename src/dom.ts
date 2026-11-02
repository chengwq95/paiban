import { check, nonOverlapping, shiftSpans, type Issue, type Options } from "./index.js";

// Fixes text inside a DOM tree without touching its markup, so bold, links, headings and lists
// survive. All text nodes are read as one string (with line breaks between blocks), checked, and
// each fix is written back into the text node(s) it falls in.

const BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT", "FIGCAPTION", "FIGURE", "FOOTER",
  "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL",
]);
const CODE = new Set(["CODE", "KBD", "SAMP", "PRE", "VAR", "TT"]);
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "TEMPLATE", "SVG", "MATH"]);

interface Segment {
  node: Text | null; // null: a line break between blocks
  start: number;
  end: number;
  code: boolean;
}

function collect(root: Node) {
  const segments: Segment[] = [];
  const protect: { start: number; end: number }[] = [];
  let text = "";
  const add = (node: Text | null, value: string, code = false) => {
    if (!node && (text === "" || text.endsWith("\n"))) return; // one line break between blocks is enough
    segments.push({ node, start: text.length, end: text.length + value.length, code });
    text += value;
  };
  const walk = (node: Node, inCode: boolean) => {
    if (node.nodeType === 3) {
      const start = text.length;
      add(node as Text, (node as Text).data, inCode);
      if (inCode) protect.push({ start, end: text.length });
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 11 && node.nodeType !== 9) return;
    const el = node as Element;
    const tag = el.tagName?.toUpperCase();
    if (tag && SKIP.has(tag)) return add(null, "\n");
    if (el.getAttribute?.("contenteditable") === "false") return add(null, "\n");
    const block = tag ? BLOCK.has(tag) : false;
    if (block) add(null, "\n");
    for (const child of node.childNodes) walk(child, inCode || (tag ? CODE.has(tag) : false));
    if (block) add(null, "\n");
  };
  walk(root, false);
  return { text, segments, protect };
}

const LATIN = /[\p{Script=Latin}\p{Nd}%]/u;

/** The text under `root` (blocks separated by line breaks) and the problems in it. */
export function checkElement(root: Node, options: Options = {}) {
  const { text, protect } = collect(root);
  return { text, problems: check(text, { ...options, markdown: false, protect }) };
}

/** Fixes every text node under `root` in place. Returns the number of changes made. */
export function fixElement(root: Node, options: Options = {}) {
  let changes = 0;
  let skip = options.skip ?? [];
  for (let pass = 0; pass < 5; pass++) {
    const { text, segments, protect } = collect(root);
    const issues = nonOverlapping(check(text, { ...options, markdown: false, protect, skip }));
    if (!issues.length) break;
    const applied: Issue[] = [];
    for (const issue of [...issues].reverse()) {
      const overlapping = segments.filter((s) => (issue.start === issue.end
        ? s.start <= issue.start && issue.start <= s.end
        : s.start < issue.end && s.end > issue.start));
      if (!overlapping.length || overlapping.some((s) => !s.node)) continue;
      if (issue.start === issue.end) {
        // An inserted space goes to the Chinese side, so it stays outside links and bold text,
        // and never into code.
        const inside = overlapping.find((s) => s.start < issue.start && issue.start < s.end);
        const prev = overlapping.find((s) => s.end === issue.start && s.start < issue.start && !s.code);
        const next = overlapping.find((s) => s.start === issue.start && s.end > issue.start && !s.code);
        const target = inside ?? (prev && next ? (LATIN.test(text[issue.start - 1]) ? next : prev) : prev ?? next);
        if (!target || target.code) continue;
        const at = issue.start - target.start;
        target.node!.data = target.node!.data.slice(0, at) + issue.replacement + target.node!.data.slice(at);
      } else {
        overlapping.forEach((s, i) => {
          const from = Math.max(issue.start, s.start) - s.start;
          const to = Math.min(issue.end, s.end) - s.start;
          s.node!.data = s.node!.data.slice(0, from) + (i === 0 ? issue.replacement : "") + s.node!.data.slice(to);
        });
      }
      applied.unshift(issue);
      changes++;
    }
    skip = shiftSpans(skip, applied);
  }
  return changes;
}

/** Fixes an HTML string, keeping its markup. Browser only (uses DOMParser). */
export function fixHtml(html: string, options: Options = {}) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  fixElement(doc.body, options);
  return doc.body.innerHTML;
}
