import type { Inspection } from "../domain/inspection";
import { t } from "../i18n/i18n";
export type { Inspection, ComponentInfo } from "../domain/inspection";

export const unavailableInspection: Inspection = {
  components: [],
  utilities: [],
  available: false,
};

export function inspectionText(inspection: Inspection): string {
  const messages = t();
  const lines = inspection.components.map(
    ({ framework, hierarchy, source }) =>
      `${framework}${messages.colon}${hierarchy.join(" → ")}${source ? `\n${messages.exposedSource}${messages.colon}${source}` : ""}`,
  );
  if (inspection.vue && !inspection.components.some(({ framework }) => framework === "Vue")) {
    lines.push(inspection.vue.scope === "element" ? messages.vueOnElement : messages.vueOnPage);
  }
  if (
    inspection.angular &&
    !inspection.components.some(({ framework }) => framework === "Angular")
  ) {
    lines.push(
      inspection.angular.scope === "element" ? messages.angularOnElement : messages.angularOnPage,
    );
    lines.push(
      inspection.angular.debugAvailable ? messages.angularNoName : messages.angularNoDebug,
    );
  }
  if (!lines.length && inspection.available) lines.push(messages.noComponentName);
  if (inspection.utilities.length)
    lines.push(`${messages.tailwindClasses}${messages.colon}${inspection.utilities.join(" ")}`);
  if (!inspection.available) lines.push(messages.inspectionUnavailable);
  return lines.join("\n");
}
