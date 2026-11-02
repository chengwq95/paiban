import { describe, expect, it } from "vitest";
import { suggest } from "../src/suggest";

const pick = (text: string) => suggest(text).map((s) => `${s.original}→${s.replacement}`);

describe("suggest", () => {
  it("flags misspelt words", () => {
    expect(pick("我们要再接再励,既使很难")).toEqual(["再接再励→再接再厉", "既使→即使"]);
  });
  it("suggests 地 before verbs", () => {
    expect(pick("他认真的学习,慢慢的走")).toEqual(["的→地", "的→地"]);
    expect(pick("认真的态度")).toEqual([]);
  });
  it("suggests 得 before degree words", () => {
    expect(pick("他跑的很快")).toEqual(["的→得"]);
    expect(pick("我写的很多文章")).toEqual([]);
  });
  it("suggests 登录 for logging in", () => {
    expect(pick("请登陆账号")).toEqual(["登陆→登录"]);
    expect(pick("台风登陆沿海")).toEqual([]);
  });
  it("skips code", () => {
    expect(pick("运行`既使`")).toEqual([]);
  });
});
