import panelMarkup from "./panel.html";
import panelStyles from "./panel.css";
import logoMarkup from "./logo.svg";

export interface Overlay {
  readonly host: HTMLElement;
  readonly root: ShadowRoot;
  containsEvent(event: Event): boolean;
  dispose(): void;
}

export function createOverlay(): Overlay {
  const host = document.createElement("html-locator-overlay");
  host.style.cssText = [
    "all:initial!important",
    "position:fixed!important",
    "inset:0!important",
    "z-index:2147483647!important",
    "pointer-events:none!important",
    "display:block!important",
    "color-scheme:dark!important",
  ].join(";");

  const root = host.attachShadow({ mode: "closed" });
  const stylesheet = document.createElement("style");
  stylesheet.textContent = panelStyles;

  // Bundled template; do not interpolate page content.
  root.innerHTML = panelMarkup;
  root.querySelector(".logo")!.innerHTML = logoMarkup;
  root.prepend(stylesheet);
  document.documentElement.append(host);

  return {
    host,
    root,
    containsEvent: (event) => event.composedPath().includes(host),
    dispose: () => host.remove(),
  };
}
