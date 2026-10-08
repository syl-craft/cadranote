// Images des fiches de store dans docs/store/ : captures 1280 × 800 et vignettes promotionnelles.
// Lancer après npm run build : node scripts/capture-store.mjs
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";

const OUT = "docs/store";
const demo = await readFile(new URL("../docs/demo.html", import.meta.url));
const logo = await readFile(new URL("../src/ui/logo.svg", import.meta.url), "utf8");
const INSTRUCTION =
  "Donner au bouton du projet Lumen le même style que ceux des projets Rivage et Atlas.";

const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(demo);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
await mkdir(OUT, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });

  for (const colorScheme of ["light", "dark"]) {
    // 1600 × 1000 réduit à 0,8 : la page de démo tient à côté du panneau, image de 1280 × 800.
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 0.8,
      colorScheme,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/projets`);
    await page.evaluate(() => {
      const attachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        const root = attachShadow.call(this, options);
        if (this.localName === "html-locator-overlay") window.captureUI = root;
        return root;
      };
    });
    await page.addScriptTag({ path: "content.js" });
    const ui = (selector) =>
      page.evaluateHandle((selector) => captureUI.querySelector(selector), selector);

    await page.getByTestId("open-lumen").click();
    await (await ui("#instruction")).asElement().fill(INSTRUCTION);
    await page.mouse.move(5, 5);
    if (colorScheme === "light") await page.screenshot({ path: `${OUT}/screenshot-1-cibler.png` });

    await (await ui("#attachments > summary")).asElement().click();
    for (const target of ["open-rivage", "open-atlas"]) {
      await (await ui("#attach")).asElement().click();
      await page.getByTestId(target).click();
    }
    await (await ui("#copy-ai")).asElement().click();
    await page.waitForFunction(() =>
      captureUI.querySelector(".feedback").textContent.includes("Contexte copié"),
    );
    await page.mouse.move(5, 5);
    await page.screenshot({
      path: `${OUT}/screenshot-${colorScheme === "light" ? "2-references" : "3-theme-sombre"}.png`,
    });
    await page.close();
  }

  const tiles = [
    { name: "promo-small", width: 440, height: 280, scale: 1 },
    { name: "promo-marquee", width: 1400, height: 560, scale: 2.2 },
  ];
  // Logo de fiche Edge, 300 × 300.
  const logoPage = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await logoPage.setContent(
    `<style>body{margin:0}svg{display:block;width:300px;height:300px}</style>${logo}`,
  );
  await logoPage.screenshot({ path: `${OUT}/logo-300.png`, omitBackground: true });
  await logoPage.close();

  for (const { name, width, height, scale } of tiles) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(promoTile(scale));
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

console.log(`Images des stores dans ${OUT}/`);

function promoTile(scale) {
  const px = (value) => `${value * scale}px`;
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; height: 100vh; display: flex; align-items: center; gap: ${px(22)};
      padding: 0 ${px(36)}; box-sizing: border-box; color: #f1f5fc;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(${px(320)} ${px(240)} at 85% 30%, #163563, transparent 70%), #0b1628; }
    svg { width: ${px(96)}; height: ${px(96)}; flex-shrink: 0; }
    h1 { margin: 0; font-size: ${px(44)}; letter-spacing: ${px(-1.5)}; line-height: 1; }
    p { margin: ${px(10)} 0 0; color: #b2c1d6; font-size: ${px(17)}; line-height: 1.35; }
    em { font-style: normal; color: #72b5ff; }
  </style>${logo}<div><h1>Cadranote</h1><p>De la page à la consigne.<br><em>Ciblez, décrivez, copiez pour l’IA.</em></p></div>`;
}
