import { NextResponse } from "next/server";
import { selectPack } from "../domain/ev-catalogue";
import { recommendCharging } from "../services/recommendation.service";
import { getCurrentUser } from "../services/auth.service";
import { recommendationSchema } from "../validation/recommendation.schema";
import { publicApi, invalidRequest, readApiBody } from "./api-http";
import { requestToken } from "./auth-http";
export function handleChargingRecommendations(
  request: Request,
): Promise<NextResponse> {
  return publicApi("recommendation.charging", async (requestId) => {
    const parsed = recommendationSchema.safeParse(await readApiBody(request));
    if (!parsed.success) return invalidRequest(parsed.error);
    const session = await getCurrentUser(requestToken(request));
    const selection = selectPack(session.ok ? session.value : parsed.data);
    if (!selection)
      return NextResponse.json(
        {
          error:
            "Choose an EV model and battery pack; unlisted cars are not supported yet.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      await recommendCharging(
        {
          ...parsed.data,
          evModel: selection.pack.model,
          variantId: selection.pack.id,
          packConfirmed: selection.packConfirmed,
        },
        requestId,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
