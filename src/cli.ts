#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { check, fix, RULES, RULE_IDS, type Options, type RuleId } from "./index.js";

const HELP = `paiban — 中文排版检查与修正 / Chinese typography checker

用法 Usage:
  paiban [选项] <文件或目录...>      检查文件 / check files
  paiban --fix <文件或目录...>        直接修正 / fix in place
  echo "文本" | paiban --stdin        从标准输入读取，输出修正结果

选项 Options:
  --fix                 修正文件 / write fixes back to the files
  --stdin               读取标准输入并输出修正后的文本
  --quotes <curly|corner>  引号样式：“弯引号”（默认）或「直角引号」
  --enable <规则,...>   打开规则 / turn rules on
  --disable <规则,...>  关闭规则 / turn rules off
  --plain               当作纯文本，不跳过 Markdown 代码块
  --rules               列出所有规则
  -h, --help            显示帮助

目录会递归检查 .md、.mdx、.markdown 和 .txt 文件。
有问题时退出码为 1，可以直接用在 CI 里。`;

const EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = paint(2), red = paint(31), green = paint(32), cyan = paint(36), bold = paint(1);

function fail(message: string): never {
  console.error(red(message));
  process.exit(2);
}

function parseRules(value: string | undefined, flag: string): RuleId[] {
  if (!value) fail(`${flag} 需要规则名称，例如 ${flag} space-between`);
  const ids = value.split(",").map((s) => s.trim()).filter(Boolean);
  for (const id of ids) if (!RULE_IDS.includes(id as RuleId)) fail(`未知规则 unknown rule: ${id}（用 --rules 查看全部）`);
  return ids as RuleId[];
}

function collect(path: string, out: string[]) {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    fail(`找不到 not found: ${path}`);
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) if (!SKIP_DIRS.has(entry) && !entry.startsWith(".")) {
      const child = join(path, entry);
      if (statSync(child).isDirectory() || EXTENSIONS.has(extname(entry).toLowerCase())) collect(child, out);
    }
  } else out.push(path);
}

/** "在macOS" → "在 macOS": the change with a few characters of context on each side. */
function preview(text: string, start: number, end: number, replacement: string) {
  const clean = (s: string) => s.replace(/\s+/g, " ");
  const before = clean(text.slice(Math.max(0, start - 4), start).split("\n").pop()!);
  const after = clean(text.slice(end, end + 4).split("\n")[0]);
  const mark = (s: string) => (s.trim() ? s : s.replace(/ /g, "␣"));
  return `${dim(before)}${red(mark(text.slice(start, end)))}${dim(after)} → ${dim(before)}${green(mark(replacement))}${dim(after)}`;
}

function main(argv: string[]) {
  const options: Options = { rules: {} };
  const paths: string[] = [];
  let doFix = false;
  let stdin = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") return void console.log(HELP);
    else if (arg === "--fix") doFix = true;
    else if (arg === "--stdin") stdin = true;
    else if (arg === "--plain") options.markdown = false;
    else if (arg === "--quotes") {
      const v = argv[++i];
      if (v !== "curly" && v !== "corner") fail("--quotes 只能是 curly 或 corner");
      options.quotes = v;
    } else if (arg === "--enable") for (const id of parseRules(argv[++i], arg)) options.rules![id] = true;
    else if (arg === "--disable") for (const id of parseRules(argv[++i], arg)) options.rules![id] = false;
    else if (arg === "--rules") {
      for (const r of RULES) console.log(`${r.defaultOn ? green("●") : dim("○")} ${bold(r.id.padEnd(22))} ${r.title.zh}  ${dim(`${r.example[0]} → ${r.example[1]}`)}`);
      return;
    } else if (arg.startsWith("-")) fail(`未知选项 unknown option: ${arg}`);
    else paths.push(arg);
  }

  if (stdin) {
    process.stdout.write(fix(readFileSync(0, "utf8"), options));
    return;
  }
  if (!paths.length) return void console.log(HELP);

  const files: string[] = [];
  for (const p of paths) collect(p, files);

  let total = 0;
  let fixedFiles = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (doFix) {
      const out = fix(text, options);
      if (out !== text) {
        writeFileSync(file, out);
        fixedFiles++;
        console.log(`${green("✓")} ${file}`);
      }
      continue;
    }
    const problems = check(text, options);
    if (!problems.length) continue;
    total += problems.length;
    console.log(bold(file));
    const titles = Object.fromEntries(RULES.map((r) => [r.id, r.title.zh]));
    for (const p of problems) {
      console.log(`  ${dim(`${p.line}:${p.column}`.padEnd(8))} ${preview(text, p.start, p.end, p.replacement).padEnd(20)}  ${titles[p.rule]} ${cyan(p.rule)}`);
    }
    console.log();
  }

  if (doFix) console.log(fixedFiles ? `已修正 ${fixedFiles} 个文件 / fixed ${fixedFiles} file(s)` : "没有需要修正的内容 / nothing to fix");
  else if (total) {
    console.log(red(`发现 ${total} 处问题 / ${total} problem(s)`) + dim("，运行 paiban --fix 可自动修正"));
    process.exitCode = 1;
  } else console.log(green(`✓ ${files.length} 个文件没有问题 / no problems`));
}

main(process.argv.slice(2));
