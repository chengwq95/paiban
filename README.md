# paiban · 中文排版助手

A checker and fixer for Chinese typography. It adds the spaces between Chinese and Latin text, and fixes full-width punctuation, quotes, ellipses, dashes and product-name capitalisation, while leaving code, links and HTML alone.

**Use it online at <https://chengwq95.github.io/paiban/>**: paste text (formatting is kept), review every change, and copy the result. Nothing to install, and your text never leaves the browser. It also comes as a browser extension, a command-line tool, a JavaScript library and a CI check.

The website also generates CSS for comfortable Chinese reading on the web: font stacks, line height, punctuation trimming and line breaking.

![The online checker marking problems in a Markdown document](docs/checker.png)

## What it fixes

<!-- paiban-disable -->
| Rule | Before | After |
|---|---|---|
| `space-between`: space between Chinese and Latin text or digits | 用AI读了300首唐诗 | 用 AI 读了 300 首唐诗 |
| `fullwidth-punct`: full-width punctuation in Chinese sentences | 床前明月光,疑是地上霜. | 床前明月光，疑是地上霜。 |
| `no-space-around-punct`: no spaces around full-width punctuation | 举头望明月 ， 低头思故乡 。 | 举头望明月，低头思故乡。 |
| `fullwidth-parens`: full-width parentheses around Chinese text | 李白(诗仙)与杜甫(诗圣) | 李白（诗仙）与杜甫（诗圣） |
| `ellipsis`: use “……” | 白日依山尽... | 白日依山尽…… |
| `dash`: use “——” | 春眠不觉晓--处处闻啼鸟 | 春眠不觉晓——处处闻啼鸟 |
| `quotes`: Chinese quotation marks (curly or corner) | 他吟道"海内存知己" | 他吟道“海内存知己” / 他吟道「海内存知己」 |
| `halfwidth-alnum`: half-width letters and digits | 唐诗３００首 | 唐诗300首 |
| `fullwidth-space`: no full-width spaces mid-sentence (indents are kept) | 静夜思　李白 | 静夜思 李白 |
| `proper-nouns`: correct capitalisation of product names, in Chinese text only | 用iphone看github | 用iPhone看GitHub |
| `repeated-punct` (off by default): no repeated punctuation | 好诗！！！ | 好诗！ |
<!-- paiban-enable -->

To skip part of a document, wrap it in `<!-- paiban-disable -->` and `<!-- paiban-enable -->`, or put `<!-- paiban-disable-next-line -->` above a line.

English-only text is never changed. In Markdown, fenced code blocks, inline code, front matter, URLs, e-mail addresses, link targets and HTML tags are skipped, and spaces are added around inline code and URLs (`` 运行`npm`安装 `` → `` 运行 `npm` 安装 ``).

## Website

- **Review every change**: changes are marked in red and green. Click any one to turn it down (click again to restore); copying, downloading and “Replace original” then skip it.
- **Word suggestions**: commonly confused words are underlined in yellow, never changed automatically: misspellings (`再接再励` → `再接再厉`, `既使` → `即使`), 的/地/得 in common patterns (`认真的学习` → `认真地学习`, `跑的很快` → `跑得很快`) and 登陆/登录. Click one to accept it. Turn them off in the rules section.
- **Rich text**: paste from Word, Google Docs, WeChat articles or any web page and bold, links, headings and lists are kept. “Copy result” puts both the formatted and the plain version on the clipboard.
- **Share links**: “Share link” puts the text (compressed) into the part of the URL after `#`, which browsers never send to a server. Anyone opening the link sees the same text and settings.
- Upload or drag in `.md`, `.txt` or `.html` files, download the result, or press Ctrl/⌘+Enter to replace the original.

## Browser extension

Fix text in place in any web editor (blog dashboards, Notion, e-mail, CMS editors): select text, right-click and choose “排版：修正选中的文字”, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>. With nothing selected it fixes the whole field. Formatting is kept and Ctrl+Z undoes the change. The toolbar popup has a quick-fix box and the rule settings.

