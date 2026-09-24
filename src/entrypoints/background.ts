chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  void activateLocator(tab.id);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined || sender.frameId !== 0)
    return false;
  if (
    !message ||
    typeof message !== "object" ||
    !("type" in message) ||
    message.type !== "inspect-element" ||
    !("chain" in message)
  )
    return false;
  const chain = message.chain;
  if (
    !Array.isArray(chain) ||
    !chain.length ||
    chain.length > 30 ||
    !chain.every((selector: unknown) => typeof selector === "string" && selector.length <= 10000)
  )
    return false;
  const target = sender.documentId
    ? { tabId: sender.tab.id, documentIds: [sender.documentId] }
    : { tabId: sender.tab.id, frameIds: [0] };
  void (async () => {
    try {
      await chrome.scripting.executeScript({ target, world: "MAIN", files: ["page-inspector.js"] });
      const results = await chrome.scripting.executeScript({
        target,
        world: "MAIN",
        func: (selectors: string[]) => window.__cadranoteInspect?.(selectors) ?? null,
        args: [chain as string[]],
      });
      respond(results[0]?.result ?? null);
    } catch {
      respond(null);
    }
  })();
  return true;
});

async function activateLocator(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (error) {
    console.warn("Cadranote : sélection indisponible", error);

    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("unavailable.html") });
    } catch (helpError) {
      console.warn("Cadranote : impossible d’afficher l’aide", helpError);
    }
  }
}
