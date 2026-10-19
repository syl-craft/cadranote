import {
  finishReviewPrompt,
  isReviewPromptDue,
  parseReviewPrompt,
  postponeReviewPrompt,
  recordContextCopy,
} from "../domain/review-prompt";
import type { ReviewPromptState } from "../domain/review-prompt";
import { readStored, writeStored } from "../platform/extension-storage";

const REVIEW_PROMPT_KEY = "reviewPrompt";

/** Each change rereads the stored state: other tabs may have counted copies meanwhile. */
export async function countContextCopy(now = Date.now()): Promise<boolean> {
  const state = await update((current) => recordContextCopy(current, now));
  return isReviewPromptDue(state, now);
}

export async function postponeReviewInvitation(now = Date.now()): Promise<void> {
  await update((current) => postponeReviewPrompt(current, now));
}

export async function finishReviewInvitation(): Promise<void> {
  await update(finishReviewPrompt);
}

async function update(
  change: (state: ReviewPromptState) => ReviewPromptState,
): Promise<ReviewPromptState> {
  const state = change(parseReviewPrompt(await readStored(REVIEW_PROMPT_KEY)));
  await writeStored(REVIEW_PROMPT_KEY, state);
  return state;
}
