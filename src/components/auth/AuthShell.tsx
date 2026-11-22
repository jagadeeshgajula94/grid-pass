import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

function Telemetry(): ReactElement {
  return (
    <aside className="telemetry">
      <div className="eyebrow">
        NETWORK OVERVIEW <span className="badge pulse">LIVE</span>
      </div>
      <h2>
        A better way
        <br />
        to stay in charge.
      </h2>
      <p className="muted">Your EV. Your city. One connected network.</p>
      <NetworkStats />
      <div className="station-heading">
        <span>STATION SIGNALS</span>
        <span>INDIA / IST</span>
      </div>
      <Station
        name="Indiranagar"
        city="Bengaluru"
        power="120 kW"
        status="AVAILABLE"
      />
      <Station
        name="Bandra Kurla Complex"
        city="Mumbai"
        power="60 kW"
        status="BUSY"
      />
      <Station
        name="Aerocity"
        city="New Delhi"
        power="150 kW"
        status="AVAILABLE"
      />
      <p className="sample-note">
        Sample network telemetry · Not real-time availability
      </p>
    </aside>
  );
}
function NetworkStats(): ReactElement {
  return (
    <div className="stats">
      <div>
        <strong>1,284</strong>
        <span>Chargers online</span>
      </div>
      <div>
        <strong>62.4</strong>
        <span>Avg. power / kW</span>
      </div>
      <div>
        <strong>8,916</strong>
        <span>Sessions today</span>
      </div>
    </div>
  );
}
function Station({
  name,
  city,
  power,
  status,
}: {
  name: string;
  city: string;
  power: string;
  status: string;
}): ReactElement {
  return (
    <div className="station">
      <div>
        <strong>{name}</strong>
        <span>
          {city} · {power}
        </span>
      </div>
      <span className={`badge pulse ${status === "BUSY" ? "busy" : ""}`}>
        {status}
      </span>
    </div>
  );
}
export function AuthShell({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="auth-page">
      <header className="site-header">
        <Link href="/" className="brand">
          G<span>↗</span> GridPass <small>/ NETWORK</small>
        </Link>
        <ThemeToggle />
      </header>
      <div className="auth-grid">
        <Telemetry />
        <section className="form-panel">{children}</section>
      </div>
      <footer className="site-footer">
        <span>BUILT FOR THE ELECTRIC EVERYDAY.</span>
        <span>Secure access · GridPass V1</span>
      </footer>
    </main>
  );
}
