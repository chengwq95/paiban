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
  "fullwidth-space",
  "proper-nouns",
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

const PROPER_NOUN_LIST = [
  "GitHub", "GitLab", "JavaScript", "TypeScript", "Node.js", "Vue.js", "Next.js", "Nuxt", "npm", "pnpm",
  "iPhone", "iPad", "iOS", "iPadOS", "macOS", "watchOS", "MacBook", "iCloud", "AirPods", "Xcode",
  "Wi-Fi", "YouTube", "WeChat", "PayPal", "LinkedIn", "WhatsApp", "TikTok", "ChatGPT", "OpenAI",
  "PowerPoint", "WordPress", "PostgreSQL", "MySQL", "MongoDB", "SQLite", "GraphQL", "Python", "Kotlin",
  "HTML", "CSS", "JSON", "API", "URL", "HTTP", "HTTPS", "PDF", "USB", "CPU", "GPU", "SQL", "SEO",
  "VS Code", "Figma", "Photoshop", "Docker", "Kubernetes",
];
const PROPER_NOUNS = new Map(PROPER_NOUN_LIST.map((w) => [w.toLowerCase().replace(/[\s-]/g, ""), w]));
// Whole words only, and not part of a path, domain, file name or identifier (".github/", "json_data").
const PROPER_NOUN_RE = new RegExp(
  `(?<![\\w./@#$-])(?:${PROPER_NOUN_LIST.map((w) => w.replace(/[.]/g, "\\.").replace(/[\s-]/g, "[\\s-]?")).sort((a, b) => b.length - a.length).join("|")})(?![\\w/@-]|\\.\\w)`,
  "giu",
);

const PUNCT_MAP: Record<string, string> = { ",": "，", "!": "！", "?": "？", ";": "；", ":": "：", ".": "。" };

export const RULES: Rule[] = [
  {
    id: "space-between",
    defaultOn: true,
    title: { zh: "中文与英文、数字之间加空格", en: "Space between Chinese and Latin text or digits" },
    example: ["用AI读了300首唐诗", "用 AI 读了 300 首唐诗"],
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
    example: ["床前明月光,疑是地上霜.", "床前明月光，疑是地上霜。"],
    check: (ctx) => [
      ...replaceAll("fullwidth-punct", new RegExp(`(?<=[${HAN}${FULL_CLOSE}])[ \\t]*([,!?;:]+)[ \\t]*|(?<=[${LATIN}%])[ \\t]*([,!?;:]+)[ \\t]*(?=[${HAN}])`, "gu"),
        (m) => [...(m[1] ?? m[2])].map((c) => PUNCT_MAP[c]).join(""))(ctx),
      // Punctuation ending a Chinese line right after Latin text or digits: "折扣 10%!" -> "折扣 10%！".
      ...replaceAll("fullwidth-punct", new RegExp(`(?<=[${HAN}][^\\n]{0,40}?[${LATIN}%])[ \\t]*([,!?;:.])(?=[ \\t]*$)`, "gmu"),
        (m) => PUNCT_MAP[m[1]])(ctx),
      // A full stop only at the end of a sentence, so "文件.txt" is left alone.
      ...replaceAll("fullwidth-punct", new RegExp(`(?<=[${HAN}])[ \\t]*\\.(?!\\.)(?=[ \\t]*(?:$|[${HAN}]))`, "gmu"),
        () => "。")(ctx),
    ],
  },
  {
    id: "no-space-around-punct",
    defaultOn: true,
    title: { zh: "全角标点前后不加空格", en: "No spaces around full-width punctuation" },
    example: ["举头望明月 ， 低头思故乡 。", "举头望明月，低头思故乡。"],
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
    example: ["李白(诗仙)与杜甫(诗圣)", "李白（诗仙）与杜甫（诗圣）"],
    check: replaceAll("fullwidth-parens", new RegExp(`[ \\t]*\\(([^()\\n]*[${HAN}][^()\\n]*)\\)[ \\t]*`, "gu"), (m) => `（${m[1].trim()}）`),
  },
  {
    id: "ellipsis",
    defaultOn: true,
    title: { zh: "省略号使用「……」", en: "Use “……” for ellipses" },
    example: ["白日依山尽...", "白日依山尽……"],
    check: replaceAll("ellipsis", new RegExp(`(?<=[${HAN}${FULL_CLOSE}”’])[ \\t]*(?:\\.{3,}|。{3,}|…+)`, "gu"), () => "……"),
  },
  {
    id: "dash",
    defaultOn: true,
    title: { zh: "破折号使用「——」", en: "Use “——” for dashes" },
    example: ["春眠不觉晓--处处闻啼鸟", "春眠不觉晓——处处闻啼鸟"],
    check: replaceAll("dash", new RegExp(`(?<=[${HAN}${FULL_CLOSE}”’])[ \\t]*(?:-{2,}|[—―]+)[ \\t]*(?=[${HAN}${FULL_OPEN}“‘])`, "gu"), () => "——"),
  },
  {
    id: "quotes",
    defaultOn: true,
    title: { zh: "中文引号", en: "Chinese quotation marks" },
    example: ['他吟道"海内存知己"', "他吟道“海内存知己”"],
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
    example: ["唐诗３００首", "唐诗300首"],
    check: replaceAll("halfwidth-alnum", /[０-９Ａ-Ｚａ-ｚ]+/g,
      (m) => m[0].replace(/./g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))),
  },
  {
    id: "fullwidth-space",
    defaultOn: true,
    title: { zh: "句中不用全角空格", en: "No full-width spaces mid-sentence" },
    example: ["静夜思\u3000李白", "静夜思 李白"],
    // Leading full-width spaces (paragraph indents) are fine. Elsewhere they become a normal space,
    // or disappear next to full-width punctuation.
    check: replaceAll("fullwidth-space", /(?<=\S)\u3000+/gu, (m) => {
      const before = m.input![m.index! - 1];
      const after = m.input![m.index! + m[0].length] ?? "";
      return FULL_CLOSE.includes(before) || FULL_OPEN.includes(before) || FULL_CLOSE.includes(after) ? "" : " ";
    }),
  },
  {
    id: "proper-nouns",
    defaultOn: true,
    title: { zh: "专有名词的正确大小写", en: "Correct capitalisation of product names" },
    example: ["用iphone看github", "用iPhone看GitHub"],
    check: ({ masked }) => {
      const issues: Issue[] = [];
      for (const m of masked.text.matchAll(PROPER_NOUN_RE)) {
        const word = m[0];
        const canonical = PROPER_NOUNS.get(word.toLowerCase().replace(/[\s-]/g, ""));
        if (!canonical || canonical === word) continue;
        const start = m.index!;
        const end = start + word.length;
        if (touches(masked.ranges, start, end)) continue;
        // Only in Chinese text, so English documents keep their own style.
        const lineStart = masked.text.lastIndexOf("\n", start) + 1;
        const lineEnd = masked.text.indexOf("\n", end);
        if (!new RegExp(`[${HAN}]`, "u").test(masked.text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd))) continue;
        issues.push({ rule: "proper-nouns", start, end, replacement: canonical });
      }
      return issues;
    },
  },
  {
    id: "repeated-punct",
    defaultOn: false,
    title: { zh: "不重复使用标点", en: "No repeated punctuation" },
    example: ["好诗！！！", "好诗！"],
    check: replaceAll("repeated-punct", /([！？。，、；：])\1+/g, (m) => m[1]),
  },
];
