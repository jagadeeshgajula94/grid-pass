import type { ReactElement } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { SignOutButton } from "../auth/SignOutButton";

export function WorkspaceHeader({
  firstName,
}: {
  firstName?: string;
}): ReactElement {
  return (
    <>
      <a className="map-brand glass" href="/map" aria-label="GridPass map">
        GRID<span>PASS</span>
      </a>
      <div className="map-account">
        {firstName ? (
          <details className="account-menu">
            <summary className="round-control glass" aria-label="Account">
              <UserRound size={20} />
            </summary>
            <div className="account-popover glass">
              <span>Hello, {firstName}</span>
              <SignOutButton />
            </div>
          </details>
        ) : (
          <Link
            className="round-control glass"
            href="/login"
            aria-label="Sign in"
          >
            <UserRound size={20} />
          </Link>
        )}
      </div>
    </>
  );
}
