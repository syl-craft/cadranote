export function read(value: unknown, key: string): unknown {
  if ((typeof value !== "object" || value === null) && typeof value !== "function")
    return undefined;
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

export function metadataText(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 300)
    : null;
}

export function propertyWithPrefix(element: Element, prefix: string): unknown {
  const key = Object.getOwnPropertyNames(element).find((name) => name.startsWith(prefix));
  return key ? read(element, key) : undefined;
}

export function parentElement(element: Element): Element | null {
  const root = element.getRootNode();
  return element.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
}
