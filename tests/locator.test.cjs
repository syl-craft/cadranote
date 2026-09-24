const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.resolve(__dirname, "..");
let browser, server, origin;
before(async () => {
  server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.readFileSync(path.join(__dirname, "fixture.html")));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
});
after(async () => {
  await browser?.close();
  await new Promise((resolve) => {
    if (!server) return resolve();
    server.close(resolve);
    server.closeAllConnections();
  });
});
async function setup(t, ui = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(origin + "/demo?private-token=excluded#private-hash");
  // Expose the closed ShadowRoot to the tests.
  await page.evaluate(() => {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const result = attach.call(this, options);
      if (this.localName === "html-locator-overlay") window.testUI = result;
      return result;
    };
  });
  await page.addScriptTag({ path: path.join(root, ".test-build", "locator.js") });
  if (ui) await page.addScriptTag({ path: path.join(root, "content.js") });
  return page;
}
test("every light DOM selector resolves uniquely, including duplicate and escaped IDs", async (t) => {
  const page = await setup(t);
  const failures = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].flatMap((el) => {
      const selector = HTMLLocatorCore.selectorFor(el);
      const matches = document.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === el ? [] : [selector];
    }),
  );
  assert.deepEqual(failures, []);
});
test("shadow traversal resolves the original element and is explicitly identified", async (t) => {
  const page = await setup(t);
  const result = await page.evaluate(() => {
    const el = document.querySelector("#shadow-host").shadowRoot.querySelector("button");
    const data = HTMLLocatorCore.describe(el);
    return {
      same: eval(data.javascript) === el,
      chain: data.chain,
      path: data.path,
      prompt: HTMLLocatorCore.promptFor(data),
    };
  });
  assert.equal(result.same, true);
  assert.equal(result.chain.length, 2);
  assert.match(result.path, /#shadow-root/);
  assert.match(result.prompt, /pas du CSS standard/);
});
test("AI context omits URL query/hash and form values, and includes user instruction", async (t) => {
  const page = await setup(t);
  const result = await page.evaluate(() =>
    HTMLLocatorCore.promptFor(
      HTMLLocatorCore.describe(document.querySelector("#edge-cases")),
      "Changer la couleur",
    ),
  );
  assert.doesNotMatch(result, /secret-test|secret-textarea|private-token|private-hash/);
  assert.match(result, /Changer la couleur/);
  assert.match(result, /Chemin HTML/);
});
test("picker blocks application clicks, copies context, selects parent and cleans up", async (t) => {
  const page = await setup(t, true);
  const button = page.locator('[data-testid="buy-essential"]');
  await button.hover();
  await page.waitForFunction(() => !testUI.querySelector(".box").hidden);
  await button.click();
  assert.equal(await page.evaluate(() => applicationClicks), 0);
  assert.equal(await page.evaluate(() => testUI.querySelector("#result").hidden), false);
  await page.evaluate(() => {
    testUI.querySelector("#instruction").value = "Rendre ce bouton vert";
    testUI.querySelector("#copy-ai").click();
  });
  await page.waitForFunction(() =>
    testUI.querySelector(".feedback").textContent.includes("Contexte copié"),
  );
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clipboard, /buy-essential/);
  assert.match(clipboard, /Rendre ce bouton vert/);
  const fullText = "Un contenu plus long que le résumé IA. ".repeat(12).trim();
  await page.evaluate((text) => {
    document.querySelector('[data-testid="buy-essential"]').textContent = text;
    testUI.querySelector("#copy-content").click();
  }, fullText);
  await page.waitForFunction(() =>
    testUI.querySelector(".feedback").textContent.includes("Contenu copié"),
  );
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fullText);
  await page.evaluate(() => {
    document.querySelector('[data-testid="buy-essential"]').textContent = "Choisir Essentiel";
    testUI.querySelector("#copy-html").click();
  });
  await page.waitForFunction(() =>
    testUI.querySelector(".feedback").textContent.includes("Extrait HTML copié"),
  );
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    '<button class="buy" data-testid="buy-essential">Choisir Essentiel</button>',
  );
  await page.evaluate(() => testUI.querySelector("#parent").click());
  assert.match(await page.evaluate(() => testUI.querySelector("#meta").textContent), /^article/);
  await page.screenshot({ path: path.join(root, "tests", "preview.png") });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("html-locator-overlay").count(), 0);
  await button.click();
  assert.equal(await page.evaluate(() => applicationClicks), 1);
});
test("reinjection leaves a single UI; selecting a shadow element works", async (t) => {
  const page = await setup(t, true);
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(await page.locator("html-locator-overlay").count(), 1);
  await page.locator("#shadow-host button").click();
  assert.match(await page.evaluate(() => testUI.querySelector("#selector").textContent), />>>/);
  await page.evaluate(() => testUI.querySelector("#restart").click());
  assert.equal(await page.evaluate(() => testUI.querySelector("#result").hidden), true);
  await page.keyboard.press("Escape");
});
test("the standalone bundle works without a global core and disposes the previous picker", async (t) => {
  const page = await setup(t, true);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluate(() => {
    delete window.HTMLLocatorCore;
    window.oldPicker = __htmlLocator;
    window.oldOverlay = document.querySelector("html-locator-overlay");
  });
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(
    await page.evaluate(
      () =>
        typeof HTMLLocatorCore === "undefined" &&
        __htmlLocator !== oldPicker &&
        !oldOverlay.isConnected,
    ),
    true,
  );
  assert.equal(await page.locator("html-locator-overlay").count(), 1);
  await page.locator('[data-testid="buy-essential"]').click();
  await page.evaluate(() => testUI.querySelector("#copy-content").click());
  await page.waitForFunction(() =>
    testUI.querySelector(".feedback").textContent.includes("Contenu copié"),
  );
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "Choisir Essentiel");
  assert.equal(await page.evaluate(() => applicationClicks), 0);
  await page.keyboard.press("Escape");
  await page.locator('[data-testid="buy-essential"]').click();
  assert.equal(await page.evaluate(() => applicationClicks), 1);
  assert.deepEqual(errors, []);
});
async function uiClick(page, selector) {
  const needsExpansion = await page.evaluate((selector) => {
    const button = testUI.querySelector(selector);
    const section = button.closest("details");
    return section && !section.open && button.tagName !== "SUMMARY" ? section.id : null;
  }, selector);
  if (needsExpansion) await clickPanelElement(page, `#${needsExpansion} > summary`);
  await clickPanelElement(page, selector);
}

