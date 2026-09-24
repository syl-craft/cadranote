const EXCLUDED_TAGS = new Set(["script", "style", "noscript", "html-locator-overlay"]);
const EXCLUDED_TEXT_SELECTOR =
  "input, textarea, select, script, style, noscript, html-locator-overlay";
const HTML_NODE_LIMIT = 70;
const HTML_DEPTH_LIMIT = 4;
const HTML_CHARACTER_LIMIT = 6000;
const TEXT_PREVIEW_LIMIT = 240;

export function extractHtmlPreview(element: Element): string {
  let remainingNodes = HTML_NODE_LIMIT;

  function copyNode(node: Node, depth: number): Node | null {
    if (remainingNodes-- <= 0) return document.createComment(" extrait tronqué ");

    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode((node.textContent ?? "").slice(0, 400));
    }

    if (!(node instanceof Element) || EXCLUDED_TAGS.has(node.localName)) return null;

    const copiedElement = node.cloneNode(false) as Element;
    removePrivateAttributes(copiedElement);

    // Exclude initial textarea values as well as edits.
    if (node.localName === "textarea") return copiedElement;

    if (depth >= HTML_DEPTH_LIMIT && node.childNodes.length) {
      copiedElement.append(document.createComment(" … "));
      return copiedElement;
    }

    for (const child of node.childNodes) {
      if (remainingNodes <= 0) {
        copiedElement.append(document.createComment(" extrait tronqué "));
        break;
      }

      const copiedChild = copyNode(child, depth + 1);
      if (copiedChild) copiedElement.append(copiedChild);
    }

    return copiedElement;
  }

  const copiedElement = copyNode(element, 0);
  const html =
    copiedElement instanceof Element ? copiedElement.outerHTML : "<!-- contenu non exporté -->";

  return html.length > HTML_CHARACTER_LIMIT
    ? `${html.slice(0, HTML_CHARACTER_LIMIT)}\n<!-- extrait tronqué -->`
    : html;
}

export function extractTextPreview(element: Element): string {
  return extractText(element, TEXT_PREVIEW_LIMIT, 600);
}

export function extractFullText(element: Element): string {
  return extractText(element, Infinity, Infinity);
}

function extractText(element: Element, characterLimit: number, nodeLimit: number): string {
  if (element.closest(EXCLUDED_TEXT_SELECTOR)) return "";

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node instanceof Element) {
          return node.matches(EXCLUDED_TEXT_SELECTOR)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_SKIP;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const fragments: string[] = [];
  let characterCount = 0;
  let visitedNodes = 0;
  let textNode = walker.nextNode();

  while (textNode && characterCount < characterLimit && visitedNodes < nodeLimit) {
    const fragment = (textNode.textContent ?? "").slice(0, characterLimit);
    fragments.push(fragment);
    characterCount += fragment.length + 1;
    visitedNodes += 1;
    textNode = walker.nextNode();
  }

  return fragments.join(" ").replace(/\s+/g, " ").trim().slice(0, characterLimit);
}

function removePrivateAttributes(element: Element): void {
  for (const attribute of [...element.attributes]) {
    if (/^on/i.test(attribute.name) || ["value", "srcdoc", "nonce"].includes(attribute.name)) {
      element.removeAttribute(attribute.name);
    }
  }
}
