import type { SessionState } from "../domain/session";
import type { TargetSnapshot } from "../domain/target";
import type { CopyKind } from "../export/prepare-copy";
import { requireElement } from "./query-element";
import { inspectionText } from "../inspection/model";
import { installPanelDrag } from "./panel-drag";

export type PanelAction =
  | { type: "request-changed"; instruction: string }
  | { type: "section-toggled"; expanded: boolean }
  | { type: "add-supplement" }
  | { type: "cancel-supplement" }
  | { type: "remove-supplement"; targetId: string }
  | { type: "locate-supplement"; targetId: string }
  | { type: "clear-supplements" }
  | { type: "change-target" }
  | { type: "select-parent" }
  | { type: "copy"; kind: CopyKind }
  | { type: "close" };

export interface PanelViewModel {
  readonly session: SessionState;
  readonly connectedTargetIds: ReadonlySet<string>;
  readonly canSelectParent: boolean;
}

export class RequestPanel {
  private readonly listeners = new AbortController();
  private readonly panel: HTMLElement;
  private readonly instruction: HTMLTextAreaElement;
  private readonly supplementsSection: HTMLDetailsElement;
  private readonly supplementsList: HTMLUListElement;
  private readonly feedback: HTMLDivElement;
  private readonly copyFallback: HTMLDivElement;

  constructor(
    private readonly root: ShadowRoot,
    onAction: (action: PanelAction) => void,
  ) {
    this.panel = requireElement(root, ".panel", HTMLElement);
    this.instruction = requireElement(root, "#instruction", HTMLTextAreaElement);
    this.supplementsSection = requireElement(root, "#attachments", HTMLDetailsElement);
    this.supplementsList = requireElement(root, "#attachment-list", HTMLUListElement);
    this.feedback = requireElement(root, ".feedback", HTMLDivElement);
    this.copyFallback = requireElement(root, "#copy-fallback", HTMLDivElement);

    this.bindActions(onAction);
    installPanelDrag(this.panel, this.listeners.signal);
    this.containInteractionEvents();
  }

  render({ session, connectedTargetIds, canSelectParent }: PanelViewModel): void {
    const hasPrimary = session.primary !== null;
    this.panel.dataset.phase = session.phase;
    this.setHidden("#result", !hasPrimary);
    this.setHidden("#attachments", !hasPrimary);
    this.setHidden("#supplement-actions", !hasPrimary);
    this.setHidden("#empty-supplements", session.supplements.length > 0);
    this.setHidden("#copy-ai", !hasPrimary);
    this.setHidden("#principal-actions", !hasPrimary);
    this.setHidden("#cancel-add", session.phase !== "selecting-supplement");

    if (this.instruction.value !== session.instruction)
      this.instruction.value = session.instruction;
    this.supplementsSection.open = session.supplementsExpanded;
    this.button("#attach").disabled = session.phase === "selecting-supplement";
    this.button("#copy-all").disabled = session.supplements.length === 0;
    this.button("#clear-all").disabled = session.supplements.length === 0;
    this.button("#parent").disabled = !canSelectParent;

    this.renderStatus(session);
    if (session.primary) this.renderPrimary(session.primary);
    this.renderSupplements(session.supplements, connectedTargetIds);
  }

  readDraft(): { instruction: string; supplementsExpanded: boolean } {
    return {
      instruction: this.instruction.value,
      supplementsExpanded: this.supplementsSection.open,
    };
  }

  showFeedback(message: string): void {
    this.feedback.textContent = message;
  }

  clearCopyFallback(): void {
    this.copyFallback.replaceChildren();
  }

  showManualCopy(text: string): void {
    this.clearCopyFallback();
    const textarea = document.createElement("textarea");
    textarea.id = "manual-copy";
    textarea.setAttribute("aria-label", "Texte à copier manuellement");
    textarea.value = text;
    this.copyFallback.append(textarea);
    textarea.focus();
    textarea.select();
  }

  dispose(): void {
    this.listeners.abort();
  }

  private renderStatus(session: SessionState): void {
    if (session.phase === "selecting-supplement") {
      this.setText("#status", "Ajout d’un élément supplémentaire");
      this.setText(
        "#hint",
        "Cliquez sur l’élément à ajouter. Le principal et votre demande sont conservés. Échap pour annuler l’ajout.",
      );
      return;
    }

    if (!session.primary) {
      this.setText("#status", "Sélection de l’élément principal");
      this.setText(
        "#hint",
        "Survolez la page, puis cliquez sur l’élément principal. Échap pour quitter.",
      );
      return;
    }

    this.setText("#status", "Élément principal sélectionné");
    this.setText(
      "#hint",
      session.primary.description.iframe
        ? "Cadre iframe sélectionné. Son contenu interne n’est pas accessible depuis ce sélecteur."
        : "Rédigez votre demande, puis ajoutez des éléments supplémentaires si nécessaire.",
    );
  }

  private renderPrimary(primary: TargetSnapshot): void {
    const description = primary.description;
    this.setText("#meta", `${description.label} · ${description.dimensions}`);
    this.setText(
      "#selector-label",
      description.chain.length > 1
        ? "Sélecteurs Shadow DOM (>>> = traversée)"
        : "Sélecteur CSS unique",
    );
    this.setText("#selector", description.selector);
    this.setText("#path", description.path);
    this.setText("#html", description.html);
    this.setText(
      "#inspection",
      primary.inspection ? inspectionText(primary.inspection) : "Inspection en cours…",
    );
  }