To install, download `paiban-extension.zip` from the website, unzip it, open `chrome://extensions`, turn on Developer mode and choose “Load unpacked”. It works in Chrome, Edge, Arc, Brave and other Chromium browsers, only reads a page when you use it, and collects no data.

## Command line

Requires Node.js 18 or newer.

```bash
npx paiban docs/                 # check every .md, .mdx and .txt file under docs/
npx paiban --fix README.md       # fix files in place
npx paiban --rules               # list the rules
echo "用AI读唐诗,真方便!" | npx paiban --stdin
```

| Option | |
|---|---|
| `--fix` | Write fixes back to the files |
| `--stdin` | Read from standard input and print the fixed text |
| `--quotes curly\|corner` | “Curly” quotes (default, mainland style) or 「corner」 quotes (Taiwan, Hong Kong) |
| `--enable <rules>` / `--disable <rules>` | Turn rules on or off, e.g. `--disable quotes,dash` |
| `--plain` | Treat files as plain text instead of Markdown |

`paiban` exits with code 1 when it finds problems, so it works as a CI check:

```yaml
- uses: actions/setup-node@v7
- run: npx paiban docs/
```

## JavaScript / TypeScript

```ts
import { check, fix } from "paiban";

fix("用AI读唐诗,真方便!");
// → "用 AI 读唐诗，真方便！"

fix('他吟道"海内存知己"', { quotes: "corner", rules: { dash: false } });
// → "他吟道「海内存知己」"

check("用AI读唐诗,很好");
// → [{ rule: "space-between", line: 1, column: 2, original: "", replacement: " ", ... }, ...]
```

`check` returns every problem with its rule, position and replacement; `fix` applies them all and returns the corrected text. Both take the same options: `rules`, `quotes` and `markdown`.

`suggest` lists commonly confused words without changing anything, and the `skip` option leaves chosen changes out:

```ts
import { fix, suggest } from "paiban";

suggest("他认真的学习,再接再励");
// → [{ original: "的", replacement: "地", ... }, { original: "再接再励", replacement: "再接再厉", ... }]

fix("你好,世界!", { skip: [{ start: 2, end: 3 }] }); // → "你好,世界！"
```

In the browser, `paiban/dom` fixes HTML without touching its markup:

```ts
import { fixElement, fixHtml } from "paiban/dom";

fixHtml("<p>用<b>iPhone</b>读<a href=\"#\">唐诗</a>,很方便!</p>");
// → '<p>用 <b>iPhone</b> 读<a href="#">唐诗</a>，很方便！</p>'

fixElement(document.querySelector("article")); // fixes the page in place
```

## Development

```bash
npm install
npm test             # rule tests (Vitest)
npm run typecheck
npm run build        # library and CLI into dist/
npm run dev          # website at http://localhost:5173
npm run build:extension  # browser extension into extension/dist/
npm run build:site   # extension zip + website into site/dist/
```

- `src/rules.ts`: the rules. Each one has an id, a title in both languages, an example and a `check` function that returns replacements.
- `src/protect.ts`: finds code, URLs and other text the rules must skip.
- `src/index.ts`: `check` and `fix`.
- `src/suggest.ts`: commonly confused words (suggestions only).
- `src/dom.ts`: fixes text inside HTML / DOM trees while keeping the markup.
- `src/cli.ts`: the command-line tool.
- `extension/`: the browser extension (Manifest V3).
- `site/`: the website (no framework, built with Vite). `site/i18n.ts` holds its text, which `vite.config.ts` also writes into the HTML at build time so the page reads correctly before JavaScript runs.

Pushes to `main` run the tests and deploy the website to GitHub Pages (enable Pages with the source set to “GitHub Actions” in the repository settings).

## License

MIT