test("adding from a collapsed list preserves the draft and the copy action stays visible", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await page.evaluate(() => {
    testUI.querySelector("#instruction").value = "Harmoniser les boutons";
  });
  await addExtra(page, "#shadow-host button");
  assert.equal(await page.evaluate(() => testUI.querySelector("#attachments").open), false);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#instruction").value),
    "Harmoniser les boutons",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 720 });
    await uiClick(page, "#copy-selector");
    const layout = await page.evaluate(() => {
      const body = testUI.querySelector(".body");
      const copy = testUI.querySelector("#copy-ai");
      const selector = testUI.querySelector("#copy-selector");
      selector.focus();
      const bodyBounds = body.getBoundingClientRect();
      const focusedBounds = selector.getBoundingClientRect();
      const copyBounds = copy.getBoundingClientRect();
      return {
        hasOverflow: body.scrollWidth > body.clientWidth,
        focusVisible:
          focusedBounds.top >= bodyBounds.top && focusedBounds.bottom <= bodyBounds.bottom,
        copyVisible:
          copyBounds.left >= 0 &&
          copyBounds.right <= innerWidth &&
          copyBounds.top >= bodyBounds.bottom &&
          copyBounds.bottom <= innerHeight,
        transition: getComputedStyle(copy).transitionDuration,
      };
    });
    assert.equal(layout.hasOverflow, false, `overflow at ${width}px`);
    assert.equal(layout.focusVisible, true, `focus at ${width}px`);
    assert.equal(layout.copyVisible, true, `copy at ${width}px`);
    assert.equal(layout.transition, "0s");
  }
  const context = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(context, /Harmoniser les boutons/);
  assert.match(context, /Élément supplémentaire 1/);
});
async function clickPanelElement(page, selector) {
  const handle = await page.evaluateHandle((selector) => testUI.querySelector(selector), selector);
  try {
    await handle.asElement().click();
  } finally {
    await handle.dispose();
  }
}
async function copyFrom(page, selector, message) {
  await page.evaluate(() => (testUI.querySelector(".feedback").textContent = ""));
  await uiClick(page, selector);
  await page.waitForFunction(
    (message) => testUI.querySelector(".feedback").textContent.includes(message),
    message,
  );
  return (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
}
async function addExtra(page, selector) {
  await uiClick(page, "#attach");
  await page.locator(selector).click();
}

test("removing supplements by keyboard keeps focus in the list, then on the add button", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await addExtra(page, "#shadow-host button");
  await addExtra(page, ".cards article:nth-child(2) button");
  await uiClick(page, "#attachments > summary");
  await page.evaluate(() => testUI.querySelector('[data-remove="0"]').focus());
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => testUI.activeElement?.getAttribute("aria-label")),
    "Retirer l’élément 1",
  );
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => testUI.activeElement?.id), "attach");
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 0);
});
test("primary, typed request and extras follow the full workflow without changing the principal", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  const draft = "Aligner le principal avec les compléments.\nConserver les couleurs.";
  await page.evaluate(() => testUI.querySelector("#instruction").focus());
  await page.keyboard.insertText(draft);
  const originalSelector = await page.evaluate(() => testUI.querySelector("#selector").textContent);
  await addExtra(page, "#shadow-host button");
  await addExtra(page, ".cards article:nth-child(2) button");
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 2);
  assert.equal(await page.evaluate(() => testUI.querySelector("#instruction").value), draft);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#selector").textContent),
    originalSelector,
  );
  assert.equal(await page.evaluate(() => applicationClicks), 0);
  const context = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(context, /## Élément principal/);
  assert.match(context, /## Élément supplémentaire 1/);
  assert.match(context, /## Élément supplémentaire 2/);
  assert.match(context, /Choisir Essentiel/);
  assert.match(context, /Choisir Équipe/);
  assert.match(context, /shadowRoot/);
  assert.ok(context.includes(draft));
  assert.equal(context.match(/Modification demandée/g).length, 1);
  assert.equal(await copyFrom(page, "#copy-content", "Contenu copié"), "Choisir Essentiel");
  assert.equal(await copyFrom(page, "#copy-selector", "Sélecteur copié"), originalSelector);
  assert.equal(
    await copyFrom(page, "#copy-html", "Extrait HTML copié"),
    '<button class="buy" data-testid="buy-essential">Choisir Essentiel</button>',
  );
  await uiClick(page, '[data-view="0"]');
  assert.equal(await copyFrom(page, "#copy-content", "Contenu copié"), "Choisir Essentiel");
  await page.screenshot({ path: path.join(root, "tests", "preview-multiple.png") });
  await uiClick(page, '[data-remove="0"]');
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  const removed = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.doesNotMatch(removed, /Bouton dans un composant/);
  assert.match(removed, /Choisir Équipe/);
  await uiClick(page, "#clear-all");
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 0);
  assert.equal(await page.evaluate(() => testUI.querySelector("#instruction").value), draft);
  assert.equal(await copyFrom(page, "#copy-content", "Contenu copié"), "Choisir Essentiel");
});
test("changing target resets principal and extras; canceling an addition preserves the request", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await page.evaluate(() => (testUI.querySelector("#instruction").value = "Ma demande conservée"));
  await addExtra(page, "#shadow-host button");
  await uiClick(page, "#attach");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("html-locator-overlay").count(), 1);
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  await uiClick(page, "#restart");
  assert.equal(await page.evaluate(() => testUI.querySelector("#result").hidden), true);
  assert.equal(await page.evaluate(() => testUI.querySelector("#copy-ai").hidden), true);
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 0);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#instruction").value),
    "Ma demande conservée",
  );
  await page.locator("h1").click();
  const context = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(context, /Choisissez votre formule/);
  assert.doesNotMatch(context, /Choisir Essentiel|Bouton dans un composant|Élément supplémentaire/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("html-locator-overlay").count(), 0);
});
test("duplicates are rejected; reinjection preserves the principal, extras and request", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await page.evaluate(() => (testUI.querySelector("#instruction").value = "Comparer les styles"));
  await addExtra(page, '[data-testid="buy-essential"]');
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 0);
  assert.match(await page.evaluate(() => testUI.querySelector(".feedback").textContent), /déjà/);
  await page.locator("#shadow-host button").click();
  await addExtra(page, "#shadow-host button");
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  await uiClick(page, "#cancel-add");
  await page.addScriptTag({ path: path.join(root, ".test-build", "locator.js") });
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(await page.locator("html-locator-overlay").count(), 1);
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#instruction").value),
    "Comparer les styles",
  );
  assert.equal(await copyFrom(page, "#copy-content", "Contenu copié"), "Choisir Essentiel");
  await page.evaluate(() => document.querySelector("#shadow-host").remove());
  const context = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(context, /a disparu de la page/);
  assert.match(context, /Bouton dans un composant/);
  const extras = await copyFrom(page, "#copy-all", "Éléments attachés copiés");
  assert.doesNotMatch(extras, /Choisir Essentiel/);
  assert.match(extras, /Bouton dans un composant/);
});
test("removed principal reports unavailable content and keeps its snapshot in AI context", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await page.evaluate(() => document.querySelector('[data-testid="buy-essential"]').remove());
  await uiClick(page, "#copy-content");
  assert.match(await page.evaluate(() => testUI.querySelector(".feedback").textContent), /disparu/);
  const context = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(context, /Élément principal/);
  assert.match(context, /a disparu de la page/);
  assert.match(context, /Choisir Essentiel/);
});
test("green extra highlights track geometry and are removed with the attachments", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  await addExtra(page, "#shadow-host button");
  await addExtra(page, ".cards article:nth-child(2) button");
  const styles = await page.evaluate(() => ({
    button: getComputedStyle(testUI.querySelector("#attach")).backgroundColor,
    borders: [...testUI.querySelectorAll(".attachment-highlight")].map(
      (el) => getComputedStyle(el).borderColor,
    ),
    numbers: [...testUI.querySelectorAll(".attachment-number")].map((el) => el.textContent),
  }));
  assert.deepEqual(styles.borders, [styles.button, styles.button]);
  assert.deepEqual(styles.numbers, ["1", "2"]);
  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
    const extra = document.querySelector("#shadow-host").shadowRoot.querySelector("button");
    extra.style.transform = "translateX(45px)";
    extra.style.width = "280px";
    window.scrollTo(0, 100);
  });
  await page.waitForFunction(() => {
    const expected = document
      .querySelector("#shadow-host")
      .shadowRoot.querySelector("button")
      .getBoundingClientRect();
    const overlay = testUI.querySelector(".attachment-highlight");
    const actual = overlay.getBoundingClientRect();
    return (
      !overlay.hidden &&
      Math.abs(actual.left - expected.left) < 1 &&
      Math.abs(actual.top - expected.top) < 1 &&
      Math.abs(actual.width - expected.width) < 1
    );
  });
  await uiClick(page, '[data-remove="0"]');
  assert.equal(
    await page.evaluate(() => testUI.querySelectorAll(".attachment-highlight").length),
    1,
  );
  assert.equal(
    await page.evaluate(() => testUI.querySelector(".attachment-number").textContent),
    "1",
  );
  await page.evaluate(() => document.querySelector(".cards article:nth-child(2) button").remove());
  await page.waitForFunction(() => testUI.querySelector(".attachment-highlight").hidden);
  await uiClick(page, "#clear-all");
  assert.equal(
    await page.evaluate(() => testUI.querySelectorAll(".attachment-highlight").length),
    0,
  );
  await addExtra(page, "#shadow-host button");
  await uiClick(page, "#restart");
  assert.equal(
    await page.evaluate(() => testUI.querySelectorAll(".attachment-highlight").length),
    0,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("html-locator-overlay").count(), 0);
});