  private renderSupplements(
    supplements: readonly TargetSnapshot[],
    connectedIds: ReadonlySet<string>,
  ): void {
    const activeButton = this.root.activeElement;
    const focusedSupplement =
      activeButton instanceof HTMLButtonElement && this.supplementsList.contains(activeButton)
        ? {
            targetId: activeButton.dataset.targetId,
            action: activeButton.hasAttribute("data-remove") ? "remove" : "view",
            index: Number(activeButton.dataset.remove ?? activeButton.dataset.view),
          }
        : null;
    this.setText("#attachment-count", String(supplements.length));
    const rows = supplements.map((target, index) => {
      const row = document.createElement("li");
      const locateButton = document.createElement("button");
      locateButton.className = "attachment-name";
      locateButton.dataset.view = String(index);
      locateButton.dataset.targetId = target.id;
      locateButton.title = target.description.selector;
      if (target.inspection) locateButton.title += `\n${inspectionText(target.inspection)}`;
      locateButton.textContent =
        `${index + 1}. ${target.description.label}` +
        (target.description.text ? ` · ${target.description.text}` : "") +
        (connectedIds.has(target.id) ? "" : " (disparu)");

      const removeButton = document.createElement("button");
      removeButton.dataset.remove = String(index);
      removeButton.dataset.targetId = target.id;
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "icon");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      const strokes = document.createElementNS("http://www.w3.org/2000/svg", "path");
      strokes.setAttribute("d", "m6 6 12 12M18 6 6 18");
      icon.append(strokes);
      removeButton.append(icon);
      removeButton.setAttribute("aria-label", `Retirer l’élément ${index + 1}`);
      row.append(locateButton, removeButton);
      return row;
    });

    this.supplementsList.replaceChildren(...rows);
    if (focusedSupplement) {
      const buttons = Array.from(
        this.supplementsList.querySelectorAll<HTMLButtonElement>(
          `[data-${focusedSupplement.action}]`,
        ),
      );
      const nextFocus =
        buttons.find((button) => button.dataset.targetId === focusedSupplement.targetId) ??
        buttons[Math.min(focusedSupplement.index, buttons.length - 1)] ??
        this.button("#attach");
      nextFocus.focus({ preventScroll: true });
    }
  }

  private bindActions(onAction: (action: PanelAction) => void): void {
    const signal = this.listeners.signal;
    const actions: ReadonlyArray<readonly [string, PanelAction]> = [
      [".close", { type: "close" }],
      ["#attach", { type: "add-supplement" }],
      ["#cancel-add", { type: "cancel-supplement" }],
      ["#clear-all", { type: "clear-supplements" }],
      ["#restart", { type: "change-target" }],
      ["#parent", { type: "select-parent" }],
      ["#copy-ai", { type: "copy", kind: "request" }],
      ["#copy-all", { type: "copy", kind: "supplements" }],
      ["#copy-content", { type: "copy", kind: "content" }],
      ["#copy-html", { type: "copy", kind: "html" }],
      ["#copy-selector", { type: "copy", kind: "selector" }],
    ];

    for (const [selector, action] of actions) {
      this.button(selector).addEventListener("click", () => onAction(action), { signal });
    }

    this.instruction.addEventListener(
      "input",
      () => {
        onAction({ type: "request-changed", instruction: this.instruction.value });
      },
      { signal },
    );

    this.supplementsSection.addEventListener(
      "toggle",
      () => {
        onAction({ type: "section-toggled", expanded: this.supplementsSection.open });
      },
      { signal },
    );

    this.supplementsList.addEventListener(
      "click",
      (event) => {
        const button = event.target instanceof Element ? event.target.closest("button") : null;
        const targetId = button?.dataset.targetId;
        if (!targetId) return;

        onAction({
          type: button.dataset.remove !== undefined ? "remove-supplement" : "locate-supplement",
          targetId,
        });
      },
      { signal },
    );

    this.button(".move").addEventListener(
      "click",
      () => {
        const isAtTop = this.panel.style.top === "20px";
        this.panel.style.left = "";
        this.panel.style.right = "";
        this.panel.style.top = isAtTop ? "auto" : "20px";
        this.panel.style.bottom = isAtTop ? "20px" : "auto";
      },
      { signal },
    );
  }

  private containInteractionEvents(): void {
    for (const eventName of ["click", "pointerdown", "pointerup", "keydown", "keyup", "input"]) {
      this.panel.addEventListener(eventName, (event) => event.stopPropagation(), {
        signal: this.listeners.signal,
      });
    }
  }

  private button(selector: string): HTMLButtonElement {
    return requireElement(this.root, selector, HTMLButtonElement);
  }

  private setText(selector: string, value: string): void {
    requireElement(this.root, selector, HTMLElement).textContent = value;
  }

  private setHidden(selector: string, hidden: boolean): void {
    requireElement(this.root, selector, HTMLElement).hidden = hidden;
  }
}
