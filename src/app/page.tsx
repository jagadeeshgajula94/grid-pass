import type { ReactElement } from "react";
import Link from "next/link";

export default function Home(): ReactElement {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">GridPass</h1>
      <p>Your city. Your EV. One connected network.</p>
      <nav className="form-switch">
        <Link href="/login">Sign in</Link> ·{" "}
        <Link href="/register">Create an account</Link>
      </nav>
    </main>
  );
}
