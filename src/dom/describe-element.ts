import type { ElementDescription } from "../domain/target";
import { extractHtmlPreview, extractTextPreview } from "./extract-content";
import { buildHtmlPath, buildSelectorChain } from "./selectors";

export function describeElement(element: Element): ElementDescription {
  const selectorChain = buildSelectorChain(element);
  const rectangle = element.getBoundingClientRect();

  return {
    chain: selectorChain,
    selector: selectorChain.join(" >>> "),
    javascript: buildJavaScriptLocator(selectorChain),
    path: buildHtmlPath(element),
    html: extractHtmlPreview(element),
    text: extractTextPreview(element),
    label: element.localName + (element.id ? `#${element.id}` : ""),
    dimensions: `${Math.round(rectangle.width)} × ${Math.round(rectangle.height)} px`,
    iframe: element.localName === "iframe",
  };
}

function buildJavaScriptLocator(selectors: readonly string[]): string {
  return selectors.reduce((expression, selector, index) => {
    const root = index === 0 ? expression : `${expression}.shadowRoot`;
    return `${root}.querySelector(${JSON.stringify(selector)})`;
  }, "document");
}
