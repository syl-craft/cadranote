import { createSession } from "../domain/session";
import type { SessionState } from "../domain/session";
import { transitionSession } from "../domain/session-machine";
import { ElementRegistry } from "../dom/element-registry";
import type { RuntimeSnapshot } from "./session-controller";

interface PreviousRuntime {
  close(): void;
  getSnapshot?: () => RuntimeSnapshot;
  getState?: () => unknown;
}

export function takeOverPreviousRuntime(previous: unknown): RuntimeSnapshot | undefined {
  if (!isPreviousRuntime(previous)) return undefined;

  try {
    const snapshot = previous.getSnapshot?.();
    if (snapshot?.version === 1 && snapshot.session.phase !== "closed") return snapshot;
    if (previous.getState) return migrateLegacySession(previous.getState());
    return undefined;
  } catch (error) {
    console.warn("Cadranote : la session précédente n’a pas pu être restaurée", error);
    return undefined;
  } finally {
    previous.close();
  }
}

function isPreviousRuntime(value: unknown): value is PreviousRuntime {
  return (
    typeof value === "object" &&
    value !== null &&
    "close" in value &&
    typeof value.close === "function"
  );
}

function migrateLegacySession(value: unknown): RuntimeSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  const registry = new ElementRegistry();
  let session: SessionState = createSession();

  if (typeof value.instruction === "string") {
    session = transitionSession(session, {
      type: "instruction-changed",
      instruction: value.instruction,
    });
  }

  if (typeof value.attachmentsOpen === "boolean") {
    session = transitionSession(session, {
      type: "supplements-toggled",
      expanded: value.attachmentsOpen,
    });
  }

  const primary = legacyElement(value.primary);
  if (primary) {
    session = transitionSession(session, {
      type: "element-selected",
      target: registry.capture(primary),
    });

    if (Array.isArray(value.attachments)) {
      for (const attachment of value.attachments) {
        const element = legacyElement(attachment);
        if (!element) continue;
        session = transitionSession(session, { type: "supplement-requested" });
        session = transitionSession(session, {
          type: "element-selected",
          target: registry.capture(element),
        });
        session = transitionSession(session, { type: "supplement-cancelled" });
      }
    }
  }

  return { version: 1, session, bindings: registry.exportBindings() };
}

function legacyElement(value: unknown): Element | null {
  return isRecord(value) && value.element instanceof Element && value.element.isConnected
    ? value.element
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
