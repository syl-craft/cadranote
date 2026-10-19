import type { SessionState } from "../domain/session";
import type { TargetSnapshot } from "../domain/target";
import { ElementRegistry } from "../dom/element-registry";
import { extractFullText } from "../dom/extract-content";
import { formatRequestContext } from "./format-context";
import type { ContextEntry } from "./format-context";
import { t } from "../i18n/i18n";

export type CopyKind = "request" | "supplements" | "content" | "html" | "selector";
export type PreparedCopy =
  | { readonly ok: true; readonly text: string; readonly confirmation: string }
  | { readonly ok: false; readonly message: string };

export function prepareCopy(
  kind: CopyKind,
  session: SessionState,
  registry: ElementRegistry,
): PreparedCopy {
  if (!session.primary) return { ok: false, message: t().noPrimary };

  if (kind === "request" || kind === "supplements") {
    return prepareContextCopy(kind, session, registry);
  }

  const primaryElement = registry.resolve(session.primary.id);
  if (!primaryElement?.isConnected) {
    return { ok: false, message: t().primaryDisappeared };
  }

  const description = registry.refresh(session.primary).description;

  switch (kind) {
    case "content": {
      const text = extractFullText(primaryElement);
      return text
        ? { ok: true, text, confirmation: t().contentCopied }
        : { ok: false, message: t().noTextToCopy };
    }
    case "html":
      return { ok: true, text: description.html, confirmation: t().htmlCopied };
    case "selector":
      return { ok: true, text: description.selector, confirmation: t().selectorCopied };
  }
}

function prepareContextCopy(
  kind: "request" | "supplements",
  session: Extract<SessionState, { primary: TargetSnapshot }>,
  registry: ElementRegistry,
): PreparedCopy {
  const entries: ContextEntry[] = session.supplements.map((target, index) => ({
    target,
    role: t().supplementRole(index + 1),
    isConnected: registry.isConnected(target.id),
  }));

  if (kind === "request") {
    entries.unshift({
      target: registry.refresh(session.primary),
      role: t().primaryRole,
      isConnected: registry.isConnected(session.primary.id),
    });
  }

  if (!entries.length) return { ok: false, message: t().emptySupplementList };

  return {
    ok: true,
    text: formatRequestContext(entries, session.instruction),
    confirmation:
      kind === "request" ? t().contextCopied(session.supplements.length) : t().supplementsCopied,
  };
}
