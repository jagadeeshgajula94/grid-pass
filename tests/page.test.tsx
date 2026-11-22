// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Home from "../src/app/page";
import RootLayout from "../src/app/layout";
import { cn } from "../src/lib/utils";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

it("renders the minimal foundation", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "GridPass" })).toBeInTheDocument();
});

it("provides a dynamic document layout", async () => {
  const layout = await RootLayout({ children: <Home /> });
  expect(layout.type).toBe("html");
});

it("merges utility classes including empty inputs", () => {
  expect(cn()).toBe("");
  expect(cn("p-2", "p-4")).toBe("p-4");
});
