const PREFERRED_ATTRIBUTES = ["data-testid", "data-test", "data-cy", "id", "name", "aria-label"];

export function findUniqueSelector(element: Element): string {
  const root = element.getRootNode() as ParentNode;
  const candidates = buildPreferredSelectors(element);
  const preferredSelector = candidates.find((selector) => uniquelyMatches(root, selector, element));

  if (preferredSelector) return preferredSelector;

  let selector = describePathSegment(element);
  let ancestor = element.parentElement;

  while (!uniquelyMatches(root, selector, element) && ancestor) {
    if (ancestor.id) {
      const anchoredSelector = `#${CSS.escape(ancestor.id)} > ${selector}`;
      if (uniquelyMatches(root, anchoredSelector, element)) return anchoredSelector;
    }

    selector = `${describePathSegment(ancestor)} > ${selector}`;
    ancestor = ancestor.parentElement;
  }

  return selector;
}

export function buildSelectorChain(element: Element): string[] {
  const selectors: string[] = [];
  let currentElement: Element | null = element;

  while (currentElement) {
    selectors.unshift(findUniqueSelector(currentElement));
    currentElement = findShadowHost(currentElement);
  }

  return selectors;
}

export function buildHtmlPath(element: Element): string {
  const segments: string[] = [];
  let currentElement: Element | null = element;

  while (currentElement) {
    segments.unshift(describePathSegment(currentElement));

    if (currentElement.parentElement) {
      currentElement = currentElement.parentElement;
      continue;
    }

    currentElement = findShadowHost(currentElement);
    if (currentElement) segments.unshift("#shadow-root (open)");
  }

  return segments.join(" > ");
}

export function findParentElement(element: Element): Element | null {
  return element.parentElement ?? findShadowHost(element);
}

function findShadowHost(element: Element): Element | null {
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function buildPreferredSelectors(element: Element): string[] {
  const tagName = CSS.escape(element.localName);
  const selectors: string[] = [];

  for (const attributeName of PREFERRED_ATTRIBUTES) {
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;

    selectors.push(
      attributeName === "id"
        ? `#${CSS.escape(attributeValue)}`
        : `${tagName}[${attributeName}=${quoteAttribute(attributeValue)}]`,
    );
  }

  const classNames = [...element.classList].slice(0, 6);
  selectors.push(...classNames.map((className) => `${tagName}.${CSS.escape(className)}`));

  if (classNames.length) {
    selectors.push(tagName + classNames.map((className) => `.${CSS.escape(className)}`).join(""));
  }

  selectors.push(tagName);
  return selectors;
}

function uniquelyMatches(root: ParentNode, selector: string, expectedElement: Element): boolean {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === expectedElement;
  } catch {
    return false;
  }
}

function describePathSegment(element: Element): string {
  const siblings = Array.from(element.parentNode?.children ?? []);
  const siblingsWithSameTag = siblings.filter((sibling) => sibling.localName === element.localName);
  const tagName = CSS.escape(element.localName);

  return siblingsWithSameTag.length > 1
    ? `${tagName}:nth-of-type(${siblingsWithSameTag.indexOf(element) + 1})`
    : tagName;
}

function quoteAttribute(value: string): string {
  const escapedValue = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r\f]/g, (character) => `\\${character.charCodeAt(0).toString(16)} `);

  return `"${escapedValue}"`;
}
