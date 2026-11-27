import { expect, it } from "vitest";
import {
  EV_CATALOGUE,
  EV_DATA_FIELDS,
  SELECTABLE_PACKS,
  legacyPack,
  selectPack,
} from "../src/domain/ev-catalogue";
it("verifies catalogue coverage, provenance, selectable IDs and conservative legacy mappings", () => {
  expect(EV_CATALOGUE).toHaveLength(27);
  expect(new Set(EV_CATALOGUE.map((pack) => pack.model)).size).toBe(16);
  expect(new Set(SELECTABLE_PACKS.map((pack) => pack.id)).size).toBe(
    SELECTABLE_PACKS.length,
  );
  for (const pack of EV_CATALOGUE) {
    expect(pack.nominalKwh).toBeGreaterThan(0);
    expect(pack.usableKwh).toBeNull();
    expect(legacyPack(pack.model)?.pack.nominalKwh).toBeLessThanOrEqual(
      pack.nominalKwh,
    );
    expect(Object.keys(pack.provenance)).toEqual([...EV_DATA_FIELDS]);
    for (const provenance of Object.values(pack.provenance)) {
      if (provenance.kind === "estimate") expect(provenance.source).toBeNull();
      else expect(new URL(provenance.source ?? "").protocol).toBe("https:");
    }
  }
  expect(legacyPack("Mahindra XUV 9e")).toMatchObject({
    pack: { nominalKwh: 59 },
    packConfirmed: false,
  });
  expect(legacyPack("Kia EV6")).toMatchObject({
    pack: { nominalKwh: 77.4 },
    packConfirmed: false,
  });
  expect(legacyPack("not supported")).toBeUndefined();
  expect(
    selectPack({ variantId: "unsupported", evModel: "Kia EV6" }),
  ).toBeUndefined();
  expect(selectPack({})).toBeUndefined();
});
