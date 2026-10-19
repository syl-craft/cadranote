import type { Inspection } from "../domain/inspection";
import { t } from "../i18n/i18n";

export function formatInspectionContext(inspection: Inspection | undefined): string {
  if (!inspection) return "";
  const { colon, exposedSource, tailwindClasses, technicalHints } = t();

  const lines = inspection.components.map(
    ({ framework, hierarchy, source }) =>
      `${framework}${colon}${hierarchy.join(" → ")}${source ? `\n${exposedSource}${colon}${source}` : ""}`,
  );

  if (inspection.utilities.length)
    lines.push(`${tailwindClasses}${colon}${inspection.utilities.join(" ")}`);

  return lines.length ? `${technicalHints}\n${lines.join("\n")}` : "";
}
