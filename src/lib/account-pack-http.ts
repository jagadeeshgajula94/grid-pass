import { NextResponse } from "next/server";
import { authenticatedApi, invalidRequest, readApiBody } from "./api-http";
import { requestToken } from "./auth-http";
import { confirmPack } from "../services/auth.service";
import { packConfirmationSchema } from "../validation/pack.schema";
export function confirmAccountPack(request: Request): Promise<NextResponse> {
  return authenticatedApi(request, "account.pack", async () => {
    const parsed = packConfirmationSchema.safeParse(await readApiBody(request));
    if (!parsed.success) return invalidRequest(parsed.error);
    const result = await confirmPack(
      requestToken(request),
      parsed.data.variantId,
    );
    let status = 200;
    if (!result.ok) status = result.error.code === "VALIDATION" ? 400 : 401;
    return NextResponse.json(
      result.ok ? { user: result.value } : { error: result.error.message },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  });
}
