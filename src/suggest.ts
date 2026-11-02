import { mask, touches } from "./protect.js";
import type { Lang } from "./rules.js";

// Commonly confused words and characters. These are only suggestions: whether 的, 地 or 得 is right
// depends on meaning, so nothing here is changed automatically. Each entry is precise enough that
// a flag is usually worth a look.

export interface Suggestion {
  start: number;
  end: number;
  original: string;
  replacement: string;
  message: Record<Lang, string>;
}

interface Entry {
  re: RegExp;
  /** Given the match, the suggested text (or null to skip this match). */
  to: (m: RegExpMatchArray) => string | null;
  message: Record<Lang, string>;
}

// Misspelt idioms and words with one right form.
const TYPOS: Record<string, string> = {
  再接再励: "再接再厉", 迫不急待: "迫不及待", 一愁莫展: "一筹莫展", 走头无路: "走投无路", 默守成规: "墨守成规",
  谈笑风声: "谈笑风生", 甘败下风: "甘拜下风", 不径而走: "不胫而走", 出奇不意: "出其不意", 美仑美奂: "美轮美奂",
  原形必露: "原形毕露", 一股作气: "一鼓作气", 心心相映: "心心相印", 世外桃园: "世外桃源", 穿流不息: "川流不息",
  竭泽而鱼: "竭泽而渔", 名符其实: "名副其实", 莫明其妙: "莫名其妙", 按步就班: "按部就班",
  变本加利: "变本加厉", 病入膏盲: "病入膏肓", 草管人命: "草菅人命", 重峦叠障: "重峦叠嶂",
  既使: "即使", 按装: "安装", 座落: "坐落", 做为: "作为", 帐号: "账号", 帐户: "账户", 帐单: "账单",
  侯车: "候车", 渡假: "度假", 松驰: "松弛", 震憾: "震撼", 精萃: "精粹", 针贬: "针砭",
  一幅眼镜: "一副眼镜", 气慨: "气概", 脉博: "脉搏", 寒喧: "寒暄",
};

// Adverb-like words that usually take 地 before a verb, and verbs that take 得 before a degree word.
const ADVERBIAL = "认真|努力|仔细|快速|迅速|慢慢|悄悄|轻轻|静静|默默|高兴|开心|热情|耐心|大声|小声|飞快|渐渐|逐渐|不断|积极|主动|彻底|深入|顺利|明显|大大|好好|狠狠|紧紧|缓缓|匆匆|偷偷|稳稳|激动|兴奋|愉快|幸福|安静|疯狂|拼命|用力|轻松|认认真真|高高兴兴|仔仔细细|清楚";
const ACTION = "说|笑|跑|走|看|听|想|学习|工作|写|读|做|吃|喝|跳|哭|点头|回答|离开|完成|发展|增长|提高|解决|处理|思考|研究|告诉|问|叫|喊|讨论|交流|生活|成长|前进|进行|改变|变化|上升|下降|流动|飘|唱|练习|准备|检查|整理|打开|关上|站|坐|躺|睡";
const DEGREE_VERB = "跑|写|说|做|学|唱|跳|长|过|活|睡|吃|讲|笑|哭|打|玩|干|画|演|弹|飞|游|走|开|变|来|去|忙|累|急";
const DEGREE = "很(?!多|少)|非常|真|特别|太|十分|越来越|更|极|不错|好极了";

const ENTRIES: Entry[] = [
  {
    re: new RegExp(Object.keys(TYPOS).sort((a, b) => b.length - a.length).join("|"), "g"),
    to: (m) => TYPOS[m[0]],
    message: { zh: "常见错别字", en: "Common misspelling" },
  },
  {
    re: new RegExp(`(?<=${ADVERBIAL})的(?=(?:${ACTION}))`, "g"),
    to: () => "地",
    message: { zh: "修饰动作时通常用「地」，例如「认真地学习」", en: "地 usually links an adverb to a verb, e.g. 认真地学习" },
  },
  {
    re: new RegExp(`(?<=(?:${DEGREE_VERB}))的(?=(?:${DEGREE}))`, "g"),
    to: () => "得",
    message: { zh: "补充说明程度时通常用「得」，例如「跑得很快」", en: "得 usually introduces a degree, e.g. 跑得很快" },
  },
  {
    re: /登陆(?=(?:账号|帐号|网站|页面|系统|后台|界面|微信|邮箱|App|APP|app))|(?<=(?:账号|帐号|用户|请|重新|自动|无法|扫码))登陆/g,
    to: () => "登录",
    message: { zh: "进入网站或 App 用「登录」；「登陆」是上岸、着陆", en: "登录 is logging in; 登陆 means landing" },
  },
  {
    re: /(?<=(?:不|无|没|没有))须(?=[要的])/g,
    to: () => "需",
    message: { zh: "表示需要时用「需」", en: "需 means “need”" },
  },
];

/** Suggestions for commonly confused words. Code, URLs and HTML are skipped as in `check`. */
export function suggest(text: string, { markdown = true } = {}): Suggestion[] {
  const masked = mask(text, { markdown });
  const out: Suggestion[] = [];
  for (const entry of ENTRIES) {
    entry.re.lastIndex = 0;
    for (const m of masked.text.matchAll(entry.re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (touches(masked.ranges, start, end)) continue;
      const replacement = entry.to(m);
      if (!replacement || replacement === m[0]) continue;
      out.push({ start, end, original: m[0], replacement, message: entry.message });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
