import { containsTarget, createSession, isSelectingElement } from "../domain/session";
import type { SessionEvent, SessionState } from "../domain/session";
import { transitionSession } from "../domain/session-machine";
import { ElementRegistry } from "../dom/element-registry";
import { findParentElement } from "../dom/selectors";
import { prepareCopy } from "../export/prepare-copy";
import type { CopyKind } from "../export/prepare-copy";
import { HighlightLayer } from "../highlights/highlight-layer";
import { writeClipboard } from "../platform/clipboard";
import { installElementPicker } from "../selection/element-picker";
import { createOverlay } from "../ui/overlay";
import type { Overlay } from "../ui/overlay";
import { RequestPanel } from "../ui/panel";
import type { PanelAction } from "../ui/panel";
import type { TargetSnapshot } from "../domain/target";
import { requestInspection } from "../inspection/client";

export interface RuntimeSnapshot {
  readonly version: 1;
  readonly session: SessionState;
  /** DOM references valid only in the current document. */
  readonly bindings: readonly (readonly [string, Element])[];
}

export class SessionController {
  private state: SessionState;
  private readonly registry: ElementRegistry;
  private readonly overlay: Overlay;
  private readonly panel: RequestPanel;
  private readonly highlights: HighlightLayer;
  private readonly lifetime = new AbortController();
  private readonly stopPicker: () => void;
  private copySequence = 0;
  private readonly inspections = new Map<TargetSnapshot, Promise<void>>();

  constructor(
    snapshot?: RuntimeSnapshot,
    private readonly onClosed: () => void = () => {},
  ) {
    this.state = snapshot?.session ?? createSession();
    this.registry = new ElementRegistry(snapshot?.bindings);
    this.overlay = createOverlay();
    this.panel = new RequestPanel(this.overlay.root, (action) => this.handlePanelAction(action));
    this.highlights = new HighlightLayer(this.overlay.root);
    this.stopPicker = installElementPicker({
      isSelecting: () => isSelectingElement(this.state),
      containsInterfaceEvent: (event) => this.overlay.containsEvent(event),
      onHover: (element) => this.highlights.showActiveElement(element),
      onSelected: (element) => this.selectElement(element),
      onEscape: () => this.handleEscape(),
    });

    this.render();
    for (const target of this.state.primary
      ? [this.state.primary, ...this.state.supplements]
      : []) {
      if (!target.inspection) this.inspectTarget(target);
    }
  }

  getSnapshot(): RuntimeSnapshot {
    this.synchronizeDraft();
    return { version: 1, session: this.state, bindings: this.registry.exportBindings() };
  }

  close(): void {
    if (this.state.phase === "closed") return;
    this.state = transitionSession(this.state, { type: "session-closed" });
    this.lifetime.abort();
    this.stopPicker();
    this.highlights.dispose();
    this.panel.dispose();
    this.registry.dispose();
    this.overlay.dispose();
    this.onClosed();
  }

  private handlePanelAction(action: PanelAction): void {
    if (this.state.phase === "closed") return;

    switch (action.type) {
      case "request-changed":
        this.state = transitionSession(this.state, {
          type: "instruction-changed",
          instruction: action.instruction,
        });
        return;
      case "section-toggled":
        this.state = transitionSession(this.state, {
          type: "supplements-toggled",
          expanded: action.expanded,
        });
        return;
      case "add-supplement":
        this.dispatch({ type: "supplement-requested" });
        return;
      case "cancel-supplement":
        this.dispatch({ type: "supplement-cancelled" });
        return;
      case "remove-supplement":
        this.dispatch({ type: "supplement-removed", targetId: action.targetId });
        this.panel.showFeedback("Élément retiré.");
        return;
      case "clear-supplements":
        this.dispatch({ type: "supplements-cleared" });
        this.panel.showFeedback("Liste vidée.");
        return;
      case "change-target":
        this.dispatch({ type: "target-reset" });
        return;
      case "select-parent":
        this.selectPrimaryParent();
        return;
      case "locate-supplement":
        this.locateSupplement(action.targetId);
        return;
      case "copy":
        void this.copy(action.kind);
        return;
      case "close":
        this.close();
        return;
    }
  }

  private selectElement(element: Element): void {
    if (!element.isConnected || !isSelectingElement(this.state)) return;
    const target = this.registry.capture(element);
    const addingSupplement = this.state.phase === "selecting-supplement";

    if (addingSupplement && containsTarget(this.state, target.id)) {
      this.panel.showFeedback(
        "Cet élément est déjà le principal ou figure dans la liste. Choisissez un autre élément.",
      );
      return;
    }

    this.dispatch({ type: "element-selected", target });
    this.inspectTarget(target);
    if (addingSupplement)
      this.panel.showFeedback(
        "Élément supplémentaire ajouté. Le principal et votre demande sont conservés.",
      );
  }

