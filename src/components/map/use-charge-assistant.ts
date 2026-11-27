import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { EV_MODELS, type EvModel } from "../../domain/ev-catalogue";
import type {
  RecommendationContext,
  RecommendationDto,
  RecommendationRequest,
} from "../../domain/recommendation";
import { fetchRecommendations } from "./recommendation-client";
interface AssistantState {
  data: RecommendationDto | null;
  loading: boolean;
  error: string;
  resultContext: RecommendationContext | null;
  resultKey: string | null;
}
const INITIAL_STATE: AssistantState = {
  data: null,
  loading: false,
  error: "",
  resultContext: null,
  resultKey: null,
};
export function useChargeAssistant(
  context: RecommendationContext,
  accountModel: string,
  onReset?: () => void,
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">,
  initialVariant = "",
): AssistantState & {
  variantId: string;
  setVariantId: (value: string) => void;
  battery: number;
  setBattery: (value: number) => void;
  model: EvModel | "";
  setModel: (value: EvModel | "") => void;
  submit: () => void;
  contextChanged: boolean;
} {
  const [variantId, setVariantId] = useState(initialVariant);
  const [battery, setBattery] = useState(35);
  const [model, setModel] = useState<EvModel | "">(
    EV_MODELS.find((value) => value === accountModel) ?? "",
  );
  return {
    ...useAssistantRequest(
      context,
      battery,
      { model, variantId },
      onReset,
      position,
    ),
    variantId,
    setVariantId,
    battery,
    setBattery,
    model,
    setModel,
  };
}
function useAssistantRequest(
  context: RecommendationContext,
  battery: number,
  vehicle: { model: EvModel | ""; variantId: string },
  onReset?: () => void,
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">,
): AssistantState & { submit: () => void; contextChanged: boolean } {
  const [state, setState] = useState<AssistantState>(INITIAL_STATE);
  const controller = useRef<AbortController | null>(null);
  const reset = useRef(onReset);
  const contextKey = JSON.stringify({ context, position });
  useEffect(() => {
    reset.current = onReset;
  }, [onReset]);
  useEffect(() => {
    controller.current?.abort();
    reset.current?.();
    setState(INITIAL_STATE);
    return (): void => controller.current?.abort();
  }, [battery, vehicle.model, vehicle.variantId]);
  const submit = (): void => {
    controller.current?.abort();
    onReset?.();
    const request = new AbortController();
    controller.current = request;
    setState({
      data: null,
      loading: true,
      error: "",
      resultContext: context,
      resultKey: contextKey,
    });
    void loadAssistant(
      assistantQuery(context, battery, vehicle, position),
      request,
      contextKey,
      setState,
    );
  };
  return {
    ...state,
    submit,
    contextChanged: state.resultKey !== null && state.resultKey !== contextKey,
  };
}

function requestPosition(
  context: RecommendationContext,
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">,
): Pick<RecommendationRequest, "carPosition" | "positionSource"> {
  if (position) return position;
  if (context.mode === "route")
    return { carPosition: context.origin, positionSource: "route" };
  return { carPosition: context.center, positionSource: "assumed" };
}
async function loadAssistant(
  query: RecommendationRequest,
  request: AbortController,
  resultKey: string,
  setState: Dispatch<SetStateAction<AssistantState>>,
): Promise<void> {
  const result = await fetchRecommendations(query, request.signal);
  if (!request.signal.aborted)
    setState({
      data: result.ok ? result.value : null,
      loading: false,
      error: result.ok ? "" : result.error.message,
      resultContext: query.context,
      resultKey,
    });
}

function assistantQuery(
  context: RecommendationContext,
  battery: number,
  vehicle: { model: EvModel | ""; variantId: string },
  position?: Pick<RecommendationRequest, "carPosition" | "positionSource">,
): RecommendationRequest {
  return {
    batteryPercent: battery,
    evModel: vehicle.model || undefined,
    ...(vehicle.variantId ? { variantId: vehicle.variantId } : {}),
    context,
    ...requestPosition(context, position),
  };
}
