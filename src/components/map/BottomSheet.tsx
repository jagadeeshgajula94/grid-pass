import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import type { useSheet } from "./use-sheet";

function SheetHandle({
  sheet,
}: {
  sheet: ReturnType<typeof useSheet>;
}): ReactElement {
  return (
    <div
      className="sheet-handle"
      role="slider"
      tabIndex={0}
      aria-label="Panel height"
      aria-valuemin={0}
      aria-valuemax={2}
      aria-valuenow={["peek", "half", "full"].indexOf(sheet.snap)}
      aria-valuetext={sheet.snap}
      aria-orientation="vertical"
      onPointerDown={sheet.onPointerDown}
      onPointerMove={sheet.onPointerMove}
      onPointerUp={sheet.onPointerUp}
      onPointerCancel={sheet.onPointerCancel}
      onKeyDown={sheet.onKeyDown}
    >
      <span />
    </div>
  );
}
export function BottomSheet({
  sheet,
  children,
  onHeight,
}: {
  sheet: ReturnType<typeof useSheet>;
  children: ReactNode;
  onHeight: (height: number) => void;
}): ReactElement {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = panel.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      onHeight(element.getBoundingClientRect().height),
    );
    observer.observe(element);
    return (): void => observer.disconnect();
  }, [onHeight]);
  return (
    <section
      ref={panel}
      className="bottom-sheet glass"
      data-snap={sheet.snap}
      data-dragging={sheet.height !== undefined}
      aria-label="Explore charging"
      style={sheet.height ? { height: sheet.height } : undefined}
    >
      <SheetHandle sheet={sheet} />
      <div className="sheet-scroll">{children}</div>
    </section>
  );
}
