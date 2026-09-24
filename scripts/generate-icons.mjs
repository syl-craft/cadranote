import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";

const logo = await readFile(new URL("../src/ui/logo.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body { margin: 0; } svg { display: block; }</style>${logo}`);
    await page.screenshot({ path: `icons/icon${size}.png`, omitBackground: true });
    console.log(`Icône ${size}px générée.`);
  }
  await page.context().close();
} finally {
  await browser.close();
}
