import type { TargetSnapshot } from "../domain/target";
import { formatInspectionContext } from "./format-inspection";

export interface ContextEntry {
  readonly target: TargetSnapshot;
  readonly role: string;
  readonly isConnected: boolean;
}

export function formatRequestContext(
  entries: readonly ContextEntry[],
  instruction: string,
): string {
  const introduction = `${entries.length} éléments HTML à cibler — instantanés pris lors de leur ajout ou de la copie.`;

  return [introduction, ...entries.map(formatContextEntry), formatInstruction(instruction)].join(
    "\n\n",
  );
}

function formatContextEntry(entry: ContextEntry): string {
  const { description, pageUrl, pageTitle } = entry.target;
  const selectorLabel =
    description.chain.length > 1
      ? "Sélecteur (>>> = traversée du Shadow DOM, pas du CSS standard)"
      : "Sélecteur CSS";

  return [
    `## ${entry.role}`,
    entry.isConnected
      ? ""
      : "Cet élément a disparu de la page ; le contexte ci-dessous est l’instantané conservé.",
    `Page : ${pageUrl}`,
    `Titre : ${pageTitle}`,
    `${selectorLabel} : ${description.selector}`,
    `Chemin HTML : ${description.path}`,
    `Accès JavaScript : ${description.javascript}`,
    description.text ? `Texte : ${description.text}` : "",
    `Dimensions : ${description.dimensions}`,
    formatInspectionContext(entry.target.inspection),
    description.iframe
      ? "Attention : cet élément est une iframe. Son contenu interne n’a pas été inspecté."
      : "",
    "Extrait HTML (DOM rendu, éventuellement tronqué) :",
    "```html",
    description.html,
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatInstruction(instruction: string): string {
  return [
    `Modification demandée : ${instruction.trim() || "[à compléter]"}`,
    "Retrouve le composant ou le template qui produit l’élément principal et applique la modification dans le code source. Les sélecteurs décrivent la page au moment de leur capture et peuvent changer après un nouveau rendu.",
  ].join("\n");
}
