import { detectAngular, inspectAngular } from "./angular-inspector";
import type { ComponentInfo, Inspection } from "./model";
import { parentElement } from "./read-metadata";
import { inspectReact } from "./react-inspector";
import { analyzeTailwind } from "./tailwind-analyzer";
import { detectVue, inspectVue } from "./vue-inspector";

export function inspectElement(element: Element): Inspection {
  const components: ComponentInfo[] = [];
  for (const inspector of [inspectReact, inspectVue]) {
    let current: Element | null = element;
    for (let depth = 0; current && depth < 60; depth++) {
      try {
        const component = inspector(current);
        if (component) {
          components.push(component);
          break;
        }
      } catch {
        break;
      }
      current = parentElement(current);
    }
  }
  try {
    const angular = inspectAngular(element);
    if (angular) components.push(angular);
  } catch {
    // Angular debug helpers can disappear during application teardown.
  }
  const angular = detectAngular(element);
  const vue = detectVue(element);
  return {
    components,
    utilities: analyzeTailwind(element),
    available: true,
    ...(angular ? { angular } : {}),
    ...(vue ? { vue } : {}),
  };
}
