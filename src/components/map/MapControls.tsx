import { useEffect, useState, type ReactElement } from "react";
import { LocateFixed } from "lucide-react";
import { ThemeToggle } from "../auth/ThemeToggle";
import { WorkspaceHeader } from "./WorkspaceControls";

function usePhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const resize = (): void => setPhone(window.innerWidth < 768);
    resize();
    window.addEventListener("resize", resize);
    return (): void => window.removeEventListener("resize", resize);
  }, []);
  return phone;
}
export function MapControls({
  firstName,
  onTheme,
  onRecenter,
  fullSheet = false,
}: {
  firstName?: string;
  onTheme: (light: boolean) => void;
  onRecenter: () => void;
  fullSheet?: boolean;
}): ReactElement {
  const phone = usePhone();
  return (
    <>
      <WorkspaceHeader firstName={firstName} />
      <nav
        className="map-controls"
        aria-label="Map controls"
        hidden={phone && fullSheet}
      >
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
