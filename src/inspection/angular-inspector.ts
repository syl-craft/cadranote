import type { ComponentInfo, Inspection } from "./model";
import { metadataText, parentElement, read } from "./read-metadata";

export function detectAngular(element: Element): Inspection["angular"] {
  const debug = read(window, "ng");
  const debugAvailable =
    typeof read(debug, "getComponent") === "function" ||
    typeof read(debug, "getOwningComponent") === "function";
  let current: Element | null = element;
  for (let depth = 0; current && depth < 60; depth++) {
    if (
      current.hasAttribute("ng-version") ||
      current.getAttributeNames().some((name) => /^_ng(?:host|content)-/.test(name))
    )
      return { scope: "element", debugAvailable };
    current = parentElement(current);
  }
  if (debugAvailable || element.ownerDocument.querySelector("[ng-version]"))
    return { scope: "page", debugAvailable };
  return undefined;
}

export function inspectAngular(element: Element): ComponentInfo | null {
  const debug = read(window, "ng");
  const getComponent = read(debug, "getComponent");
  const getOwner = read(debug, "getOwningComponent");
  if (typeof getComponent !== "function" && typeof getOwner !== "function") return null;
  const hierarchy: string[] = [];
  const visited = new Set<unknown>();
  let current: Element | null = element;
  for (let depth = 0; current && depth < 60 && hierarchy.length < 12; depth++) {
    for (const getter of [getComponent, getOwner]) {
      if (typeof getter !== "function") continue;
      let instance: unknown;
      try {
        instance = getter.call(debug, current);
      } catch {
        continue;
      }
      if (!instance || visited.has(instance)) continue;
      visited.add(instance);
      const name = metadataText(read(read(instance, "constructor"), "name"));
      if (name && name !== "Object") hierarchy.push(name);
    }
    current = parentElement(current);
  }
  return hierarchy.length ? { framework: "Angular", hierarchy, source: null } : null;
}
