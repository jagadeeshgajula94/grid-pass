"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type RefObject,
} from "react";
import { loginSchema, registerSchema } from "../../validation/auth.schema";
import { safeNext } from "../../lib/safe-next";
import { FormFields, type FieldErrors } from "./FormFields";
import { submitAuth } from "./auth-client";

function FormHeading({ isRegister }: { isRegister: boolean }): ReactElement {
  return (
    <div className="form-heading">
      <div className="eyebrow">
        {isRegister ? "JOIN THE NETWORK" : "YOUR NEXT CHARGE STARTS HERE"}
      </div>
      <h1>{isRegister ? "Make the connection." : "Welcome back."}</h1>
      <p className="muted">
        {isRegister
          ? "Create your account. Keep moving electric."
          : "Sign in to your GridPass account."}
      </p>
    </div>
  );
}
interface AuthFormProps {
  mode: "login" | "register";
  next?: string;
}
interface AuthFormState {
  form: RefObject<HTMLFormElement | null>;
  errors: FieldErrors;
  password: string;
  serverError: string;
  pending: boolean;
  isRegister: boolean;
  validate: () =>
    | ReturnType<typeof loginSchema.safeParse>
    | ReturnType<typeof registerSchema.safeParse>;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setPassword: (value: string) => void;
}
function useAuthForm({ mode, next = "/map" }: AuthFormProps): AuthFormState {
  const isRegister = mode === "register";
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const schema = isRegister ? registerSchema : loginSchema;
  function validate(): ReturnType<typeof schema.safeParse> {
    const parsed = schema.safeParse(
      Object.fromEntries(new FormData(form.current ?? undefined)),
    );
    setErrors(parsed.success ? {} : parsed.error.flatten().fieldErrors);
    return parsed;
  }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = validate();
    if (!parsed.success || pending) return;
    setPending(true);
    setServerError("");
    const result = await submitAuth(mode, parsed.data);
    if (result.ok) {
      router.replace(safeNext(next));
      router.refresh();
    } else setServerError(result.error.message);
    setPending(false);
  }
  return {
    form,
    errors,
    password,
    serverError,
    pending,
    validate,
    submit,
    setPassword,
    isRegister,
  };
}
function FormFooter({ isRegister }: { isRegister: boolean }): ReactElement {
  return (
    <>
      <p className="form-switch">
        {isRegister ? "Already connected?" : "New to the network?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
      <div className="security-note">
        ◈ &nbsp; Encrypted connection. Your credentials stay private.
      </div>
    </>
  );
}
function SubmitButton({
  isRegister,
  pending,
}: {
  isRegister: boolean;
  pending: boolean;
}): ReactElement {
  const label = isRegister ? "Create account ↗" : "Sign in ↗";
  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending && <span className="spinner" aria-hidden="true" />}
      {pending ? "Connecting…" : label}
    </button>
  );
}
export function AuthForm(props: AuthFormProps): ReactElement {
  const {
    form,
    errors,
    password,
    serverError,
    pending,
    validate,
    submit,
    setPassword,
    isRegister,
  } = useAuthForm(props);
  return (
    <div className="form-content">
      <FormHeading isRegister={isRegister} />
      <form
        ref={form}
        method="post"
        action={`/api/auth/${props.mode}`}
        noValidate
        onSubmit={submit}
      >
        <FormFields
          isRegister={isRegister}
          errors={errors}
          password={password}
          onPassword={setPassword}
          onBlur={() => {
            validate();
          }}
        />
        {serverError && (
          <p className="server-error" role="alert">
            {serverError}
          </p>
        )}
        <SubmitButton isRegister={isRegister} pending={pending} />
      </form>
      <FormFooter isRegister={isRegister} />
    </div>
  );
}
