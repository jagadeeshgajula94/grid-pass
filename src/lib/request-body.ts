import { readLimited } from "./upstream-fetch";

export async function readApiBody(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  try {
    return await readLimited(
      new Response(request.body, { headers: request.headers }),
      maxBytes,
    );
  } catch {
    return undefined;
  }
}
