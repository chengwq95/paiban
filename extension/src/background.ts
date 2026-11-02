// Adds right-click menu items and a keyboard shortcut; both run the fixer in the page.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "fix-selection", title: chrome.i18n.getMessage("menuFix"), contexts: ["selection"] });
    chrome.contextMenus.create({ id: "fix-field", title: chrome.i18n.getMessage("menuFixField"), contexts: ["editable"] });
  });
});

async function run(tabId: number, frameId: number | undefined, wholeField: boolean) {
  const target = frameId === undefined ? { tabId } : { tabId, frameIds: [frameId] };
  await chrome.scripting.executeScript({ target, func: (whole: boolean) => { (globalThis as { __paibanWhole?: boolean }).__paibanWhole = whole; }, args: [wholeField] });
  await chrome.scripting.executeScript({ target, files: ["content.js"] });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id !== undefined) run(tab.id, info.frameId, info.menuItemId === "fix-field").catch(console.error);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "fix-selection" && tab?.id !== undefined) run(tab.id, undefined, false).catch(console.error);
});