  private selectPrimaryParent(): void {
    const element = this.primaryElement();
    const parent = element?.isConnected ? findParentElement(element) : null;
    if (parent) {
      const target = this.registry.capture(parent);
      this.dispatch({ type: "primary-replaced-by-parent", target });
      this.inspectTarget(target);
    }
  }

  private inspectTarget(target: TargetSnapshot): void {
    const pending = requestInspection(target.description.chain)
      .then((inspection) => {
        if (this.lifetime.signal.aborted) return;
        this.synchronizeDraft();
        this.state = transitionSession(this.state, {
          type: "target-inspected",
          original: target,
          target: { ...target, inspection },
        });
        this.render();
      })
      .finally(() => this.inspections.delete(target));
    this.inspections.set(target, pending);
  }

  private locateSupplement(targetId: string): void {
    const element = this.registry.resolve(targetId);
    if (!element?.isConnected) {
      this.panel.showFeedback(
        "Cet élément a disparu. Son instantané reste disponible dans la copie groupée.",
      );
      return;
    }

    this.dispatch({ type: "supplement-cancelled" });
    element.scrollIntoView({ block: "center", inline: "nearest" });
    this.panel.showFeedback("Élément supplémentaire repéré. L’élément principal reste inchangé.");
  }

  private handleEscape(): void {
    if (this.state.phase === "selecting-supplement")
      this.dispatch({ type: "supplement-cancelled" });
    else this.close();
  }

  private dispatch(event: SessionEvent): void {
    this.synchronizeDraft();
    this.state = transitionSession(this.state, event);
    this.copySequence += 1;
    this.panel.showFeedback("");
    this.panel.clearCopyFallback();
    this.render();
  }

  private synchronizeDraft(): void {
    // The details.toggle event may not have fired yet.
    const draft = this.panel.readDraft();
    this.state = transitionSession(this.state, {
      type: "instruction-changed",
      instruction: draft.instruction,
    });
    this.state = transitionSession(this.state, {
      type: "supplements-toggled",
      expanded: draft.supplementsExpanded,
    });
  }

  private render(): void {
    const targets = this.state.primary ? [this.state.primary, ...this.state.supplements] : [];
    this.registry.retain(targets.map(({ id }) => id));
    const connectedTargetIds = new Set(
      targets.filter(({ id }) => this.registry.isConnected(id)).map(({ id }) => id),
    );
    const primaryElement = this.primaryElement();

    this.panel.render({
      session: this.state,
      connectedTargetIds,
      canSelectParent: Boolean(primaryElement?.isConnected && findParentElement(primaryElement)),
    });
    this.highlights.showSupplements(
      this.state.supplements.map(({ id }) => this.registry.resolve(id)),
    );
    this.highlights.showActiveElement(isSelectingElement(this.state) ? null : primaryElement);
  }

  private primaryElement(): Element | null {
    return this.state.primary ? this.registry.resolve(this.state.primary.id) : null;
  }

  private async copy(kind: CopyKind): Promise<void> {
    const sequence = ++this.copySequence;
    let textToCopy: string | null = null;

    try {
      if (kind === "request" || kind === "supplements") {
        const targets = this.state.primary ? [this.state.primary, ...this.state.supplements] : [];
        await Promise.all(targets.map((target) => this.inspections.get(target)));
        if (!this.isCurrentCopy(sequence)) return;
      }
      this.synchronizeDraft();
      const prepared = prepareCopy(kind, this.state, this.registry);
      if (!prepared.ok) {
        this.panel.showFeedback(prepared.message);
        return;
      }

      textToCopy = prepared.text;
      this.panel.clearCopyFallback();
      await writeClipboard(prepared.text, this.overlay.root, this.lifetime.signal);
      if (this.isCurrentCopy(sequence)) this.panel.showFeedback(prepared.confirmation);
    } catch (error) {
      if (!this.isCurrentCopy(sequence)) return;

      if (textToCopy !== null) {
        this.panel.showFeedback("Copie indisponible. Copiez manuellement le texte ci-dessous.");
        this.panel.showManualCopy(textToCopy);
      } else {
        console.warn("Cadranote : préparation du contexte impossible", error);
        this.panel.showFeedback(
          "Impossible de préparer ce contexte. Sélectionnez à nouveau l’élément.",
        );
      }
    }
  }

  private isCurrentCopy(sequence: number): boolean {
    return !this.lifetime.signal.aborted && sequence === this.copySequence;
  }
}
