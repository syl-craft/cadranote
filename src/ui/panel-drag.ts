/** Keep panel positioning local to the UI, independent of the selected element. */
export function installPanelDrag(panel: HTMLElement, signal: AbortSignal): void {
  const header = panel.querySelector("header")!;
  let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;

  const position = (left: number, top: number): void => {
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(0, Math.min(left, window.innerWidth - rect.width))}px`;
    panel.style.top = `${Math.max(0, Math.min(top, window.innerHeight - rect.height))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  };

  const finish = (): void => {
    if (!drag) return;
    const { pointerId } = drag;
    drag = null;
    delete panel.dataset.dragging;
    if (header.hasPointerCapture(pointerId)) header.releasePointerCapture(pointerId);
  };

  header.addEventListener(
    "pointerdown",
    (event) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      header.setPointerCapture(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      panel.dataset.dragging = "true";
      event.preventDefault();
    },
    { signal },
  );

  header.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      position(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    },
    { signal },
  );

  for (const name of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    header.addEventListener(
      name,
      (event) => {
        if (event.pointerId === drag?.pointerId) finish();
      },
      { signal },
    );
  }
  window.addEventListener("blur", finish, { signal });

  const keepVisible = (): void => {
    if (!panel.style.left) return;
    const rect = panel.getBoundingClientRect();
    position(rect.left, rect.top);
  };
  window.addEventListener("resize", keepVisible, { signal });
  const observer = new ResizeObserver(keepVisible);
  observer.observe(panel);
  signal.addEventListener(
    "abort",
    () => {
      finish();
      observer.disconnect();
    },
    { once: true },
  );
}
