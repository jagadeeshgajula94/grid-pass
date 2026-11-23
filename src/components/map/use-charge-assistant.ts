import { useEffect, useRef, useState } from "react";
import { EV_MODELS, type EvModel } from "../../domain/ev-models";
import type {
  RecommendationContext,
  RecommendationDto,
} from "../../domain/recommendation";
import { fetchRecommendations } from "./recommendation-client";
interface AssistantState {
  data: RecommendationDto | null;
  loading: boolean;
  error: string;
}
export function useChargeAssistant(
  context: RecommendationContext,
  accountModel: string,
  onReset?: () => void,
): AssistantState & {
  battery: number;
  setBattery: (value: number) => void;
  model: EvModel | "";
  setModel: (value: EvModel | "") => void;
  submit: () => void;
} {
  const [battery, setBattery] = useState(35);
  const [model, setModel] = useState<EvModel | "">(
    EV_MODELS.find((value) => value === accountModel) ?? "",
  );
  return {
    ...useAssistantRequest(context, battery, model, onReset),
    battery,
    setBattery,
    model,
    setModel,
  };
}
function useAssistantRequest(
  context: RecommendationContext,
  battery: number,
  model: EvModel | "",
  onReset?: () => void,
): AssistantState & { submit: () => void } {
  const [state, setState] = useState<AssistantState>({
    data: null,
    loading: false,
    error: "",
  });
  const controller = useRef<AbortController | null>(null);
  const contextKey = JSON.stringify(context);
  useEffect(() => {
    controller.current?.abort();
    onReset?.();
    setState({ data: null, loading: false, error: "" });
    return (): void => controller.current?.abort();
  }, [contextKey, battery, model, onReset]);
  const submit = (): void => {
    controller.current?.abort();
    onReset?.();
    const request = new AbortController();
    controller.current = request;
    setState({ data: null, loading: true, error: "" });
    void fetchRecommendations(
      { batteryPercent: battery, evModel: model || undefined, context },
      request.signal,
    ).then((result) => {
      if (!request.signal.aborted)
        setState({
          data: result.ok ? result.value : null,
          loading: false,
          error: result.ok ? "" : result.error.message,
        });
    });
  };
  return { ...state, submit };
}
