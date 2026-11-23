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
  resultContext: RecommendationContext | null;
}
const INITIAL_STATE: AssistantState = {
  data: null,
  loading: false,
  error: "",
  resultContext: null,
};
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
  contextChanged: boolean;
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
): AssistantState & { submit: () => void; contextChanged: boolean } {
  const [state, setState] = useState<AssistantState>(INITIAL_STATE);
  const controller = useRef<AbortController | null>(null);
  const reset = useRef(onReset);
  const contextKey = JSON.stringify(context);
  useEffect(() => {
    reset.current = onReset;
  }, [onReset]);
  useEffect(() => {
    controller.current?.abort();
    reset.current?.();
    setState(INITIAL_STATE);
    return (): void => controller.current?.abort();
  }, [battery, model]);
  const submit = (): void => {
    controller.current?.abort();
    onReset?.();
    const request = new AbortController();
    controller.current = request;
    setState({ data: null, loading: true, error: "", resultContext: context });
    void fetchRecommendations(
      { batteryPercent: battery, evModel: model || undefined, context },
      request.signal,
    ).then((result) => {
      if (!request.signal.aborted)
        setState({
          data: result.ok ? result.value : null,
          loading: false,
          error: result.ok ? "" : result.error.message,
          resultContext: context,
        });
    });
  };
  return {
    ...state,
    submit,
    contextChanged:
      state.resultContext !== null &&
      JSON.stringify(state.resultContext) !== contextKey,
  };
}
