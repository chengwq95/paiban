import { inside, touches, type Masked } from "./protect.js";

export type Lang = "zh" | "en";
export type QuoteStyle = "curly" | "corner";

export interface Issue {
  rule: RuleId;
  /** UTF-16 offsets into the original text; start === end means "insert". */
  start: number;
  end: number;
  replacement: string;
}

interface Context {
  masked: Masked;
  quotes: QuoteStyle;
}

interface Rule {
  id: RuleId;
  defaultOn: boolean;
  title: Record<Lang, string>;
  /** One-line example: before -> after. */
  example: [string, string];
  check: (ctx: Context) => Issue[];
}

export const RULE_IDS = [
  "space-between",
  "fullwidth-punct",
  "no-space-around-punct",
  "fullwidth-parens",
  "ellipsis",
  "dash",
  "quotes",
  "halfwidth-alnum",
  "repeated-punct",
] as const;
export type RuleId = (typeof RULE_IDS)[number];

const HAN = String.raw`\p{Script=Han}〇`;
// Latin letters and digits, plus "x", which stands in for inline code and URLs in the mask.
const LATIN = String.raw`\p{Script=Latin}\p{Script=Greek}\p{Nd}`;
const FULL_CLOSE = "，。！？；：、）」』】》〉";
const FULL_OPEN = "（「『【《〈";

/** Runs a regex over the masked text, skipping matches that touch protected text. */
function replaceAll(id: RuleId, re: RegExp, replace: (m: RegExpMatchArray) => string | null) {
  return ({ masked }: Context): Issue[] => {
    const issues: Issue[] = [];
    for (const m of masked.text.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (touches(masked.ranges, start, end)) continue;
      const replacement = replace(m);
      if (replacement === null || replacement === m[0]) continue;
      issues.push({ rule: id, start, end, replacement });
    }
    return issues;
  };
}

const PUNCT_MAP: Record<string, string> = { ",": "，", "!": "！", "?": "？", ";": "；", ":": "：", ".": "。" };

export const RULES: Rule[] = [
  {
    id: "space-between",
    defaultOn: true,
    title: { zh: "中文与英文、数字之间加空格", en: "Space between Chinese and Latin text or digits" },
    example: ["使用GitHub托管了3个项目", "使用 GitHub 托管了 3 个项目"],
    check: ({ masked }) => {
      const re = new RegExp(`(?<=[${HAN}])(?=[${LATIN}$])|(?<=[${LATIN}%]|[${LATIN}][+#]+)(?=[${HAN}])`, "gu");
      const issues: Issue[] = [];
      for (const m of masked.text.matchAll(re)) {
        if (inside(masked.ranges, m.index!)) continue;
        issues.push({ rule: "space-between", start: m.index!, end: m.index!, replacement: " " });
      }
      return issues;
    },
  },
  {
    id: "fullwidth-punct",
    defaultOn: true,
    title: { zh: "中文句子使用全角标点", en: "Full-width punctuation in Chinese sentences" },
    example: ["你好,世界!", "你好，世界！"],
    check: (ctx) => [
      ...replaceAll("fullwidth-punct", new RegExp(`(?<=[${HAN}${FULL_CLOSE}])[ \\t]*([,!?;:]+)[ \\t]*|(?<=[${LATIN}%])[ \\t]*([,!?;:]+)[ \\t]*(?=[${HAN}])`, "gu"),
        (m) => [...(m[1] ?? m[2])].map((c) => PUNCT_MAP[c]).join(""))(ctx),
      // A full stop only at the end of a sentence, so "文件.txt" is left alone.
      ...replaceAll("fullwidth-punct", new RegExp(`(?<=[${HAN}])[ \\t]*\\.(?!\\.)(?=[ \\t]*(?:$|[${HAN}]))`, "gmu"),
        () => "。")(ctx),
    ],
  },
  {
    id: "no-space-around-punct",
    defaultOn: true,
    title: { zh: "全角标点前后不加空格", en: "No spaces around full-width punctuation" },
    example: ["你好 ， 世界 。", "你好，世界。"],
    // Only between words and punctuation, so Markdown table pipes and English after 「」 keep their spaces.
    check: replaceAll("no-space-around-punct", new RegExp([
      `(?<=[${HAN}${LATIN}${FULL_CLOSE}${FULL_OPEN}”’])[ \\t]+(?=[${FULL_CLOSE}])`,
      `(?<=[，。！？；：、${FULL_OPEN}])[ \\t]+(?=[${HAN}${LATIN}${FULL_OPEN}“‘])`,
      `(?<=[）」』】》〉])[ \\t]+(?=[${HAN}${FULL_OPEN}])`,
    ].join("|"), "gu"), () => ""),
  },
  {
    id: "fullwidth-parens",
    defaultOn: true,
    title: { zh: "括号内有中文时使用全角括号", en: "Full-width parentheses around Chinese text" },
    example: ["开源(免费)软件", "开源（免费）软件"],
    check: replaceAll("fullwidth-parens", new RegExp(`[ \\t]*\\(([^()\\n]*[${HAN}][^()\\n]*)\\)[ \\t]*`, "gu"), (m) => `（${m[1].trim()}）`),
  },
  {
    id: "ellipsis",
    defaultOn: true,
    title: { zh: "省略号使用「……」", en: "Use “……” for ellipses" },
    example: ["然后...", "然后……"],
    check: replaceAll("ellipsis", new RegExp(`(?<=[${HAN}${FULL_CLOSE}”’])[ \\t]*(?:\\.{3,}|。{3,}|…+)`, "gu"), () => "……"),
  },
  {
    id: "dash",
    defaultOn: true,
    title: { zh: "破折号使用「——」", en: "Use “——” for dashes" },
    example: ["这个问题--其实很简单", "这个问题——其实很简单"],
    check: replaceAll("dash", new RegExp(`(?<=[${HAN}${FULL_CLOSE}”’])[ \\t]*(?:-{2,}|[—―]+)[ \\t]*(?=[${HAN}${FULL_OPEN}“‘])`, "gu"), () => "——"),
  },
  {
    id: "quotes",
    defaultOn: true,
    title: { zh: "中文引号", en: "Chinese quotation marks" },
    example: ['他说"你好"', "他说“你好”"],
    check: (ctx) => {
      const [open, close] = ctx.quotes === "corner" ? ["「", "」"] : ["“", "”"];
      return [
        ...replaceAll("quotes", new RegExp(`"([^"\\n]*[${HAN}][^"\\n]*)"`, "gu"), (m) => open + m[1] + close)(ctx),
        ...(ctx.quotes === "corner"
          ? replaceAll("quotes", new RegExp(`“([^“”\\n]*[${HAN}][^“”\\n]*)”`, "gu"), (m) => open + m[1] + close)(ctx)
          : []),
      ];
    },
  },
  {
    id: "halfwidth-alnum",
    defaultOn: true,
    title: { zh: "数字与英文字母使用半角", en: "Half-width letters and digits" },
    example: ["ｉＰｈｏｎｅ１６", "iPhone16"],
    check: replaceAll("halfwidth-alnum", /[０-９Ａ-Ｚａ-ｚ]+/g,
      (m) => m[0].replace(/./g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))),
  },
  {
    id: "repeated-punct",
    defaultOn: false,
    title: { zh: "不重复使用标点", en: "No repeated punctuation" },
    example: ["太棒了！！！", "太棒了！"],
    check: replaceAll("repeated-punct", /([！？。，、；：])\1+/g, (m) => m[1]),
  },
];
