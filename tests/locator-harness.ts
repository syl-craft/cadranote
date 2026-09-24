import { describeElement } from "../src/dom/describe-element";
import { extractFullText } from "../src/dom/extract-content";
import { buildHtmlPath, buildSelectorChain, findUniqueSelector } from "../src/dom/selectors";
import { formatRequestContext } from "../src/export/format-context";
import type { ElementDescription } from "../src/domain/target";

// Exposed only in the test bundle.
Object.assign(globalThis, {
  HTMLLocatorCore: {
    selectorFor: findUniqueSelector,
    chainFor: buildSelectorChain,
    pathFor: buildHtmlPath,
    describe: describeElement,
    contentFor: extractFullText,
    promptFor(description: ElementDescription, instruction = "") {
      return formatRequestContext(
        [
          {
            target: {
              id: "test",
              description,
              pageUrl: `${location.origin}${location.pathname}`,
              pageTitle: document.title,
            },
            role: "Élément principal",
            isConnected: true,
          },
        ],
        instruction,
      );
    },
  },
});