test("legacy session migration preserves the draft and live targets", async (t) => {
  const page = await setup(t);
  await page.evaluate(() => {
    window.__htmlLocator = {
      getState: () => ({
        primary: { element: document.querySelector('[data-testid="buy-essential"]') },
        attachments: [
          { element: document.querySelector("#shadow-host").shadowRoot.querySelector("button") },
        ],
        instruction: "Conserver cette demande pendant la migration",
        attachmentsOpen: true,
      }),
      close: () => {
        window.legacyClosed = true;
      },
    };
  });
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(await page.evaluate(() => legacyClosed), true);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#instruction").value),
    "Conserver cette demande pendant la migration",
  );
  assert.equal(await page.evaluate(() => testUI.querySelectorAll("#attachment-list li").length), 1);
  assert.equal(await copyFrom(page, "#copy-content", "Contenu copié"), "Choisir Essentiel");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => typeof __htmlLocator), "undefined");
});

test("collapsed preference and draft survive reinjection using keyboard interaction", async (t) => {
  const page = await setup(t, true);
  await page.locator('[data-testid="buy-essential"]').click();
  assert.equal(await page.evaluate(() => testUI.querySelector("#attachments").open), false);
  await clickPanelElement(page, "#attachments > summary");
  await page.waitForFunction(() => testUI.querySelector("#attachments").open);
  await page.evaluate(() => testUI.querySelector("#instruction").focus());
  await page.keyboard.insertText("Brouillon conservé");
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(await page.evaluate(() => testUI.querySelector("#attachments").open), true);
  assert.equal(
    await page.evaluate(() => testUI.querySelector("#instruction").value),
    "Brouillon conservé",
  );
  await page.evaluate(() => testUI.querySelector("#attachments > summary").focus());
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !testUI.querySelector("#attachments").open);
  await page.addScriptTag({ path: path.join(root, "content.js") });
  assert.equal(await page.evaluate(() => testUI.querySelector("#attachments").open), false);
});

