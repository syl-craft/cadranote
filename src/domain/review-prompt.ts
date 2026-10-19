const DAY = 24 * 60 * 60 * 1000;
const FIRST_PROMPT_COPIES = 5;
const FIRST_PROMPT_DELAY = 3 * DAY;
const POSTPONED_COPIES = 20;
const POSTPONED_DELAY = 30 * DAY;

/** Invitation to rate the extension, counted on AI context copies only. */
export interface ReviewPromptState {
  readonly copies: number;
  readonly dueAfterCopies: number;
  /** Set on the first copy: the delay runs from the first real use. */
  readonly dueAfterTime: number | null;
  readonly finished: boolean;
}

export const initialReviewPrompt: ReviewPromptState = {
  copies: 0,
  dueAfterCopies: FIRST_PROMPT_COPIES,
  dueAfterTime: null,
  finished: false,
};

export function recordContextCopy(state: ReviewPromptState, now: number): ReviewPromptState {
  return {
    ...state,
    copies: state.copies + 1,
    dueAfterTime: state.dueAfterTime ?? now + FIRST_PROMPT_DELAY,
  };
}

export function isReviewPromptDue(state: ReviewPromptState, now: number): boolean {
  return (
    !state.finished &&
    state.copies >= state.dueAfterCopies &&
    state.dueAfterTime !== null &&
    now >= state.dueAfterTime
  );
}

/** Both conditions apply again: 20 more copies and 30 more days. */
export function postponeReviewPrompt(state: ReviewPromptState, now: number): ReviewPromptState {
  return {
    ...state,
    dueAfterCopies: state.copies + POSTPONED_COPIES,
    dueAfterTime: now + POSTPONED_DELAY,
  };
}

export function finishReviewPrompt(state: ReviewPromptState): ReviewPromptState {
  return { ...state, finished: true };
}

export function parseReviewPrompt(value: unknown): ReviewPromptState {
  if (typeof value !== "object" || value === null) return initialReviewPrompt;
  const { copies, dueAfterCopies, dueAfterTime, finished } = value as Record<string, unknown>;
  return {
    copies: isCount(copies) ? copies : 0,
    dueAfterCopies: isCount(dueAfterCopies) ? dueAfterCopies : FIRST_PROMPT_COPIES,
    dueAfterTime:
      typeof dueAfterTime === "number" && Number.isFinite(dueAfterTime) ? dueAfterTime : null,
    finished: finished === true,
  };
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
