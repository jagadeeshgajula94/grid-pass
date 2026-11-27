import { useEffect, useRef, type ReactElement } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { EV_MODELS } from "../../domain/ev-catalogue";
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
  if (accountModel)
    return (
      <p className="assistant-model">
        {accountModel}
        <small>From your account</small>
      </p>
    );
  return (
    <label className="assistant-model-picker">
      Your EV model
      <select
        value={assistant.model}
        required
        onChange={(event) =>
          assistant.setModel(
            EV_MODELS.find((value) => value === event.target.value) ?? "",
          )
        }
      >
        <option value="">Choose your EV</option>
        {EV_MODELS.map((model) => (
          <option key={model}>{model}</option>
        ))}
      </select>
    </label>
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
    <li className="assistant-result">
      <h3>{result.station.name}</h3>
      <p>{result.reason}</p>
      <div>
        <span className="muted">~{result.roadDistanceKm} km drive</span>
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
      aria-label="Charging recommendations"
      aria-live="polite"
    >
      <h3>
        {data.recommendations.length ? "Your best stops" : "Nothing reachable"}
      </h3>
      <p>{data.message}</p>
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
export function ChargeAssistant({
  context,
  evModel,
  onBack,
  onShow,
  onReset,
  position,
}: {
  context: RecommendationContext;
  evModel: string;
  onBack: () => void;
  onShow: (station: StationDto) => void;
  onReset?: () => void;
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">;
}): ReactElement {
  const assistant = useChargeAssistant(context, evModel, onReset, position);
  const resultContext = assistant.resultContext ?? context;
  return (
    <section className="charge-assistant" aria-labelledby="assistant-title">
      <AssistantHeader context={resultContext} onBack={onBack} />
      <details className="assistant-inputs" open={!assistant.data}>
        <summary>
          {assistant.battery}% · {assistant.model || "Choose your EV"} · Adjust
        </summary>
        <AssistantForm assistant={assistant} evModel={evModel} />
      </details>
      <AssistantContextUpdate assistant={assistant} />
      {assistant.loading && (
        <p role="status">Checking compatible, available chargers…</p>
      )}
      {assistant.error && <p role="alert">{assistant.error}</p>}
      {assistant.data && (
        <AssistantResults data={assistant.data} onShow={onShow} />
      )}
      <p className="assistant-disclaimer muted">
        {assistant.data?.positionSource === "assumed" &&
          "Assumed car position; distances start at the submitted map centre. "}
        Approximate EV figures, not a range guarantee. Safety margins are
        estimates, not a guaranteed arrival reserve. Local demo status is not
        live; confirm before driving. Charging is not yet supported.
      </p>
    </section>
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
        disabled={!assistant.model || assistant.loading}
      >
        {assistant.loading ? "Finding your best stops…" : "Find charging stops"}
      </button>
    </form>
  );
}
