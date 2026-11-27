import { useEffect, useRef, useState, type ReactElement } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { EV_MODELS, findPack, legacyPack } from "../../domain/ev-catalogue";
import { VehiclePicker, packLabel } from "../VehiclePicker";
import { AccountPack } from "./AccountPack";
import { estimateRange } from "../../services/range.service";
import type {
  ChargingRecommendation,
  RecommendationContext,
  RecommendationDto,
  RecommendationRequest,
} from "../../domain/recommendation";
import type { StationDto } from "../../domain/station";
import { useChargeAssistant } from "./use-charge-assistant";
type Assistant = ReturnType<typeof useChargeAssistant>;
export function AssistantButton({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <button className="assistant-trigger glass" onClick={onClick}>
      <Zap size={19} aria-hidden="true" />
      <span>Charge assistant</span>
    </button>
  );
}
function BatteryInput({ assistant }: { assistant: Assistant }): ReactElement {
  return (
    <fieldset className="assistant-battery">
      <legend>Current battery</legend>
      <label className="assistant-number">
        <input
          aria-label="Battery percentage"
          type="number"
          min={1}
          max={100}
          step={1}
          value={assistant.battery}
          onChange={(event) =>
            assistant.setBattery(
              Math.max(1, Math.min(100, Number(event.target.value) || 1)),
            )
          }
          required
        />
        <span>%</span>
      </label>
      <input
        aria-label="Battery level"
        type="range"
        min={1}
        max={100}
        step={1}
        value={assistant.battery}
        onChange={(event) => assistant.setBattery(Number(event.target.value))}
      />
      <span className="muted">1%</span>
      <span className="muted">100%</span>
    </fieldset>
  );
}
function ModelInput({
  assistant,
  accountModel,
}: {
  assistant: Assistant;
  accountModel: string;
}): ReactElement {
  const pack = findPack(assistant.variantId);
  if (accountModel)
    return (
      <p className="assistant-model">
        {accountModel}
        <small>From your account</small>
        {pack && <small>{packLabel(pack)}</small>}
      </p>
    );
  return (
    <VehiclePicker
      model={assistant.model}
      variantId={assistant.variantId}
      onChange={(value) => {
        assistant.setModel(
          EV_MODELS.find((model) => model === value.model) ?? "",
        );
        assistant.setVariantId(value.variantId);
      }}
    />
  );
}

function ResultCard({
  result,
  onShow,
}: {
  result: ChargingRecommendation;
  onShow: (station: StationDto) => void;
}): ReactElement {
  return (
    <li
      className={`assistant-result ${result.tier === "B" ? "assistant-result-low" : ""}`}
    >
      <div className="assistant-status-row">
        <span className="assistant-tier">
          {result.tier === "B" ? "Tier B · Low battery" : "Tier A"}
        </span>
        <span>{availabilityLabel(result.wait.availability)}</span>
      </div>
      <h3>{result.station.name}</h3>
      {result.station.statusSource === "demo" && (
        <small className="occupancy-note">demo status, not live</small>
      )}
      <p>{result.reason}</p>
      <div>
        <span className="muted">
          ~{result.roadDistanceKm.toFixed(1)} km drive
        </span>
        <button
          className="map-action"
          onClick={() => onShow(result.station)}
          aria-label={`Show ${result.station.name} on map`}
        >
          Show on map
        </button>
      </div>
    </li>
  );
}
function AssistantResults({
  data,
  onShow,
}: {
  data: RecommendationDto;
  onShow: (station: StationDto) => void;
}): ReactElement {
  return (
    <section
      className="assistant-results"
      data-tier={data.tier}
      aria-label="Charging recommendations"
      aria-live="polite"
    >
      <h3>
        {data.recommendations.length ? "Your best stops" : "Nothing reachable"}
      </h3>
      <p
        className="assistant-guidance"
        role={data.tier === "B" ? "alert" : undefined}
      >
        {data.message}
      </p>
      {data.routeMessage && <p>{data.routeMessage}</p>}
      <p className="muted">
        ~{Math.floor(data.usableRangeKm)} km estimated · ~
        {Math.floor(data.reachableRangeKm)} km conservative reach
      </p>
      <ol>
        {data.recommendations.map((result) => (
          <ResultCard key={result.station.id} result={result} onShow={onShow} />
        ))}
      </ol>
      {data.approximateRoadDistances && (
        <p className="muted">
          Road distances are approximate.{" "}
          {data.contextMode === "route"
            ? "Road routing is unavailable; allow extra range."
            : "Straight-line distance × 1.3."}
        </p>
      )}
    </section>
  );
}
interface AssistantProps {
  context: RecommendationContext;
  evModel: string;
  onBack: () => void;
  onShow: (station: StationDto) => void;
  onReset?: () => void;
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">;
  accountPack?: { variantId?: string; packConfirmed?: boolean };
}
export function ChargeAssistant({
  context,
  evModel,
  onBack,
  onShow,
  onReset,
  position,
  accountPack,
}: AssistantProps): ReactElement {
  const assistant = useChargeAssistant(
    context,
    evModel,
    onReset,
    position,
    accountPack?.variantId,
  );
  const [confirmed, setConfirmed] = useState(
    accountPack?.packConfirmed !== false,
  );
  const resultContext = assistant.resultContext ?? context;
  return (
    <section className="charge-assistant" aria-labelledby="assistant-title">
      <AssistantHeader context={resultContext} onBack={onBack} />
      {!confirmed && (
        <AccountPack
          model={evModel}
          onConfirmed={(id) => {
            assistant.setVariantId(id);
            setConfirmed(true);
          }}
        />
      )}
      <AssistantInputs assistant={assistant} evModel={evModel} />
      <AssistantContextUpdate assistant={assistant} />
      {assistant.loading && <p role="status">Checking compatible chargers…</p>}
      {assistant.error && <p role="alert">{assistant.error}</p>}
      {assistant.data && (
        <AssistantResults data={assistant.data} onShow={onShow} />
      )}
      <AssistantDisclaimer data={assistant.data} />
    </section>
  );
}
function AssistantInputs({
  assistant,
  evModel,
}: {
  assistant: Assistant;
  evModel: string;
}): ReactElement {
  return (
    <details className="assistant-inputs" open={!assistant.data}>
      <summary>
        <RangeLine assistant={assistant} accountModel={evModel} /> · Adjust
      </summary>
      <AssistantForm assistant={assistant} evModel={evModel} />
    </details>
  );
}

