import { inspectElement } from "../inspection/inspect-element";
import { unavailableInspection } from "../inspection/model";
import type { Inspection } from "../inspection/model";

declare global {
  interface Window {
    __cadranoteInspect?: (chain: readonly string[]) => Inspection;
  }
}

window.__cadranoteInspect = (chain) => {
  let root: Document | ShadowRoot = document;
  let element: Element | null = null;
  for (const [index, selector] of chain.entries()) {
    element = root.querySelector(selector);
    if (!element) return unavailableInspection;
    if (index < chain.length - 1) {
      if (!element.shadowRoot) return unavailableInspection;
      root = element.shadowRoot;
    }
  }
  return element ? inspectElement(element) : unavailableInspection;
};
