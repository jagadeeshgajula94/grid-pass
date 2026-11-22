import type { ReactElement } from "react";
import { LocateFixed } from "lucide-react";
import { ThemeToggle } from "../auth/ThemeToggle";
import { WorkspaceHeader } from "./WorkspaceControls";

export function MapControls({
  firstName,
  onTheme,
  onRecenter,
}: {
  firstName?: string;
  onTheme: (light: boolean) => void;
  onRecenter: () => void;
}): ReactElement {
  return (
    <>
      <WorkspaceHeader firstName={firstName} />
      <nav className="map-controls" aria-label="Map controls">
        <button
          className="round-control glass"
          aria-label="Current location"
          onClick={onRecenter}
        >
          <LocateFixed size={20} />
        </button>
        <ThemeToggle onChange={onTheme} />
      </nav>
    </>
  );
}
