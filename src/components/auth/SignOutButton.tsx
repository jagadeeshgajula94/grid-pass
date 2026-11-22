"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";

export function SignOutButton(): ReactElement {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function signOut(): Promise<void> {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Unable to sign out. Please retry.");
        return;
      }
      router.replace("/map");
      router.refresh();
    } catch {
      setError("Connection unavailable. Please retry.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button className="primary-button" onClick={signOut} disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
