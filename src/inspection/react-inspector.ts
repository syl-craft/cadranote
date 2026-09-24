import type { ComponentInfo } from "./model";
import { metadataText, propertyWithPrefix, read } from "./read-metadata";

export function inspectReact(element: Element): ComponentInfo | null {
  let fiber =
    propertyWithPrefix(element, "__reactFiber$") ??
    propertyWithPrefix(element, "__reactInternalInstance$");
  const hierarchy: string[] = [];
  let source: string | null = null;
  const visited = new Set<unknown>();
  for (let depth = 0; fiber && depth < 60 && !visited.has(fiber); depth++) {
    visited.add(fiber);
    const type = read(fiber, "type");
    if (typeof type !== "string") {
      const innerType = read(type, "render") ?? read(type, "type");
      const name =
        metadataText(read(type, "displayName")) ??
        metadataText(read(type, "name")) ??
        metadataText(read(innerType, "displayName")) ??
        metadataText(read(innerType, "name"));
      if (name && hierarchy.length < 12) hierarchy.push(name);
    }
    source ??= metadataText(read(read(fiber, "_debugSource"), "fileName"));
    fiber = read(fiber, "return");
  }
  return hierarchy.length ? { framework: "React", hierarchy, source } : null;
}
