import type { ReactNode, ReactElement } from "react";
import { headers } from "next/headers";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
