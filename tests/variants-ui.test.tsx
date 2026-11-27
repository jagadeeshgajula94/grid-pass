// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChargeAssistant } from "../src/components/map/ChargeAssistant";
import { AuthForm } from "../src/components/auth/AuthForm";
import {
  assistantResponse,
  nearbyContext,
  NEXON,
} from "./recommendation-fixtures";
import { SELECTABLE_PACKS } from "../src/domain/ev-catalogue";
const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const XEV = "Mahindra XEV 9e";
const FIND = "Find charging stops";
const PACK = "Battery pack";
const MODEL = "Your EV model";
const VARIANT = "tata-nexon-ev-45";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function renderAssistant(extra = {}): void {
  render(
    <ChargeAssistant
      context={nearbyContext}
      evModel={NEXON}
      onBack={vi.fn()}
      onShow={vi.fn()}
      {...extra}
    />,
  );
}
it("requires a supported guest model and pack, and clears the pack when the model changes", () => {
  renderAssistant({ evModel: "" });
  fireEvent.change(screen.getByLabelText(MODEL), { target: { value: NEXON } });
  expect(screen.getByRole("button", { name: FIND })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(PACK), { target: { value: VARIANT } });
  expect(screen.getByRole("button", { name: FIND })).toBeEnabled();
  expect(
    screen.getByRole("option", { name: "45 kWh · usable n/a" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(MODEL), {
    target: { value: XEV },
  });
  expect(screen.getByLabelText(PACK)).toHaveValue("");
  expect(screen.getByRole("button", { name: FIND })).toBeDisabled();
  const options = [...screen.getByLabelText(PACK).querySelectorAll("option")]
    .map((option) => option.value)
    .filter(Boolean);
  expect(options).toEqual(
    SELECTABLE_PACKS.filter((pack) => pack.model === XEV).map(
      (pack) => pack.id,
    ),
  );
});
it("sign-up sends the selected pack and preserves model/pack validation", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({}));
  vi.stubGlobal("fetch", fetcher);
  render(<AuthForm mode="register" />);
  for (const [label, value] of [
    ["Full name", "New Driver"],
    ["Mobile number (+91)", "+919876543210"],
    ["Email address", "new@example.com"],
    ["Password", "RegisterTestPassword123!"],
  ] as const)
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText(MODEL), { target: { value: NEXON } });
  fireEvent.click(screen.getByRole("button", { name: "Create account ↗" }));
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByLabelText(PACK)).toHaveAccessibleDescription(
    "Choose your EV model and battery pack",
  );
  fireEvent.change(screen.getByLabelText(PACK), { target: { value: VARIANT } });
  fireEvent.click(screen.getByRole("button", { name: "Create account ↗" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  expect(JSON.parse(fetcher.mock.calls[0]?.[1].body)).toMatchObject({
    evModel: NEXON,
    variantId: VARIANT,
  });
});
it("prompts legacy accounts, keeps errors visible, and confirms the selected pack before refreshing", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: "Please retry" }, { status: 500 }),
    )
    .mockResolvedValueOnce(Response.json({}));
  vi.stubGlobal("fetch", fetcher);
  renderAssistant({
    accountPack: { variantId: "tata-nexon-ev-30", packConfirmed: false },
  });
  expect(
    screen.getByRole("region", { name: "Confirm your battery pack" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(PACK), { target: { value: VARIANT } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm pack" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please retry");
  fireEvent.click(screen.getByRole("button", { name: "Confirm pack" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Confirm your battery pack" }),
    ).toBeNull(),
  );
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/auth/me",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ variantId: VARIANT }),
    }),
  );
  expect(router.refresh).toHaveBeenCalledOnce();
  expect(screen.getByText(/45 kWh · usable n\/a/)).toBeInTheDocument();
});
it("renders a distinct Tier B warning, busy wait, demo provenance and energy-range header", async () => {
  const base = assistantResponse.recommendations[0];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ...assistantResponse,
        evModel: XEV,
        variantId: "mahindra-xev-9e-59",
        batteryPercent: 10,
        usableRangeKm: 35.75,
        tier: "B",
        message: "Low battery, go now, drive gently.",
        recommendations: [
          {
            ...base,
            tier: "B",
            arrivalPercent: 9.8,
            availableConnectors: 0,
            station: { ...base?.station, statusSource: "demo" },
            wait: {
              minutes: 30,
              availability: "busy",
              estimated: true,
              unverified: true,
            },
            reason:
              "busy, est. ~30 min wait (unverified) · 30 kW · arrive ~9.8% · ~91 min to 80%",
          },
        ],
      }),
    ),
  );
  renderAssistant({
    evModel: XEV,
    accountPack: { variantId: "mahindra-xev-9e-59", packConfirmed: true },
  });
  fireEvent.click(screen.getByRole("button", { name: FIND }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Low battery");
  expect(screen.getByText("demo status, not live")).toBeInTheDocument();
  expect(screen.getByText("Tier B · Low battery").closest("li")).toHaveClass(
    "assistant-result-low",
  );
  expect(
    screen.getByText(/10% · XEV 9e 59 kWh · ~35 km left/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/est. ~30 min wait \(unverified\)/),
  ).toBeInTheDocument();
});
it("renders unknown occupancy, the assumed-position note, and linked source assumptions", async () => {
  const base = assistantResponse.recommendations[0];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ...assistantResponse,
        positionSource: "assumed",
        recommendations: [
          {
            ...base,
            availableConnectors: 0,
            wait: {
              minutes: 10,
              availability: "unknown",
              estimated: true,
              unverified: true,
            },
          },
        ],
      }),
    ),
  );
  renderAssistant();
  fireEvent.click(screen.getByRole("button", { name: FIND }));
  expect(await screen.findByText("Availability unknown")).toBeInTheDocument();
  expect(
    screen.getByText("distances from map centre (location unavailable)"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByText("Figures approximate"));
  expect(screen.getByRole("link", { name: "EV data sources" })).toHaveAttribute(
    "href",
    expect.stringContaining("docs/EV-DATA-SOURCES.md"),
  );
  expect(screen.getByText(/not constant-speed 80 km\/h/)).toBeInTheDocument();
});
it("N6 shows the nearest-versus-range message without any stop card", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ...assistantResponse,
        tier: null,
        recommendations: [],
        message:
          "Nearest charger ~16 km, you have ~5 km: call roadside assistance.",
      }),
    ),
  );
  renderAssistant();
  fireEvent.click(screen.getByRole("button", { name: FIND }));
  expect(await screen.findByText(/Nearest charger ~16 km/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Show .* on map/ })).toBeNull();
});
