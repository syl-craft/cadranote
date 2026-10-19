import type { TargetSnapshot } from "../domain/target";
import { t } from "../i18n/i18n";
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
  const introduction = t().contextIntroduction(entries.length);

  return [introduction, ...entries.map(formatContextEntry), formatInstruction(instruction)].join(
    "\n\n",
  );
}

function formatContextEntry(entry: ContextEntry): string {
  const { description, pageUrl, pageTitle } = entry.target;
  const messages = t();
  const field = (label: string, value: string) => `${label}${messages.colon}${value}`;
  const selectorLabel =
    description.chain.length > 1 ? messages.contextShadowSelector : messages.contextSelector;

  return [
    `## ${entry.role}`,
    entry.isConnected ? "" : messages.contextDisappeared,
    field(messages.contextPage, pageUrl),
    field(messages.contextTitle, pageTitle),
    field(selectorLabel, description.selector),
    field(messages.contextPath, description.path),
    field(messages.contextJavascript, description.javascript),
    description.text ? field(messages.contextText, description.text) : "",
    field(messages.contextDimensions, description.dimensions),
    formatInspectionContext(entry.target.inspection),
    description.iframe ? messages.contextIframe : "",
    messages.contextHtml,
    "```html",
    description.html,
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatInstruction(instruction: string): string {
  const messages = t();
  return [
    `${messages.contextRequest}${messages.colon}${instruction.trim() || messages.contextRequestMissing}`,
    messages.contextGuidance,
  ].join("\n");
}
