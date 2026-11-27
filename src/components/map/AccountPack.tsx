import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { VehiclePicker } from "../VehiclePicker";
import { legacyPack } from "../../domain/ev-catalogue";
import { submitAuth } from "../auth/auth-client";
export function AccountPack({
  model,
  onConfirmed,
}: {
  model: string;
  onConfirmed: (id: string) => void;
}): ReactElement {
  const router = useRouter();
  const canonical = legacyPack(model)?.pack.model ?? model;
  const [variantId, setVariantId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function confirm(): Promise<void> {
    setPending(true);
    setError("");
    const result = await submitAuth("me", { variantId });
    if (result.ok) {
      onConfirmed(variantId);
      router.refresh();
    } else setError(result.error.message);
    setPending(false);
  }
  return (
    <AccountPackPanel
      model={canonical}
      variantId={variantId}
      pending={pending}
      error={error}
      onChoice={setVariantId}
      onConfirm={() => void confirm()}
    />
  );
}
function AccountPackPanel({
  model,
  variantId,
  pending,
  error,
  onChoice,
  onConfirm,
}: {
  model: string;
  variantId: string;
  pending: boolean;
  error: string;
  onChoice: (id: string) => void;
  onConfirm: () => void;
}): ReactElement {
  return (
    <section className="account-pack" aria-label="Confirm your battery pack">
      <h3>Confirm your battery pack</h3>
      <p>Using your model’s smallest verified pack until you confirm.</p>
      <VehiclePicker
        model={model}
        variantId={variantId}
        locked
        onChange={(value) => onChoice(value.variantId)}
      />
      <button
        type="button"
        className="map-action"
        disabled={!variantId || pending}
        onClick={onConfirm}
      >
        {pending ? "Saving…" : "Confirm pack"}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