test("page inspector reads framework metadata across the isolated-world boundary", async (t) => {
  const page = await setup(t);
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="buy-essential"]');
    button.className = "custom-brand flex p-4 hover:bg-blue-500";
    function PriceButton() {}
    function PricingPage() {}
    button.__reactFiber$test = {
      type: "button",
      return: {
        type: PriceButton,
        _debugSource: { fileName: "/src/PriceButton.tsx" },
        return: { type: PricingPage },
      },
    };
    button.__vueParentComponent = {
      type: { __name: "VueButton", __file: "/src/VueButton.vue" },
      parent: { type: { name: "VuePage" } },
    };
    class AngularButton {}
    class AngularPage {}
    const angularButton = new AngularButton();
    const angularPage = new AngularPage();
    window.ng = {
      getComponent: (element) => (element === button ? angularButton : null),
      getOwningComponent: (element) => (element === button ? angularPage : null),
    };
  });
  const cdp = await page.context().newCDPSession(page);
  const { frameTree } = await cdp.send("Page.getFrameTree");
  const { executionContextId } = await cdp.send("Page.createIsolatedWorld", {
    frameId: frameTree.frame.id,
    worldName: "extension-test",
  });
  const isolated = await cdp.send("Runtime.evaluate", {
    contextId: executionContextId,
    expression: `document.querySelector('[data-testid="buy-essential"]').__reactFiber$test`,
  });
  assert.equal(isolated.result.type, "undefined");
  await page.addScriptTag({ path: path.join(root, "page-inspector.js") });
  const result = await page.evaluate(() => __cadranoteInspect(['[data-testid="buy-essential"]']));
  assert.deepEqual(
    result.components.map(({ framework, hierarchy }) => [framework, hierarchy]),
    [
      ["React", ["PriceButton", "PricingPage"]],
      ["Vue", ["VueButton", "VuePage"]],
      ["Angular", ["AngularButton", "AngularPage"]],
    ],
  );
  assert.equal(result.components[0].source, "/src/PriceButton.tsx");
  assert.equal(result.components[1].source, "/src/VueButton.vue");
  assert.equal(result.components[2].source, null);
  assert.deepEqual(result.utilities, ["flex", "p-4", "hover:bg-blue-500"]);
  await cdp.detach();
});

