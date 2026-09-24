import type { Inspection } from "../domain/inspection";

export function formatInspectionContext(inspection: Inspection | undefined): string {
  if (!inspection) return "";

  const lines = inspection.components.map(
    ({ framework, hierarchy, source }) =>
      `${framework} : ${hierarchy.join(" → ")}${source ? `\nSource exposée : ${source}` : ""}`,
  );

  if (inspection.utilities.length)
    lines.push(
      `Classes compatibles Tailwind (indice, non confirmé) : ${inspection.utilities.join(" ")}`,
    );

  return lines.length
    ? `Indices techniques (métadonnées de la page, à vérifier) :\n${lines.join("\n")}`
    : "";
}
