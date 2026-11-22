import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

export type SheetSnap = "peek" | "half" | "full";
const SNAPS: SheetSnap[] = ["peek", "half", "full"];
const KEY_STEPS = new Map([
  ["ArrowUp", 1],
  ["ArrowRight", 1],
  ["ArrowDown", -1],
  ["ArrowLeft", -1],
  ["Enter", 1],
  [" ", 1],
]);
export function sheetHeights(viewport: number): number[] {
  return [150, viewport * 0.5, viewport - 80];
}
export function nearestSnap(height: number, viewport: number): SheetSnap {
  const heights = sheetHeights(viewport);
  const index = heights.reduce(
    (best, value, current) =>
      Math.abs(value - height) < Math.abs((heights.at(best) ?? 150) - height)
        ? current
        : best,
    0,
  );
  return SNAPS.at(index) ?? "peek";
}
function resizeWithKeys(
  event: KeyboardEvent<HTMLDivElement>,
  snap: SheetSnap,
  setSnap: (snap: SheetSnap) => void,
): void {
  if (event.key === "Home") setSnap("peek");
  else if (event.key === "End") setSnap("full");
  else if (KEY_STEPS.has(event.key))
    setSnap(
      SNAPS.at(
        Math.max(
          0,
          Math.min(2, SNAPS.indexOf(snap) + (KEY_STEPS.get(event.key) ?? 0)),
        ),
      ) ?? "peek",
    );
  else return;
  event.preventDefault();
}
interface SheetDrag {
  height: number | undefined;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
}
function releasedSnap(
  snap: SheetSnap,
  distance: number,
  height: number,
): SheetSnap | undefined {
  if (Math.abs(distance) < 5) return snap === "peek" ? "half" : "peek";
  if (window.innerWidth >= 768) return undefined;
  return nearestSnap(height + distance, window.innerHeight);
}
function useSheetDrag(
  snap: SheetSnap,
  setSnap: (snap: SheetSnap) => void,
): SheetDrag {
  const [height, setHeight] = useState<number>();
  const drag = useRef<{ y: number; height: number } | null>(null);
  const cancel = (): void => {
    drag.current = null;
    setHeight(undefined);
  };
  return {
    height,
    onPointerDown: (event): void => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const measured =
        event.currentTarget.parentElement?.getBoundingClientRect().height;
      drag.current = {
        y: event.clientY,
        height:
          measured ||
          (sheetHeights(window.innerHeight).at(SNAPS.indexOf(snap)) ?? 150),
      };
    },
    onPointerMove: (event): void => {
      if (drag.current && window.innerWidth < 768)
        setHeight(
          Math.max(
            150,
            Math.min(
              window.innerHeight - 80,
              drag.current.height + drag.current.y - event.clientY,
            ),
          ),
        );
    },
    onPointerUp: (event): void => {
      if (!drag.current) return;
      const distance = drag.current.y - event.clientY;
      const next = releasedSnap(snap, distance, drag.current.height);
      if (next) setSnap(next);
      cancel();
    },
    onPointerCancel: cancel,
  };
}
export function useSheet(): ReturnType<typeof useSheetDrag> & {
  snap: SheetSnap;
  setSnap: (snap: SheetSnap) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
} {
  const [snap, setSnap] = useState<SheetSnap>("peek");
  useEffect(() => {
    if (window.innerWidth >= 768) setSnap("half");
  }, []);
  const drag = useSheetDrag(snap, setSnap);
  return {
    ...drag,
    snap,
    setSnap,
    onKeyDown: (event): void => resizeWithKeys(event, snap, setSnap),
  };
}
