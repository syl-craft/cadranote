// Rend les clips de motion.html en MP4 1920 × 1080 (30 i/s, 10 s) et en GIF 960 × 540,
// directement dans le dépôt cadranote-media cloné à côté de celui-ci.
//
//   node tools/motion-demo/render.mjs                         tout, en anglais et en français
//   node tools/motion-demo/render.mjs --clip 03-reference --lang en
//   node tools/motion-demo/render.mjs --clip 01-target --stills 1.5,5,7   images clés en PNG
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { parseArgs } from "node:util";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MEDIA = resolve(process.env.CADRANOTE_MEDIA_DIR ?? join(ROOT, "../cadranote-media/videos"));
const STILLS = join(tmpdir(), "cadranote-stills");
const FPS = 30;
const DURATION = 10;
const CLIPS = ["01-target", "02-describe", "03-reference", "04-copy", "05-inspect", "06-panel"];
const LANGS = ["en", "fr"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const { values: options } = parseArgs({
  options: { clip: { type: "string" }, lang: { type: "string" }, stills: { type: "string" } },
});
const clips = options.clip ? [options.clip] : CLIPS;
const langs = options.lang ? [options.lang] : LANGS;
for (const clip of clips) if (!CLIPS.includes(clip)) throw new Error(`Clip inconnu : ${clip}`);

const server = createServer(async (request, response) => {
  try {
    const path = normalize(join(ROOT, decodeURIComponent(new URL(request.url, "http://x").pathname)));
    if (!path.startsWith(ROOT)) throw new Error("Hors du dépôt");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": `${TYPES[extname(path)] ?? "application/octet-stream"}; charset=utf-8` });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
await mkdir(options.stills ? STILLS : MEDIA, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  // Le panneau suit le thème du système : les clips le montrent en thème clair.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
  for (const clip of clips) {
    for (const lang of langs) {
      const scene = CLIPS.indexOf(clip) + 1;
      await page.goto(
        `http://127.0.0.1:${server.address().port}/tools/motion-demo/motion.html?scene=${scene}&lang=${lang}&render`,
      );
      await page.waitForFunction(() => window.ready);
      await page.evaluate(() => document.fonts.ready);
      const name = `${clip}-${lang}`;

      if (options.stills) {
        for (const t of options.stills.split(",").map(Number)) {
          await page.evaluate((t) => window.seek(t), t);
          await page.screenshot({ path: join(STILLS, `${name}-t${t}.png`) });
        }
        console.log(`Images clés : ${join(STILLS, name)}-t*.png`);
        continue;
      }

      const mp4 = join(MEDIA, `${name}.mp4`);
      await ffmpeg(
        ["-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
          "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4],
        async (stdin) => {
          for (let frame = 0; frame < FPS * DURATION; frame++) {
            await page.evaluate((t) => window.seek(t), frame / FPS);
            const image = await page.screenshot({ type: "png" });
            if (!stdin.write(image)) await new Promise((drained) => stdin.once("drain", drained));
          }
        },
      );
      // Palette par clip : les aplats du panneau restent nets, le tramage se limite aux dégradés.
      await ffmpeg(["-i", mp4, "-vf",
        "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
        "-loop", "0", join(MEDIA, `${name}.gif`)]);
      console.log(`${name} : MP4 et GIF dans ${MEDIA}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

async function ffmpeg(args, feed) {
  const child = spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: [feed ? "pipe" : "ignore", "inherit", "inherit"],
  });
  const done = new Promise((ok, fail) =>
    child.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg a échoué (${code})`)))),
  );
  if (feed) {
    await feed(child.stdin);
    child.stdin.end();
  }
  await done;
}
