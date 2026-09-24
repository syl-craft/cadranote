import type { ComponentInfo, Inspection } from "./model";
import { metadataText, parentElement, read } from "./read-metadata";

function vueInstance(element: Element): unknown {
  return (
    read(element, "__vueParentComponent") ??
    read(element, "__vue__") ??
    read(read(element, "_vnode"), "component") ??
    read(read(element, "__vue_app__"), "_instance")
  );
}

export function detectVue(element: Element): Inspection["vue"] {
  let current: Element | null = element;
  for (let depth = 0; current && depth < 60; depth++) {
    if (
      vueInstance(current) ||
      read(current, "__vue_app__") ||
      current.hasAttribute("data-v-app") ||
      current.getAttributeNames().some((name) => /^data-v-[\da-f]{6,}(?:-s)?$/i.test(name))
    )
      return { scope: "element" };
    current = parentElement(current);
  }
  return element.ownerDocument.querySelector("[data-v-app]") ? { scope: "page" } : undefined;
}

export function inspectVue(element: Element): ComponentInfo | null {
  let instance = vueInstance(element);
  const hierarchy: string[] = [];
  let source: string | null = null;
  const visited = new Set<unknown>();
  for (let depth = 0; instance && depth < 12 && !visited.has(instance); depth++) {
    visited.add(instance);
    const type = read(instance, "type") ?? read(instance, "$options");
    const name =
      metadataText(read(type, "name")) ??
      metadataText(read(type, "__name")) ??
      metadataText(read(type, "_componentTag"));
    if (type) hierarchy.push(name ?? "(composant sans nom exposé)");
    source ??= metadataText(read(type, "__file"));
    instance = read(instance, "parent") ?? read(instance, "$parent");
  }
  return hierarchy.length ? { framework: "Vue", hierarchy, source } : null;
}
