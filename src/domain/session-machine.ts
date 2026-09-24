import { containsTarget, createSession } from "./session";
import type { SessionEvent, SessionState } from "./session";
import type { TargetSnapshot } from "./target";

export function transitionSession(state: SessionState, event: SessionEvent): SessionState {
  if (state.phase === "closed") return state;

  switch (event.type) {
    case "target-inspected":
      return state.primary
        ? {
            ...state,
            primary: state.primary === event.original ? event.target : state.primary,
            supplements: state.supplements.map((target) =>
              target === event.original ? event.target : target,
            ),
          }
        : state;

    case "element-selected":
      return selectTarget(state, event.target);

    case "instruction-changed":
      return { ...state, instruction: event.instruction };

    case "supplements-toggled":
      return { ...state, supplementsExpanded: event.expanded };

    case "supplement-requested":
      return state.primary ? { ...state, phase: "selecting-supplement" } : state;

    case "supplement-cancelled":
      return state.phase === "selecting-supplement"
        ? { ...state, phase: "editing-request" }
        : state;

    case "supplement-removed":
      return state.primary
        ? { ...state, supplements: state.supplements.filter(({ id }) => id !== event.targetId) }
        : state;

    case "supplements-cleared":
      return state.primary ? { ...state, supplements: [] } : state;

    case "primary-replaced-by-parent":
      if (!state.primary) return state;
      return {
        ...state,
        phase: "editing-request",
        primary: event.target,
        supplements: state.supplements.filter(({ id }) => id !== event.target.id),
      };

    case "target-reset":
      return {
        ...createSession(),
        instruction: state.instruction,
        supplementsExpanded: state.supplementsExpanded,
      };

    case "session-closed":
      return { ...createSession(), phase: "closed" };

    default:
      return assertUnreachable(event);
  }
}

function selectTarget(state: SessionState, target: TargetSnapshot): SessionState {
  if (state.phase === "selecting-primary") {
    return { ...state, phase: "editing-request", primary: target };
  }

  if (state.phase !== "selecting-supplement" || containsTarget(state, target.id)) return state;

  return {
    ...state,
    phase: "editing-request",
    supplements: [...state.supplements, target],
  };
}

function assertUnreachable(event: never): never {
  throw new Error(`Événement de session non pris en charge : ${JSON.stringify(event)}`);
}
