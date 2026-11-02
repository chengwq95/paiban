// Parts of a document the rules must not touch: code, URLs, e-mail addresses, HTML tags
// and Markdown link targets. We build a "masked" copy of the text with the same length,
// so offsets in the mask are offsets in the original.
//
// Inline code and URLs become "x" in the mask, so spacing rules treat them like Latin
// text ("使用`npm`安装" -> "使用 `npm` 安装"). Everything else becomes U+E000, which no
// rule matches.

export interface Range {
  start: number;
  end: number;
}

const LATIN_LIKE = "x";
const OPAQUE = "";

const PATTERNS: { re: RegExp; as: string }[] = [
  // Fenced code blocks (``` or ~~~), including an unterminated one at the end.
  { re: /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm, as: OPAQUE },
  // YAML front matter.
  { re: /^---\n[\s\S]*?\n---[ \t]*(?=\n|$(?![\s\S]))/g, as: OPAQUE },
  // HTML comments and tags.
  { re: /<!--[\s\S]*?-->/g, as: OPAQUE },
  { re: /<\/?[A-Za-z][^<>\n]*>/g, as: OPAQUE },
  // Inline code.
  { re: /(`+)[^`\n]+?\1/g, as: LATIN_LIKE },
  // Markdown link / image targets: the "(url "title")" part after "]".
  { re: /(?<=\])\([^()\n]*\)/g, as: OPAQUE },
  // URLs and e-mail addresses.
  { re: /\b(?:https?|ftp):\/\/[^\s<>()\p{Script=Han}　-〿！-～]+/gu, as: LATIN_LIKE },
  { re: /\bwww\.[A-Za-z0-9-]+\.[^\s<>()\p{Script=Han}　-〿！-～]+/gu, as: LATIN_LIKE },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, as: LATIN_LIKE },
];

export interface Masked {
  /** Same length as the input; protected characters replaced. */
  text: string;
  ranges: Range[];
}

// <!-- paiban-disable --> … <!-- paiban-enable --> (or to the end), and <!-- paiban-disable-next-line -->.
const DIRECTIVES = [
  /<!--\s*paiban-disable\s*-->[\s\S]*?(?:<!--\s*paiban-enable\s*-->|(?![\s\S]))/g,
  /<!--\s*paiban-disable-next-line\s*-->[^\n]*\n?[^\n]*/g,
];

export function mask(input: string, { markdown = true } = {}): Masked {
  const out = input.split("");
  const ranges: Range[] = [];
  for (const re of DIRECTIVES) for (const m of input.matchAll(re)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end });
    for (let i = start; i < end; i++) out[i] = input[i] === "\n" ? "\n" : OPAQUE;
  }
  for (const { re, as } of PATTERNS) {
    if (!markdown && as === OPAQUE && re.source.startsWith("^")) continue;
    re.lastIndex = 0;
    for (const m of input.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (ranges.some((r) => start < r.end && end > r.start)) continue;
      ranges.push({ start, end });
      for (let i = start; i < end; i++) out[i] = input[i] === "\n" ? "\n" : as;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  return { text: out.join(""), ranges };
}

/** True when [start, end) overlaps a protected range. */
export function touches(ranges: Range[], start: number, end: number) {
  return ranges.some((r) => start < r.end && end > r.start);
}

/** True when the zero-width position sits strictly inside a protected range. */
export function inside(ranges: Range[], pos: number) {
  return ranges.some((r) => pos > r.start && pos < r.end);
}
