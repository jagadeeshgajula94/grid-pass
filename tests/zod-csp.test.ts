import { expect, it, vi } from "vitest";
import { z } from "../src/lib/zod";

it("validates objects without probing or invoking dynamic code under CSP", () => {
  const dynamicCode = vi
    .spyOn(globalThis, "Function")
    .mockImplementation(() => {
      throw new Error("Dynamic code is forbidden");
    });
  try {
    expect(z.config().jitless).toBe(true);
    const schema = z.object({ label: z.string().min(1) }).strict();
    expect(schema.safeParse({ label: "GridPass" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ label: "GridPass", extra: true }).success).toBe(
      false,
    );
    expect(dynamicCode).not.toHaveBeenCalled();
  } finally {
    dynamicCode.mockRestore();
  }
});
