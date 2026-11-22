// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthForm } from "../src/components/auth/AuthForm";
import { PasswordStrength } from "../src/components/auth/PasswordStrength";
import { AuthShell } from "../src/components/auth/AuthShell";
import { ThemeToggle } from "../src/components/auth/ThemeToggle";
import { SignOutButton } from "../src/components/auth/SignOutButton";
import { submitAuth } from "../src/components/auth/auth-client";
import LoginPage from "../src/app/login/page";
import RegisterPage from "../src/app/register/page";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
function fillLogin(): void {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ExamplePassword123!" },
  });
}
it("renders inline strict validation errors on blur and submit", () => {
  render(<AuthForm mode="register" />);
  fireEvent.blur(screen.getByLabelText("Full name"));
  expect(screen.getByLabelText("Full name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Email address")).toHaveAttribute(
    "aria-describedby",
    "email-error",
  );
  fireEvent.click(screen.getByRole("button", { name: "Create account ↗" }));
  expect(screen.getByText("Choose your EV model")).toBeInTheDocument();
});
it("renders rule-driven strength meter", () => {
  const { rerender } = render(<PasswordStrength password="" />);
  expect(screen.getByRole("meter")).toHaveAttribute("value", "0");
  rerender(<PasswordStrength password="StrongExample123!" />);
  expect(screen.getByRole("meter")).toHaveAttribute("value", "5");
});
it("submits a login and safely navigates on success", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("{}", { status: 200 }),
  );
  render(<AuthForm mode="login" next="/map?city=delhi" />);
  fillLogin();
  fireEvent.click(screen.getByRole("button", { name: "Sign in ↗" }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith("/map?city=delhi"),
  );
});
it("shows safe server errors and disables pending submit", async () => {
  const deferred = Promise.withResolvers<Response>();
  vi.spyOn(globalThis, "fetch").mockImplementation(() => deferred.promise);
  render(<AuthForm mode="login" />);
  fillLogin();
  fireEvent.click(screen.getByRole("button", { name: "Sign in ↗" }));
  expect(screen.getByRole("button", { name: "Connecting…" })).toBeDisabled();
  deferred.resolve(
    new Response(JSON.stringify({ error: "Invalid email or password" }), {
      status: 401,
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid email or password",
  );
});
it("handles network, unexpected error payload and malformed response", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error("offline"));
  expect((await submitAuth("login", {})).ok).toBe(false);
  fetchMock.mockResolvedValueOnce(new Response("null", { status: 500 }));
  expect((await submitAuth("register", {})).ok).toBe(false);
  fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
  expect((await submitAuth("login", {})).ok).toBe(false);
});
it("renders sample telemetry as text and applies only theme preference", () => {
  localStorage.setItem("theme", "light");
  render(
    <AuthShell>
      <span>{"<script>alert(1)</script>"}</span>
    </AuthShell>,
  );
  expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
  expect(document.documentElement).toHaveClass("light");
  fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(document.documentElement).not.toHaveClass("light");
});
it("supports browsers without persistent storage", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toBeInTheDocument();
});
it("signs out and reports failed signout", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith("/login"),
  );
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to sign out",
  );
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Connection unavailable",
    ),
  );
});
it("composes login and register pages", async () => {
  const login = await LoginPage({
    searchParams: Promise.resolve({ next: "//evil.example" }),
  });
  render(login);
  expect(
    screen.getByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
  cleanup();
  render(<RegisterPage />);
  expect(
    screen.getByRole("heading", { name: "Make the connection." }),
  ).toBeInTheDocument();
});
