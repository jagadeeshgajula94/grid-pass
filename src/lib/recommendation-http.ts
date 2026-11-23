import { NextResponse } from "next/server";
import { z } from "./zod";
import { EV_MODELS } from "../domain/ev-models";
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
    const model = z
      .enum(EV_MODELS)
      .safeParse(session.ok ? session.value.evModel : parsed.data.evModel);
    if (!model.success)
      return NextResponse.json(
        { error: "Choose an EV model to get charging recommendations." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      await recommendCharging(
        { ...parsed.data, evModel: model.data },
        requestId,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