test("inspection handles shadow roots, missing metadata and cyclic framework internals", async (t) => {
  const page = await setup(t);
  await page.addScriptTag({ path: path.join(root, "page-inspector.js") });
  const result = await page.evaluate(() => {
    const button = document.querySelector("#shadow-host").shadowRoot.querySelector("button");
    const fiber = { type: function ShadowButton() {} };
    fiber.return = fiber;
    button.__reactFiber$test = fiber;
    Object.defineProperty(button, "__vueParentComponent", {
      get() {
        throw new Error("unavailable");
      },
    });
    return {
      shadow: __cadranoteInspect(["#shadow-host", "button"]),
      missing: __cadranoteInspect(["#missing"]),
      plain: __cadranoteInspect(["h1"]),
    };
  });
  assert.deepEqual(result.shadow.components[0].hierarchy, ["ShadowButton"]);
  assert.equal(result.missing.available, false);
  assert.deepEqual(result.plain.components, []);
});

test("copy waits for inspection and includes primary and removed supplement metadata", async (t) => {
  const page = await setup(t);
  await page.addScriptTag({ path: path.join(root, "page-inspector.js") });
  await page.evaluate(() => {
    const primary = document.querySelector('[data-testid="buy-essential"]');
    const supplement = document.querySelector("#shadow-host").shadowRoot.querySelector("button");
    primary.__vueParentComponent = { type: { name: "PrimaryComponent" } };
    supplement.__vueParentComponent = { type: { name: "SupplementComponent" } };
    window.chrome.runtime = {
      id: "test-extension",
      sendMessage: async ({ chain }) => {
        const result = __cadranoteInspect(chain);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return result;
      },
    };
  });
  await page.addScriptTag({ path: path.join(root, "content.js") });
  await page.locator('[data-testid="buy-essential"]').click();
  await uiClick(page, "#attach");
  await page.locator("#shadow-host button").click();
  await page.evaluate(() => document.querySelector("#shadow-host").remove());
  const copied = await copyFrom(page, "#copy-ai", "Contexte copié");
  assert.match(copied, /Vue : PrimaryComponent/);
  assert.match(copied, /Vue : SupplementComponent/);
  assert.match(copied, /a disparu/);
});