function AssistantContextUpdate({
  assistant,
}: {
  assistant: Assistant;
}): ReactElement | null {
  if (!assistant.contextChanged) return null;
  return (
    <p className="assistant-context-update muted" role="status">
      Map moved ·{" "}
      <button
        className="map-action"
        type="button"
        onClick={assistant.submit}
        disabled={assistant.loading || !assistant.model}
      >
        Update stops
      </button>
    </p>
  );
}
function AssistantHeader({
  context,
  onBack,
}: {
  context: RecommendationContext;
  onBack: () => void;
}): ReactElement {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => back.current?.focus(), []);
  return (
    <>
      <div className="assistant-heading">
        <button ref={back} className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 id="assistant-title">
          <Zap size={22} />
          Charge assistant
        </h2>
      </div>
      <p className="muted">{contextDescription(context)}</p>
    </>
  );
}
function contextDescription(context: RecommendationContext): string {
  if (context.mode === "route") return "Stops along your route";
  if (context.mode === "area") return "Chargers in this map area";
  return `Chargers within ${context.radiusKm} km`;
}
function AssistantForm({
  assistant,
  evModel,
}: {
  assistant: Assistant;
  evModel: string;
}): ReactElement {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        assistant.submit();
      }}
    >
      <BatteryInput assistant={assistant} />
      <ModelInput assistant={assistant} accountModel={evModel} />
      <button
        className="assistant-submit"
        type="submit"
        disabled={
          !assistant.model ||
          (!evModel && !assistant.variantId) ||
          assistant.loading
        }
      >
        {assistant.loading ? "Finding your best stops…" : "Find charging stops"}
      </button>
    </form>
  );
}

function RangeLine({
  assistant,
  accountModel,
}: {
  assistant: Assistant;
  accountModel: string;
}): ReactElement {
  const pack =
    findPack(assistant.data?.variantId ?? assistant.variantId) ??
    legacyPack(accountModel)?.pack;
  if (!pack) return <>Choose your EV and battery pack</>;
  const range =
    assistant.data?.usableRangeKm ??
    estimateRange(pack, assistant.battery).rangeKm;
  return (
    <>
      {assistant.data?.batteryPercent ?? assistant.battery}% ·{" "}
      {pack.model.replace("Mahindra ", "")} {pack.nominalKwh} kWh · ~
      {Math.floor(range)} km left
    </>
  );
}
function AssistantDisclaimer({
  data,
}: {
  data: RecommendationDto | null;
}): ReactElement {
  return (
    <div className="assistant-disclaimer muted">
      {data?.positionSource === "assumed" && (
        <p>distances from map centre (location unavailable)</p>
      )}
      <details className="assistant-sources">
        <summary>Figures approximate</summary>
        <p>
          Nominal pack energy and measured test loops or consumption
          assumptions, with a 10% margin. Not a range guarantee. See{" "}
          <a
            href="https://github.com/jagadeeshgajula94/grid-pass/blob/feat/ev-variants-range/docs/EV-DATA-SOURCES.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            EV data sources
          </a>{" "}
          for each pack. Test loops are not constant-speed 80 km/h runs.
        </p>
      </details>
      <p>Confirm status before driving. Charging is not yet supported.</p>
    </div>
  );
}

function availabilityLabel(
  availability: ChargingRecommendation["wait"]["availability"],
): string {
  if (availability === "unknown") return "Availability unknown";
  return availability === "busy" ? "Busy" : "Free";
}
