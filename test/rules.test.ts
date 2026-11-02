import { describe, expect, it } from "vitest";
import { check, fix } from "../src/index";

const cases: [string, string, string][] = [
  ["space-between", "使用GitHub托管了3个项目", "使用 GitHub 托管了 3 个项目"],
  ["space-between: percent", "有50%的人", "有 50% 的人"],
  ["space-between: C++ and C#", "学习C++和C#语言", "学习 C++ 和 C# 语言"],
  ["space-between: hashtag kept", "#话题 和 #标签", "#话题 和 #标签"],
  ["space-between: already spaced", "使用 GitHub 托管", "使用 GitHub 托管"],
  ["fullwidth-punct", "你好,世界!", "你好，世界！"],
  ["fullwidth-punct: trailing space", "你好, world", "你好，world"],
  ["fullwidth-punct: after Latin", "我用Mac,效率很高", "我用 Mac，效率很高"],
  ["fullwidth-punct: English clause kept", "He said: hello", "He said: hello"],
  ["fullwidth-punct: question run", "真的吗??", "真的吗？？"],
  ["fullwidth-punct: colon", "时间:下午3:00", "时间：下午 3:00"],
  ["full stop", "这是一句话.", "这是一句话。"],
  ["full stop: file name kept", "打开文件.txt", "打开文件.txt"],
  ["full stop: version kept", "版本v1.2发布", "版本 v1.2 发布"],
  ["no space around punct", "你好 ， 世界 。", "你好，世界。"],
  ["parens", "开源(免费)软件", "开源（免费）软件"],
  ["parens: English kept", "用 Node.js (v20) 运行", "用 Node.js (v20) 运行"],
  ["ellipsis", "然后...", "然后……"],
  ["ellipsis: single", "然后…", "然后……"],
  ["dash", "这个问题--其实很简单", "这个问题——其实很简单"],
  ["dash: after quote", "“好用！”--我也觉得", "“好用！”——我也觉得"],
  ["dash: Markdown rule kept", "上文\n\n---\n\n下文", "上文\n\n---\n\n下文"],
  ["quotes", '他说"你好"', "他说“你好”"],
  ["quotes: English kept", 'He said "hi"', 'He said "hi"'],
  ["halfwidth alnum", "ｉＰｈｏｎｅ１６上市", "iPhone16 上市"],
  ["after percent", "提高了30%!他说", "提高了 30%！他说"],
  ["ellipsis after quote", "他说“好”...", "他说“好”……"],
  ["end of line after percent", "首月折扣10%!", "首月折扣 10%！"],
  ["end of line: English line kept", "Done 100%!", "Done 100%!"],
  ["end of line: list number kept", "1. 第一项", "1. 第一项"],
  ["fullwidth space", "静夜思\u3000李白", "静夜思 李白"],
  ["fullwidth space: before punct", "你好\u3000，世界", "你好，世界"],
  ["fullwidth space: indent kept", "\u3000\u3000床前明月光", "\u3000\u3000床前明月光"],
  ["proper nouns", "用iphone看github上的javascript项目", "用 iPhone 看 GitHub 上的 JavaScript 项目"],
  ["proper nouns: wifi and vscode", "连上wifi后打开vscode", "连上 Wi-Fi 后打开 VS Code"],
  ["proper nouns: paths kept", "编辑 .github/workflows 和 data.json 文件", "编辑 .github/workflows 和 data.json 文件"],
  ["proper nouns: English line kept", "push to github", "push to github"],
  ["mixed", "我用Mac写代码,效率很高!", "我用 Mac 写代码，效率很高！"],
];

describe("fix", () => {
  for (const [name, input, expected] of cases) it(name, () => expect(fix(input)).toBe(expected));

  it("is idempotent", () => {
    for (const [, input] of cases) expect(fix(fix(input))).toBe(fix(input));
  });

  it("leaves English-only text alone", () => {
    const text = "Hello, world! This is fine... right? (Yes) -- \"quoted\".";
    expect(fix(text)).toBe(text);
  });
});

describe("protected text", () => {
  it("spaces around inline code but not inside it", () => {
    expect(fix("运行`npm安装`命令")).toBe("运行 `npm安装` 命令");
  });
  it("skips fenced code blocks", () => {
    const md = "说明:\n\n```js\nconst a = \"中文\",b=1;\n```\n";
    expect(fix(md)).toBe("说明：\n\n```js\nconst a = \"中文\",b=1;\n```\n");
  });
  it("skips URLs and e-mails but spaces around them", () => {
    expect(fix("访问https://example.com/a?b=1,c获取")).toBe("访问 https://example.com/a?b=1,c 获取");
    expect(fix("写信给me@example.com联系")).toBe("写信给 me@example.com 联系");
  });
  it("skips Markdown link targets", () => {
    expect(fix("见[文档](./文档(1).md)说明")).toBe("见[文档](./文档(1).md)说明");
  });
  it("skips HTML tags", () => {
    expect(fix('<span title="中文,标题">内容</span>')).toBe('<span title="中文,标题">内容</span>');
  });
  it("keeps spaces next to Markdown table pipes", () => {
    expect(fix("| 你好！ | 世界。 |")).toBe("| 你好！ | 世界。 |");
  });
  it("keeps the space before English after corner brackets", () => {
    expect(fix("Use 「corner」 quotes")).toBe("Use 「corner」 quotes");
  });
  it("honours ignore comments", () => {
    expect(fix("<!-- paiban-disable -->\n你好,世界\n<!-- paiban-enable -->\n你好,世界")).toBe("<!-- paiban-disable -->\n你好,世界\n<!-- paiban-enable -->\n你好，世界");
    expect(fix("<!-- paiban-disable-next-line -->\n你好,世界\n你好,世界")).toBe("<!-- paiban-disable-next-line -->\n你好,世界\n你好，世界");
  });
  it("skips front matter", () => {
    const md = "---\ntitle: 标题,副标题\n---\n正文";
    expect(fix(md)).toBe(md);
  });
});

describe("options", () => {
  it("corner quotes", () => {
    expect(fix('他说"你好"', { quotes: "corner" })).toBe("他说「你好」");
    expect(fix("他说“你好”", { quotes: "corner" })).toBe("他说「你好」");
  });
  it("repeated punctuation is opt-in", () => {
    expect(fix("太棒了！！！")).toBe("太棒了！！！");
    expect(fix("太棒了！！！", { rules: { "repeated-punct": true } })).toBe("太棒了！");
  });
  it("rules can be turned off", () => {
    expect(fix("使用GitHub", { rules: { "space-between": false } })).toBe("使用GitHub");
  });
});

describe("check", () => {
  it("reports line, column and rule", () => {
    const problems = check("第一行\n使用GitHub,很好");
    expect(problems.map((p) => [p.rule, p.line, p.column, p.original, p.replacement])).toEqual([
      ["space-between", 2, 3, "", " "],
      ["fullwidth-punct", 2, 9, ",", "，"],
    ]);
  });
});
