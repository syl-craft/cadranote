import type { TargetSnapshot } from "./target";

interface RequestDraft {
  readonly instruction: string;
  readonly supplementsExpanded: boolean;
}

interface RequestWithPrimary extends RequestDraft {
  readonly primary: TargetSnapshot;
  readonly supplements: readonly TargetSnapshot[];
}

export type SessionState =
  | (RequestDraft & {
      readonly phase: "selecting-primary";
      readonly primary: null;
      readonly supplements: readonly [];
    })
  | (RequestWithPrimary & { readonly phase: "editing-request" })
  | (RequestWithPrimary & { readonly phase: "selecting-supplement" })
  | (RequestDraft & {
      readonly phase: "closed";
      readonly primary: null;
      readonly supplements: readonly [];
    });

export type SessionEvent =
  | {
      readonly type: "target-inspected";
      readonly original: TargetSnapshot;
      readonly target: TargetSnapshot;
    }
  | { readonly type: "element-selected"; readonly target: TargetSnapshot }
  | { readonly type: "instruction-changed"; readonly instruction: string }
  | { readonly type: "supplements-toggled"; readonly expanded: boolean }
  | { readonly type: "supplement-requested" }
  | { readonly type: "supplement-cancelled" }
  | { readonly type: "supplement-removed"; readonly targetId: string }
  | { readonly type: "supplements-cleared" }
  | { readonly type: "primary-replaced-by-parent"; readonly target: TargetSnapshot }
  | { readonly type: "target-reset" }
  | { readonly type: "session-closed" };

export function createSession(): Extract<SessionState, { phase: "selecting-primary" }> {
  return {
    phase: "selecting-primary",
    primary: null,
    supplements: [],
    instruction: "",
    supplementsExpanded: false,
  };
}

export function isSelectingElement(session: SessionState): boolean {
  return session.phase === "selecting-primary" || session.phase === "selecting-supplement";
}

export function containsTarget(session: SessionState, targetId: string): boolean {
  return session.primary?.id === targetId || session.supplements.some(({ id }) => id === targetId);
}
