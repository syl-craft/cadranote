// Construit les archives des stores dans dist/ :
//   cadranote-chrome.zip   Chrome Web Store et Edge Add-ons
//   cadranote-firefox.zip  Firefox (AMO), manifeste adapté
//   cadranote-sources.zip  sources demandées par AMO pour relire le code bundlé
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const EXTENSION_FILES = [
  "background.js",
  "content.js",
  "page-inspector.js",
  "unavailable.html",
  "help.css",
  "icons",
];
const FIREFOX_ID = "cadranote@syl-craft";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (manifest.version !== version)
  throw new Error(`Versions différentes : manifest ${manifest.version}, package ${version}`);

const files = await listFiles(EXTENSION_FILES);
await mkdir("dist", { recursive: true });
await writeZip("dist/cadranote-chrome.zip", [manifestEntry(manifest), ...files]);
await writeZip("dist/cadranote-firefox.zip", [manifestEntry(firefoxManifest(manifest)), ...files]);

const sources = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((path) => path && !path.startsWith("docs/images/"));
await writeZip("dist/cadranote-sources.zip", await listFiles(sources));

console.log(`Archives ${version} : dist/cadranote-{chrome,firefox,sources}.zip`);

/** Firefox n’accepte pas de service worker en arrière-plan et exige un identifiant. */
function firefoxManifest({ background: { service_worker, ...background }, ...rest }) {
  return {
    ...rest,
    background: { ...background, scripts: [service_worker] },
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_ID,
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
    },
  };
}

function manifestEntry(content) {
  return { path: "manifest.json", data: Buffer.from(JSON.stringify(content, null, 2) + "\n") };
}

async function listFiles(paths) {
  const entries = [];
  for (const path of paths) {
    if ((await stat(path)).isDirectory()) {
      const children = (await readdir(path)).sort().map((name) => join(path, name));
      entries.push(...(await listFiles(children)));
    } else {
      entries.push({ path: path.replaceAll("\\", "/"), data: await readFile(path) });
    }
  }
  return entries;
}

/** ZIP minimal (deflate), dates fixes pour que deux constructions donnent la même archive. */
async function writeZip(target, entries) {
  const DOS_DATE = (1 << 5) | 1; // 1980-01-01
  const local = [];
  const central = [];
  let offset = 0;
  for (const { path, data } of entries) {
    const name = Buffer.from(path);
    const compressed = deflateRawSync(data, { level: 9 });
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // noms en UTF-8
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(DOS_DATE, 12);
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    header.copy(record, 8, 6, 30);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  await writeFile(target, Buffer.concat([...local, directory, end]));
}
