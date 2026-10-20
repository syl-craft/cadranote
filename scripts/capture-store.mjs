// Images des fiches de store dans docs/store/ : captures 1280 × 800 et vignettes promotionnelles,
// en français puis en anglais (suffixe -en). Lancer après npm run build : node scripts/capture-store.mjs
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";

const OUT = "docs/store";
const demo = await readFile(new URL("../docs/demo.html", import.meta.url));
const logo = await readFile(new URL("../src/ui/logo.svg", import.meta.url), "utf8");
const LANGUAGES = {
  fr: {
    locale: "fr-FR",
    suffix: "",
    shots: ["screenshot-1-cibler", "screenshot-2-references", "screenshot-3-theme-sombre"],
    instruction:
      "Donner au bouton du projet Lumen le même style que ceux des projets Rivage et Atlas.",
    copied: "Contexte copié",
    tagline: "De la page à la consigne.",
    pitch: "Ciblez, décrivez, copiez pour l’IA.",
  },
  en: {
    locale: "en-US",
    suffix: "-en",
    shots: ["screenshot-1-target", "screenshot-2-references", "screenshot-3-dark-theme"],
    instruction: "Give the Lumen project button the same style as the Rivage and Atlas buttons.",
    copied: "Context copied",
    tagline: "From the page to the prompt.",
    pitch: "Target, describe, copy for AI.",
  },
};
// Textes de docs/demo.html traduits pour les captures en anglais, clés aux espaces normalisés.
const DEMO_EN = {
  Projets: "Projects",
  "DESIGN PRODUIT · IDENTITÉ · DATA": "PRODUCT DESIGN · IDENTITY · DATA",
  "Des interfaces": "Interfaces",
  qui: "that",
  racontent: "tell",
  "quelque chose.": "a story.",
  "Orée est un studio de design indépendant. Nous dessinons des produits, des identités et des visualisations de données, de la première esquisse au lancement.":
    "Orée is an independent design studio. We design products, identities and data visualizations, from the first sketch to launch.",
  "Produit · iOS": "Product · iOS",
  "Une application de méditation qui guide par la respiration.":
    "A meditation app that guides you through your breathing.",
  "Découvrir Lumen": "Discover Lumen",
  "Identité · Print": "Identity · Print",
  "L’identité complète d’un hôtel posé face à l’océan.":
    "The complete identity of a hotel facing the ocean.",
  "Découvrir Rivage": "Discover Rivage",
  "Un tableau de bord qui rend lisibles les données du climat.":
    "A dashboard that makes climate data readable.",
  "Découvrir Atlas": "Discover Atlas",
  "+1,4 °C": "+1.4 °C",
  "Rétention de Lumen à 30 jours": "Lumen 30-day retention",
  "+38 %": "+38%",
  "Projets livrés depuis 2021": "Projects delivered since 2021",
  "Répartition des missions": "Project mix",
  "Produit 45 %": "Product 45%",
  "Identité 30 %": "Identity 30%",
  "Data 25 %": "Data 25%",
};

const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(demo);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
await mkdir(OUT, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });

  for (const [language, text] of Object.entries(LANGUAGES))
    for (const colorScheme of ["light", "dark"]) {
      // 1600 × 1000 réduit à 0,8 : la page de démo tient à côté du panneau, image de 1280 × 800.
      // Le panneau suit la langue du navigateur.
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 0.8,
        colorScheme,
        locale: text.locale,
        permissions: ["clipboard-read", "clipboard-write"],
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/projets`);
      if (language === "en") await page.evaluate(translateDemo, DEMO_EN);
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
      await (await ui("#instruction")).asElement().fill(text.instruction);
      await page.mouse.move(5, 5);
      if (colorScheme === "light")
        await page.screenshot({ path: `${OUT}/${text.shots[0]}${text.suffix}.png` });

      await (await ui("#attachments > summary")).asElement().click();
      for (const target of ["open-rivage", "open-atlas"]) {
        await (await ui("#attach")).asElement().click();
        await page.getByTestId(target).click();
      }
      await (await ui("#copy-ai")).asElement().click();
      await page.waitForFunction(
        (copied) => captureUI.querySelector(".feedback").textContent.includes(copied),
        text.copied,
      );
      await page.mouse.move(5, 5);
      await page.screenshot({
        path: `${OUT}/${text.shots[colorScheme === "light" ? 1 : 2]}${text.suffix}.png`,
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

  for (const text of Object.values(LANGUAGES))
    for (const { name, width, height, scale } of tiles) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(promoTile(scale, text));
      await page.screenshot({ path: `${OUT}/${name}${text.suffix}.png` });
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

/** Remplace les textes de la page de démo en gardant les espaces autour de chaque texte. */
function translateDemo(translations) {
  document.documentElement.lang = "en";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const normalized = node.textContent.replace(/\s+/g, " ");
    const translation = translations[normalized.trim()];
    if (!translation) continue;
    const [, before, , after] = normalized.match(/^(\s*)(.*?)(\s*)$/);
    node.textContent = before + translation + after;
  }
}

function promoTile(scale, { tagline, pitch }) {
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
  </style>${logo}<div><h1>Cadranote</h1><p>${tagline}<br><em>${pitch}</em></p></div>`;
}
