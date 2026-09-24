import type { Inspection } from "../domain/inspection";
export type { Inspection, ComponentInfo } from "../domain/inspection";

export const unavailableInspection: Inspection = {
  components: [],
  utilities: [],
  available: false,
};

export function inspectionText(inspection: Inspection): string {
  const lines = inspection.components.map(
    ({ framework, hierarchy, source }) =>
      `${framework} : ${hierarchy.join(" → ")}${source ? `\nSource exposée : ${source}` : ""}`,
  );
  if (inspection.vue && !inspection.components.some(({ framework }) => framework === "Vue")) {
    lines.push(
      inspection.vue.scope === "element"
        ? "Indices Vue.js sur cet élément ou ses parents ; les noms de composants ne sont pas exposés."
        : "Indices Vue.js sur la page ; le lien avec cet élément n’est pas établi.",
    );
  }
  if (
    inspection.angular &&
    !inspection.components.some(({ framework }) => framework === "Angular")
  ) {
    lines.push(
      inspection.angular.scope === "element"
        ? "Indices Angular sur cet élément ou ses parents."
        : "Angular détecté sur la page ; le lien avec cet élément n’est pas établi.",
    );
    lines.push(
      inspection.angular.debugAvailable
        ? "Aucun nom de composant Angular accessible pour cet élément."
        : "Les API de débogage Angular ne sont pas exposées, comme souvent en production. Le nom du composant et son fichier source ne sont pas accessibles.",
    );
  }
  if (!lines.length && inspection.available)
    lines.push(
      "Aucun nom de composant accessible pour cet élément. Cela ne signifie pas que la page n’utilise aucun framework.",
    );
  if (inspection.utilities.length)
    lines.push(
      `Classes compatibles Tailwind (indice, non confirmé) : ${inspection.utilities.join(" ")}`,
    );
  if (!inspection.available) lines.push("Inspection des composants indisponible.");
  return lines.join("\n");
}
