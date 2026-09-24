import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/domain/session";
import type { SessionEvent, SessionState } from "../src/domain/session";
import { transitionSession } from "../src/domain/session-machine";
import type { TargetSnapshot } from "../src/domain/target";
import { validateInspection } from "../src/inspection/client";
import { inspectionText } from "../src/inspection/model";

function target(id: string): TargetSnapshot {
  return {
    id,
    pageUrl: "https://example.test/page",
    pageTitle: "Fixture",
    description: {
      chain: [`#${id}`],
      selector: `#${id}`,
      javascript: "",
      path: "",
      html: "",
      text: "",
      label: id,
      dimensions: "10 × 10 px",
      iframe: false,
    },
  };
}

function applyEvents(...events: SessionEvent[]): SessionState {
  return events.reduce(transitionSession, createSession());
}

const principal = target("principal");
const supplement = target("supplement");

test("Angular without debug APIs has its own explanation, independent of Tailwind", () => {
  const text = inspectionText({
    available: true,
    components: [],
    utilities: [],
    angular: { scope: "element", debugAvailable: false },
  });
  assert.match(text, /Indices Angular/);
  assert.match(text, /débogage Angular ne sont pas exposées/);
  assert.doesNotMatch(text, /Tailwind/);
  const plain = inspectionText({ available: true, components: [], utilities: [] });
  assert.match(plain, /Aucun nom de composant accessible/);
  assert.doesNotMatch(plain, /Tailwind/);
});

test("page metadata is validated and bounded before reaching the panel", () => {
  assert.deepEqual(validateInspection(null), { components: [], utilities: [], available: false });
  const inspection = validateInspection({
    available: "true",
    components: [
      { framework: "Unknown", hierarchy: ["Bad"] },
      { framework: "Vue", hierarchy: [null, "Button\nInjected", "x".repeat(500)], source: 42 },
    ],
    utilities: Array(100).fill("flex"),
  });
  assert.equal(inspection.available, false);
  assert.equal(inspection.components.length, 1);
  assert.deepEqual(inspection.components[0]?.hierarchy, ["Button Injected", "x".repeat(300)]);
  assert.equal(inspection.components[0]?.source, null);
  assert.equal(inspection.utilities.length, 80);
});

test("primary → request → supplements preserves the principal and the instruction", () => {
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "instruction-changed", instruction: "Aligner les boutons" },
    { type: "supplement-requested" },
    { type: "element-selected", target: supplement },
  );
  assert.equal(state.phase, "editing-request");
  assert.equal(state.primary, principal);
  assert.equal(state.instruction, "Aligner les boutons");
  assert.deepEqual(state.supplements, [supplement]);
});

test("a request cannot acquire supplements before a primary is selected", () => {
  const initial = createSession();
  assert.equal(transitionSession(initial, { type: "supplement-requested" }), initial);
  assert.equal(
    transitionSession(initial, { type: "primary-replaced-by-parent", target: principal }),
    initial,
  );
});

test("duplicate selections leave the supplement picker active and never replace the primary", () => {
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "supplement-requested" },
    { type: "element-selected", target: supplement },
    { type: "supplement-requested" },
  );
  assert.equal(transitionSession(state, { type: "element-selected", target: principal }), state);
  assert.equal(transitionSession(state, { type: "element-selected", target: supplement }), state);
  assert.equal(state.phase, "selecting-supplement");
});

test("reset removes every target but preserves the draft and section preference", () => {
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "instruction-changed", instruction: "Ma demande" },
    { type: "supplements-toggled", expanded: true },
    { type: "supplement-requested" },
    { type: "element-selected", target: supplement },
    { type: "target-reset" },
  );
  assert.equal(state.phase, "selecting-primary");
  assert.equal(state.primary, null);
  assert.deepEqual(state.supplements, []);
  assert.equal(state.instruction, "Ma demande");
  assert.equal(state.supplementsExpanded, true);
});

test("removing and clearing supplements never affect the principal", () => {
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "supplement-requested" },
    { type: "element-selected", target: supplement },
  );
  for (const event of [
    { type: "supplement-removed", targetId: supplement.id },
    { type: "supplements-cleared" },
  ] as const) {
    const next = transitionSession(state, event);
    assert.equal(next.primary, principal);
    assert.deepEqual(next.supplements, []);
    assert.deepEqual(state.supplements, [supplement]);
  }
});

test("promoting a parent removes it from supplements and exits selection mode", () => {
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "supplement-requested" },
    { type: "element-selected", target: supplement },
    { type: "supplement-requested" },
    { type: "primary-replaced-by-parent", target: supplement },
  );
  assert.equal(state.primary, supplement);
  assert.equal(state.phase, "editing-request");
  assert.deepEqual(state.supplements, []);
});

test("cancel keeps the request; closed sessions reject all subsequent events", () => {
  const editing = applyEvents({ type: "element-selected", target: principal });
  const selecting = transitionSession(editing, { type: "supplement-requested" });
  assert.deepEqual(transitionSession(selecting, { type: "supplement-cancelled" }), editing);
  const closed = transitionSession(selecting, { type: "session-closed" });
  assert.equal(closed.phase, "closed");
  assert.equal(closed.primary, null);
  assert.equal(transitionSession(closed, { type: "element-selected", target: supplement }), closed);
});

test("session state can be serialized without DOM references", () => {
  const state = applyEvents({ type: "element-selected", target: principal });
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test("late inspection cannot restore a removed or reselected target", () => {
  const replacement = target(principal.id);
  const inspected = {
    ...principal,
    inspection: { components: [], utilities: ["flex"], available: true },
  };
  const state = applyEvents(
    { type: "element-selected", target: principal },
    { type: "target-reset" },
    { type: "element-selected", target: replacement },
    { type: "target-inspected", original: principal, target: inspected },
  );
  assert.equal(state.primary, replacement);
  const closed = transitionSession(state, { type: "session-closed" });
  assert.equal(
    transitionSession(closed, {
      type: "target-inspected",
      original: replacement,
      target: inspected,
    }),
    closed,
  );
});
