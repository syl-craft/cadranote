import { metadataText, read } from "./read-metadata";
import { unavailableInspection } from "./model";
import type { ComponentInfo, Inspection } from "./model";

export async function requestInspection(chain: readonly string[]): Promise<Inspection> {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return unavailableInspection;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response: unknown = await Promise.race([
      chrome.runtime.sendMessage({ type: "inspect-element", chain }),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), 1800);
      }),
    ]);
    return validateInspection(response);
  } catch {
    return unavailableInspection;
  } finally {
    clearTimeout(timer);
  }
}

export function validateInspection(value: unknown): Inspection {
  const components: ComponentInfo[] = [];
  const candidates = read(value, "components");
  if (Array.isArray(candidates)) {
    for (const candidate of candidates.slice(0, 3)) {
      const framework = read(candidate, "framework");
      const names = read(candidate, "hierarchy");
      if (!["React", "Vue", "Angular"].includes(String(framework)) || !Array.isArray(names))
        continue;
      const hierarchy = names
        .slice(0, 12)
        .map(metadataText)
        .filter((name): name is string => name !== null);
      if (hierarchy.length)
        components.push({
          framework: framework as ComponentInfo["framework"],
          hierarchy,
          source: metadataText(read(candidate, "source")),
        });
    }
  }
  const utilities = read(value, "utilities");
  const angular = read(value, "angular");
  const scope = read(angular, "scope");
  const vueScope = read(read(value, "vue"), "scope");
  return {
    ...(vueScope === "element" || vueScope === "page" ? { vue: { scope: vueScope } } : {}),
    ...(scope === "element" || scope === "page"
      ? { angular: { scope, debugAvailable: read(angular, "debugAvailable") === true } }
      : {}),
    components,
    utilities: Array.isArray(utilities)
      ? utilities
          .slice(0, 80)
          .map(metadataText)
          .filter((name): name is string => name !== null)
      : [],
    available: read(value, "available") === true,
  };
}
