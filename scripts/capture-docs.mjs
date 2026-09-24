import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";

const demo = await readFile(new URL("../docs/demo.html", import.meta.url));
const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(demo);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/formules`);
  // Expose the closed ShadowRoot to the capture script.
  await page.evaluate(() => {
    const attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = attachShadow.call(this, options);
      if (this.localName === "html-locator-overlay") window.captureUI = root;
      return root;
    };
  });
  await page.addScriptTag({ path: "content.js" });
  await page.getByTestId("choose-essential").click();
  const instruction = await panelElement(page, "#instruction");
  await instruction.fill(
    "Donner au bouton Essentiel le même style que les boutons Équipe et Studio.",
  );
  await page.mouse.move(10, 10);
  await mkdir("docs/images", { recursive: true });
  const panel = await panelElement(page, ".panel");
  await panel.screenshot({ path: "docs/images/panel-cadranote.png" });

  await (await panelElement(page, "#attachments > summary")).click();
  for (const target of ["choose-team", "choose-studio"]) {
    await (await panelElement(page, "#attach")).click();
    await page.getByTestId(target).click();
  }
  await (await panelElement(page, "#copy-ai")).click();
  await page.waitForFunction(() =>
    captureUI.querySelector(".feedback").textContent.includes("Contexte copié"),
  );
  const context = await page.evaluate(() => navigator.clipboard.readText());
  for (const target of ["choose-essential", "choose-team", "choose-studio"]) {
    assert.ok(context.includes(target));
  }
  await page.mouse.move(10, 10);
  await page.screenshot({ path: "docs/images/example-cadranote.png" });

  await page.setViewportSize({ width: 375, height: 812 });
  const compactPanel = await page.evaluate(() => {
    const panel = captureUI.querySelector(".panel");
    const bounds = panel.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      scrollWidth: panel.scrollWidth,
      clientWidth: panel.clientWidth,
    };
  });
  assert.ok(compactPanel.left >= 0 && compactPanel.right <= 375);
  assert.equal(compactPanel.scrollWidth, compactPanel.clientWidth);
  await mkdir("test-results", { recursive: true });
  await panel.screenshot({ path: "test-results/panel-narrow.png" });
  await page.context().close();
} finally {
  await browser?.close();
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

console.log("Captures du panneau, du scénario et de la fenêtre étroite générées.");

async function panelElement(page, selector) {
  const handle = await page.evaluateHandle(
    (selector) => captureUI.querySelector(selector),
    selector,
  );
  return handle.asElement();
}