test("Angular production markers do not require debug APIs or Tailwind", async (t) => {
  const page = await setup(t);
  await page.addScriptTag({ path: path.join(root, "page-inspector.js") });
  const result = await page.evaluate(() => {
    const host = document.createElement("app-root");
    host.setAttribute("ng-version", "20.0.0");
    const button = document.createElement("button");
    button.id = "angular-production";
    host.append(button);
    document.body.append(host);
    const within = __cadranoteInspect(["#angular-production"]);
    const outside = __cadranoteInspect(["h1"]);
    host.remove();
    button.setAttribute("_ngcontent-ng-c123", "");
    document.body.append(button);
    return { within, outside, scoped: __cadranoteInspect(["#angular-production"]) };
  });
  assert.deepEqual(result.within.angular, { scope: "element", debugAvailable: false });
  assert.deepEqual(result.within.components, []);
  assert.deepEqual(result.within.utilities, []);
  assert.deepEqual(result.outside.angular, { scope: "page", debugAvailable: false });
  assert.deepEqual(result.scoped.angular, { scope: "element", debugAvailable: false });
});

test("Vue inline anonymous roots and production mount containers remain identifiable", async (t) => {
  const page = await setup(t);
  await page.addScriptTag({ path: path.join(root, "page-inspector.js") });
  const result = await page.evaluate(() => {
    const root = document.createElement("section");
    root.id = "vue-inline";
    root.innerHTML = '<button id="vue-child">Test</button>';
    document.body.append(root);
    root.__vue__ = { $options: {}, $parent: null };
    const vue2 = __cadranoteInspect(["#vue-child"]);
    delete root.__vue__;
    root.__vue_app__ = { _instance: null };
    root._vnode = { component: { type: { name: "InlineEditor" }, parent: null } };
    const vue3 = __cadranoteInspect(["#vue-child"]);
    delete root.__vue_app__;
    delete root._vnode;
    root.setAttribute("data-v-app", "");
    return {
      vue2,
      vue3,
      marker: __cadranoteInspect(["#vue-child"]),
      outside: __cadranoteInspect(["h1"]),
    };
  });
  assert.equal(result.vue2.components[0].framework, "Vue");
  assert.deepEqual(result.vue2.components[0].hierarchy, ["(composant sans nom exposé)"]);
  assert.deepEqual(result.vue3.components[0].hierarchy, ["InlineEditor"]);
  assert.deepEqual(result.marker.vue, { scope: "element" });
  assert.deepEqual(result.marker.components, []);
  assert.deepEqual(result.outside.vue, { scope: "page" });
});
