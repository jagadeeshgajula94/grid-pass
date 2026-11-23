// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChargeAssistant } from "../src/components/map/ChargeAssistant";
import { fetchRecommendations } from "../src/components/map/recommendation-client";
import { useChargeAssistant } from "../src/components/map/use-charge-assistant";
import {
  assistantResponse,
  nearbyContext,
  NEXON,
} from "./recommendation-fixtures";
import type { RecommendationContext } from "../src/domain/recommendation";
const FIND_STOPS = "Find charging stops";
const BATTERY_PERCENT = "Battery percentage";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mockFetch(): ReturnType<typeof vi.fn> {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(Response.json(assistantResponse)),
    );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("collects a guest model, syncs slider/number, explains results, shows a station and returns", async () => {
  const fetcher = mockFetch();
  const onBack = vi.fn();
  const onShow = vi.fn();
  render(
    <ChargeAssistant
      context={nearbyContext}
      evModel=""
      onBack={onBack}
      onShow={onShow}
    />,
  );
  expect(screen.getByRole("button", { name: "Back" })).toHaveFocus();
  expect(screen.getByRole("button", { name: FIND_STOPS })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Your EV model"), {
    target: { value: NEXON },
  });
  fireEvent.change(screen.getByLabelText("Battery level"), {
    target: { value: "60" },
  });
  expect(screen.getByLabelText(BATTERY_PERCENT)).toHaveValue(60);
  fireEvent.change(screen.getByLabelText(BATTERY_PERCENT), {
    target: { value: "35" },
  });
  expect(screen.getByLabelText("Battery level")).toHaveValue("35");
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  await screen.findByRole("region", { name: "Charging recommendations" });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/recommendations/charging",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        batteryPercent: 35,
        evModel: NEXON,
        context: nearbyContext,
      }),
    }),
  );
  expect(
    screen.getByText(assistantResponse.recommendations[0]?.reason ?? ""),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Show .* on map/ }));
  expect(onShow).toHaveBeenCalledWith(
    assistantResponse.recommendations[0]?.station,
  );
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalledOnce();
});
it("uses the account model and plainly shows unreachable results", async () => {
  const fetcher = mockFetch();
  fetcher.mockResolvedValueOnce(
    Response.json({
      ...assistantResponse,
      recommendations: [],
      message: "No charger is reachable with the 10% arrival reserve.",
    }),
  );
  render(
    <ChargeAssistant
      context={{ ...nearbyContext, mode: "area" }}
      evModel={NEXON}
      onBack={vi.fn()}
      onShow={vi.fn()}
    />,
  );
  expect(screen.queryByLabelText("Your EV model")).toBeNull();
  expect(screen.getByText("From your account")).toBeInTheDocument();
  expect(screen.getByText("Chargers in this map area")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(BATTERY_PERCENT), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  expect(await screen.findByText("Nothing reachable")).toBeInTheDocument();
  expect(screen.getByText(/No charger is reachable/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Show .* on map/ })).toBeNull();
});
it("handles an empty number, clamps bounds, displays safe errors and permits retry", async () => {
  const fetcher = mockFetch();
  fetcher.mockResolvedValueOnce(new Response(null, { status: 429 }));
  render(
    <ChargeAssistant
      context={nearbyContext}
      evModel={NEXON}
      onBack={vi.fn()}
      onShow={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(BATTERY_PERCENT), {
    target: { value: "" },
  });
  expect(screen.getByLabelText(BATTERY_PERCENT)).toHaveValue(1);
  fireEvent.change(screen.getByLabelText(BATTERY_PERCENT), {
    target: { value: "999" },
  });
  expect(screen.getByLabelText(BATTERY_PERCENT)).toHaveValue(100);
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please wait a minute",
  );
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  await screen.findByRole("region", { name: "Charging recommendations" });
});
it("aborts stale requests when inputs or context change and on unmount", async () => {
  const fetcher = vi
    .fn()
    .mockReturnValue(new Promise<Response>(() => undefined));
  vi.stubGlobal("fetch", fetcher);
  const initialProps: { context: RecommendationContext } = {
    context: nearbyContext,
  };
  const { result, rerender, unmount } = renderHook(
    ({ context }: { context: RecommendationContext }) =>
      useChargeAssistant(context, NEXON),
    { initialProps },
  );
  act(() => result.current.submit());
  expect(result.current.loading).toBe(true);
  act(() => result.current.setBattery(60));
  expect(fetcher.mock.calls[0]?.[1].signal.aborted).toBe(true);
  act(() => result.current.submit());
  rerender({ context: { ...nearbyContext, mode: "area" } });
  expect(fetcher.mock.calls[1]?.[1].signal.aborted).toBe(true);
  act(() => result.current.submit());
  unmount();
  expect(fetcher.mock.calls[2]?.[1].signal.aborted).toBe(true);
});
it("rejects invalid response data and handles transport failures and cancellation", async () => {
  const fetcher = mockFetch();
  const query = { batteryPercent: 35, context: nearbyContext };
  fetcher.mockResolvedValueOnce(
    Response.json({
      ...assistantResponse,
      recommendations: [
        { ...assistantResponse.recommendations[0], arrivalPercent: 9 },
      ],
    }),
  );
  const invalid = await fetchRecommendations(
    query,
    new AbortController().signal,
  );
  expect(invalid.ok).toBe(false);
  fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
  expect(
    (await fetchRecommendations(query, new AbortController().signal)).ok,
  ).toBe(false);
  fetcher.mockRejectedValueOnce(new Error("private"));
  expect(
    (await fetchRecommendations(query, new AbortController().signal)).ok,
  ).toBe(false);
  const aborted = new AbortController();
  aborted.abort();
  fetcher.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
  expect(await fetchRecommendations(query, aborted.signal)).toEqual({
    ok: true,
    value: null,
  });
});
it("preserves and renders the service's route guidance as its own paragraph", async () => {
  const guidance = "Vijayawada is ~275 km away; charge before leaving.";
  mockFetch().mockResolvedValueOnce(
    Response.json({
      ...assistantResponse,
      contextMode: "route",
      routeMessage: guidance,
    }),
  );
  render(
    <ChargeAssistant
      context={{
        mode: "route",
        origin: nearbyContext.center,
        destination: { lat: 16.5062, lng: 80.648 },
        destinationName: "Vijayawada",
        bufferKm: 5,
      }}
      evModel={NEXON}
      onBack={vi.fn()}
      onShow={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  expect((await screen.findByText(guidance)).tagName).toBe("P");
});
it("clears previous results on a new context and ignores identical remeasurements", async () => {
  mockFetch();
  const reset = vi.fn();
  const { result, rerender } = renderHook(
    ({ context }: { context: RecommendationContext }) =>
      useChargeAssistant(context, NEXON, reset),
    { initialProps: { context: nearbyContext } },
  );
  act(() => result.current.submit());
  await waitFor(() => expect(result.current.data).not.toBeNull());
  reset.mockClear();
  rerender({ context: { ...nearbyContext } });
  expect(result.current.data).not.toBeNull();
  expect(reset).not.toHaveBeenCalled();
  rerender({ context: { ...nearbyContext, radiusKm: 10 } });
  expect(result.current.data).toBeNull();
  expect(reset).toHaveBeenCalledOnce();
});
