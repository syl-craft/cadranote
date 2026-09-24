import type { SessionState } from "../domain/session";
import type { TargetSnapshot } from "../domain/target";
import { ElementRegistry } from "../dom/element-registry";
import { extractFullText } from "../dom/extract-content";
import { formatRequestContext } from "./format-context";
import type { ContextEntry } from "./format-context";

export type CopyKind = "request" | "supplements" | "content" | "html" | "selector";
export type PreparedCopy =
  | { readonly ok: true; readonly text: string; readonly confirmation: string }
  | { readonly ok: false; readonly message: string };

export function prepareCopy(
  kind: CopyKind,
  session: SessionState,
  registry: ElementRegistry,
): PreparedCopy {
  if (!session.primary) return { ok: false, message: "Sélectionnez un élément principal." };

  if (kind === "request" || kind === "supplements") {
    return prepareContextCopy(kind, session, registry);
  }

  const primaryElement = registry.resolve(session.primary.id);
  if (!primaryElement?.isConnected) {
    return { ok: false, message: "Cet élément a disparu. Sélectionnez-le à nouveau." };
  }

  const description = registry.refresh(session.primary).description;

  switch (kind) {
    case "content": {
      const text = extractFullText(primaryElement);
      return text
        ? { ok: true, text, confirmation: "Contenu copié. Collez-le avec Ctrl+V." }
        : { ok: false, message: "Cet élément ne contient pas de texte à copier." };
    }
    case "html":
      return { ok: true, text: description.html, confirmation: "Extrait HTML copié." };
    case "selector":
      return { ok: true, text: description.selector, confirmation: "Sélecteur copié." };
  }
}

function prepareContextCopy(
  kind: "request" | "supplements",
  session: Extract<SessionState, { primary: TargetSnapshot }>,
  registry: ElementRegistry,
): PreparedCopy {
  const entries: ContextEntry[] = session.supplements.map((target, index) => ({
    target,
    role: `Élément supplémentaire ${index + 1}`,
    isConnected: registry.isConnected(target.id),
  }));

  if (kind === "request") {
    entries.unshift({
      target: registry.refresh(session.primary),
      role: "Élément principal",
      isConnected: registry.isConnected(session.primary.id),
    });
  }

  if (!entries.length)
    return { ok: false, message: "La liste des éléments supplémentaires est vide." };

  return {
    ok: true,
    text: formatRequestContext(entries, session.instruction),
    confirmation:
      kind === "request"
        ? `Contexte copié : le principal et ${session.supplements.length} élément(s) supplémentaire(s).`
        : "Éléments attachés copiés. Collez-les dans votre IA.",
  };
}
