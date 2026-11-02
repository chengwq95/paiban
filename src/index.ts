import { mask } from "./protect.js";
import { RULES, RULE_IDS, type Issue, type Lang, type QuoteStyle, type RuleId } from "./rules.js";

export { RULES, RULE_IDS };
export type { Issue, Lang, QuoteStyle, RuleId };

export interface Options {
  /** Turn individual rules on or off; unspecified rules use their default. */
  rules?: Partial<Record<RuleId, boolean>>;
  /** “curly” (default, mainland style) or 「corner」 quotes. */
  quotes?: QuoteStyle;
  /** Skip fenced code blocks and front matter (default true). */
  markdown?: boolean;
}

export interface Problem extends Issue {
  /** 1-based line and column of `start`. */
  line: number;
  column: number;
  /** The text being replaced ("" for an insertion). */
  original: string;
}

function enabled(options: Options) {
  return RULES.filter((r) => options.rules?.[r.id] ?? r.defaultOn);
}

/** Lists every problem in the text, in order. */
export function check(text: string, options: Options = {}): Problem[] {
  const masked = mask(text, { markdown: options.markdown ?? true });
  const ctx = { masked, quotes: options.quotes ?? "curly" };
  const issues = enabled(options).flatMap((r) => r.check(ctx));
  issues.sort((a, b) => a.start - b.start || a.end - b.end);

  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  return issues.map((issue) => {
    let line = lineStarts.length - 1;
    while (lineStarts[line] > issue.start) line--;
    return { ...issue, line: line + 1, column: issue.start - lineStarts[line] + 1, original: text.slice(issue.start, issue.end) };
  });
}

/** Applies non-overlapping issues; later ones that overlap an earlier one are left for the next pass. */
function apply(text: string, issues: Issue[]) {
  const chosen: Issue[] = [];
  let lastEnd = -1;
  for (const issue of issues) {
    const zeroWidth = issue.start === issue.end;
    if (issue.start < lastEnd || (zeroWidth && issue.start === lastEnd && chosen.at(-1)?.start === issue.start)) continue;
    chosen.push(issue);
    lastEnd = Math.max(issue.end, issue.start);
  }
  let out = text;
  for (const issue of chosen.reverse()) out = out.slice(0, issue.start) + issue.replacement + out.slice(issue.end);
  return out;
}

/** Returns the text with every fixable problem corrected. */
export function fix(text: string, options: Options = {}) {
  let out = text;
  // Fixes can enable each other (e.g. "中文,English" -> "中文，English"), so repeat until stable.
  for (let pass = 0; pass < 5; pass++) {
    const issues = check(out, options);
    if (!issues.length) break;
    out = apply(out, issues);
  }
  return out;
}
