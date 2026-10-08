# Cadranote

<img src="src/ui/logo.svg" alt="Cadranote" width="64" height="64" />

English · [Français](README.fr.md)

Select elements on a web page and copy their context for an AI assistant: selectors, HTML, your request and reference elements.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/01-target-en.gif" alt="Demo: Alt+C opens the panel, hovering outlines elements, a click selects the button and shows its unique CSS selector" width="960">

## Install

With Node.js 22 and Chrome:

```sh
npm ci
npm run build
```

In `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the project folder.

## Use

The interface is in French; button labels are quoted as they appear, with a translation.

1. Click the extension or press **Alt+C**.
2. Select the main element and write your request.
3. Add reference elements if needed.
4. Click **Copier le contexte pour une IA** (copy the context for an AI), then paste it into your assistant.

**Changer de cible** (change target) clears the elements but keeps your request. Copying the content, HTML or selector applies to the main element only. **Esc** cancels an addition or closes the panel.

To reach an element hidden by the panel, drag its header. The double-arrow button also moves it to the top or bottom right.

Extension already installed: if Chrome keeps the old shortcut, assign **Alt+C** in `chrome://extensions/shortcuts`.

## In action

**Describe** — your request travels with the targeted element.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/02-describe-en.gif" alt="Demo: the request is typed into the panel's request field" width="960">

**Reference** — **Ajouter un élément** (add an element) numbers references in green.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/03-reference-en.gif" alt="Demo: two buttons are added as reference elements, outlined in green and numbered 1 and 2" width="960">

**Copy** — one message to paste into your assistant.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/04-copy-en.gif" alt="Demo: the copy button is clicked, then the full context is pasted into an AI assistant" width="960">

**Inspect** — components and classes, when the page exposes them.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/05-inspect-en.gif" alt="Demo: the components and styles section shows the component hierarchy and Tailwind classes" width="960">

**Stay in control** — the panel moves aside, nothing leaves the browser.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/06-panel-en.gif" alt="Demo: the panel is dragged by its header to reveal a hidden card, then the local-only copy notice is highlighted" width="960">

## Good to know

- React, Vue and Angular: component information when available. Tailwind: hints based on class names. Detection is limited in production builds.
- Open Shadow DOM is supported; iframe contents and protected Chrome pages are excluded.
- Everything runs locally: nothing is sent to an AI, no history is kept. Closing the panel or reloading the page clears the session.
- Copied content comes from the page: review it before sharing.

## Develop

TypeScript sources live in `src/`. After a change: `npm run build`, then reload the extension and the page.

| Command | Purpose |
| --- | --- |
| `npm run check` | Types and formatting |
| `npm test` | Session and browser tests |
| `npm run package` | Checks, then Chrome/Edge, Firefox and sources ZIPs in `dist/` |
| `npm run icons` | Generate the Chrome icons |
| `npm run docs:capture` | Refresh the screenshots |
| `node tools/motion-demo/render.mjs` | Render the animated demos |

GitHub Actions checks every push and provides the ZIPs as an artifact. A `vX.Y.Z` tag publishes to the Chrome, Firefox and Edge stores: see [Publishing](docs/PUBLICATION.md) (French). Generated bundles are not versioned. The demos are rendered into the [cadranote-media](https://github.com/syl-craft/cadranote-media) repository, cloned next to this one.

[Architecture](ARCHITECTURE.md) (French) · [Visual identity](docs/IDENTITY.md) (French) · [Demo page](docs/demo.html)
