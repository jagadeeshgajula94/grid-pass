# EV data sources

All links below were opened during source verification. Fields marked estimate are not verified specifications. Nominal energy (not an invented usable-energy figure) drives S1. Unpublished usable energy remains null. Peak charger input in a brochure is not proof of a vehicle's peak acceptance, so DC limits remain the design's estimates unless explicitly verified. City/highway figures are the approved illustrative assumptions except the Nexon 45 measurement (1000 divided by Autocar's 7.9/7.67 km/kWh). Measurements are not guarantees; the algorithm adds its 10% consumption margin.

## Data calls

- 27 supported packs, 16 canonical models; none unconfirmed/unsupported. The explicitly approved historical EV6 77.4 pack maps legacy EV6 labels conservatively; its DC 240 kW is an estimate retained from the historical catalogue, not a claim that a 350 kW station supplies 350 kW to the car.
- XEV 9e 59 uses the opened manufacturer's 522 km, not the draft 542 km.
- Curvv uses Tata's MIDC P1+P2 430/502 km, not the older P1 502/585 km. Both have published 7.2 kW AC, not an assumed 11 kW for 55.
- Nexon MR brochure explicitly specifies a 6.6 kW on-board charger; its wall box's 7.2 kW is not the car's limit.
- Punch 25/35 are verified historical packs, not the newer 30/40 packs. Tiago uses updated P1+P2 range. Historical Ioniq 72.6 remains supported despite the live brochure now describing 84.
- Seal's manufacturer labels 510/650 NEDC; Autocar explicitly labels the same figures ARAI. Catalogue range/cycle cite Autocar, capacity cites BYD; this conflicting certification reporting does not enter the energy calculation.
- Unpublished limits use the design's values, including Comet DC 0. The Citroën manufacturer brochure is hosted by its Nepal distributor and cross-checked against the opened Indian Electree page (https://evelectree.com/cardetails/ec3/brochure).
- Worked-case arithmetic tests use the design's illustrative consumption independently from measured catalogue data.

## Mahindra XEV 9e — 59 kWh (`mahindra-xev-9e-59`)

| Field          | Value              | Kind      | Source                                                                                                                                           |
| -------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| nominalKwh     | 59                 | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                                |
| claimedRangeKm | 522                | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| testCycle      | MIDC               | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| maxDcKw        | 140                | estimate  | —                                                                                                                                                |
| maxAcKw        | 11                 | estimate  | —                                                                                                                                                |
| cityWhPerKm    | 150                | estimate  | —                                                                                                                                                |
| highwayWhPerKm | 180                | estimate  | —                                                                                                                                                |

## Mahindra XEV 9e — 79 kWh (`mahindra-xev-9e-79`)

| Field          | Value              | Kind      | Source                                                                                                                                           |
| -------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| nominalKwh     | 79                 | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                                |
| claimedRangeKm | 656                | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| testCycle      | MIDC               | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf) |
| maxDcKw        | 175                | estimate  | —                                                                                                                                                |
| maxAcKw        | 11                 | estimate  | —                                                                                                                                                |
| cityWhPerKm    | 155                | estimate  | —                                                                                                                                                |
| highwayWhPerKm | 185                | estimate  | —                                                                                                                                                |

## Mahindra BE 6 — 59 kWh (`mahindra-be-6-59`)

| Field          | Value              | Kind      | Source                                                                                                                                          |
| -------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 59                 | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                               |
| claimedRangeKm | 557                | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| maxDcKw        | 140                | estimate  | —                                                                                                                                               |
| maxAcKw        | 11                 | estimate  | —                                                                                                                                               |
| cityWhPerKm    | 145                | estimate  | —                                                                                                                                               |
| highwayWhPerKm | 175                | estimate  | —                                                                                                                                               |

## Mahindra BE 6 — 79 kWh (`mahindra-be-6-79`)

| Field          | Value              | Kind      | Source                                                                                                                                          |
| -------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 79                 | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                               |
| claimedRangeKm | 683                | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf) |
| maxDcKw        | 175                | estimate  | —                                                                                                                                               |
| maxAcKw        | 11                 | estimate  | —                                                                                                                                               |
| cityWhPerKm    | 150                | estimate  | —                                                                                                                                               |
| highwayWhPerKm | 180                | estimate  | —                                                                                                                                               |

## Mahindra XUV400 — 34.5 kWh (`mahindra-xuv400-34.5`)

| Field          | Value              | Kind      | Source                                                                                                            |
| -------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 34.5               | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                 |
| claimedRangeKm | 375                | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| testCycle      | MIDC               | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                                 |
| maxAcKw        | 3.3                | estimate  | —                                                                                                                 |
| cityWhPerKm    | 125                | estimate  | —                                                                                                                 |
| highwayWhPerKm | 155                | estimate  | —                                                                                                                 |

## Mahindra XUV400 — 39.4 kWh (`mahindra-xuv400-39.4`)

| Field          | Value              | Kind      | Source                                                                                                            |
| -------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 39.4               | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                 |
| claimedRangeKm | 456                | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| testCycle      | MIDC               | published | [source](https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                                 |
| maxAcKw        | 7.2                | estimate  | —                                                                                                                 |
| cityWhPerKm    | 125                | estimate  | —                                                                                                                 |
| highwayWhPerKm | 155                | estimate  | —                                                                                                                 |

## Tata Nexon EV — 30 kWh (`tata-nexon-ev-30`)

| Field          | Value              | Kind      | Source                                                                            |
| -------------- | ------------------ | --------- | --------------------------------------------------------------------------------- |
| nominalKwh     | 30                 | published | [source](https://ev.tata.cars/support.html)                                       |
| usableKwh      | null (unpublished) | estimate  | —                                                                                 |
| claimedRangeKm | 275                | published | [source](https://ev.tata.cars/support.html)                                       |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html)                                       |
| maxDcKw        | 50                 | estimate  | —                                                                                 |
| maxAcKw        | 6.6                | published | [source](https://www.autovikas.com/storage/brochures/autovikas/tata-nexon-ev.pdf) |
| cityWhPerKm    | 115                | estimate  | —                                                                                 |
| highwayWhPerKm | 145                | estimate  | —                                                                                 |

## Tata Nexon EV — 45 kWh (`tata-nexon-ev-45`)

| Field          | Value              | Kind      | Source                                                                                                                |
| -------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 45                 | published | [source](https://ev.tata.cars/support.html)                                                                           |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                     |
| claimedRangeKm | 489                | published | [source](https://ev.tata.cars/support.html)                                                                           |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html)                                                                           |
| maxDcKw        | 60                 | estimate  | —                                                                                                                     |
| maxAcKw        | 7.2                | published | [source](https://www.autovikas.com/storage/brochures/autovikas/tata-nexon-ev.pdf)                                     |
| cityWhPerKm    | 126.58227848101265 | measured  | [source](https://www.autocarindia.com/auto-features/tata-nexon-ev-range-real-world-mileage-test-45kwh-battery-433577) |
| highwayWhPerKm | 130.3780964797914  | measured  | [source](https://www.autocarindia.com/auto-features/tata-nexon-ev-range-real-world-mileage-test-45kwh-battery-433577) |

## Tata Punch EV — 25 kWh (`tata-punch-ev-25`)

| Field          | Value              | Kind      | Source                                                                                                                            |
| -------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 25                 | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                 |
| claimedRangeKm | 315                | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                                                 |
| maxAcKw        | 3.3                | estimate  | —                                                                                                                                 |
| cityWhPerKm    | 105                | estimate  | —                                                                                                                                 |
| highwayWhPerKm | 135                | estimate  | —                                                                                                                                 |

## Tata Punch EV — 35 kWh (`tata-punch-ev-35`)

| Field          | Value              | Kind      | Source                                                                                                                            |
| -------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 35                 | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                 |
| claimedRangeKm | 421                | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                                                 |
| maxAcKw        | 7.2                | estimate  | —                                                                                                                                 |
| cityWhPerKm    | 110                | estimate  | —                                                                                                                                 |
| highwayWhPerKm | 140                | estimate  | —                                                                                                                                 |

## Tata Tiago EV — 19.2 kWh (`tata-tiago-ev-19.2`)

| Field          | Value              | Kind      | Source                                      |
| -------------- | ------------------ | --------- | ------------------------------------------- |
| nominalKwh     | 19.2               | published | [source](https://ev.tata.cars/support.html) |
| usableKwh      | null (unpublished) | estimate  | —                                           |
| claimedRangeKm | 221                | published | [source](https://ev.tata.cars/support.html) |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html) |
| maxDcKw        | 25                 | estimate  | —                                           |
| maxAcKw        | 3.3                | estimate  | —                                           |
| cityWhPerKm    | 95                 | estimate  | —                                           |
| highwayWhPerKm | 125                | estimate  | —                                           |

## Tata Tiago EV — 24 kWh (`tata-tiago-ev-24`)

| Field          | Value              | Kind      | Source                                      |
| -------------- | ------------------ | --------- | ------------------------------------------- |
| nominalKwh     | 24                 | published | [source](https://ev.tata.cars/support.html) |
| usableKwh      | null (unpublished) | estimate  | —                                           |
| claimedRangeKm | 275                | published | [source](https://ev.tata.cars/support.html) |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html) |
| maxDcKw        | 25                 | estimate  | —                                           |
| maxAcKw        | 7.2                | estimate  | —                                           |
| cityWhPerKm    | 95                 | estimate  | —                                           |
| highwayWhPerKm | 125                | estimate  | —                                           |

## Tata Curvv EV — 45 kWh (`tata-curvv-ev-45`)

| Field          | Value              | Kind      | Source                                                                                                                                         |
| -------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 45                 | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                              |
| claimedRangeKm | 430                | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| maxDcKw        | 60                 | estimate  | —                                                                                                                                              |
| maxAcKw        | 7.2                | published | [source](https://static-cdn.team-bhp.com/prod/new-car-cms/Tata/Curvv-EV/2024/08/07/c1c353c0-feed-4cfe-8a3e-2f42254e29f2-curvv-ev-brochure.pdf) |
| cityWhPerKm    | 125                | estimate  | —                                                                                                                                              |
| highwayWhPerKm | 155                | estimate  | —                                                                                                                                              |

## Tata Curvv EV — 55 kWh (`tata-curvv-ev-55`)

| Field          | Value              | Kind      | Source                                                                                                                                         |
| -------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 55                 | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                                                              |
| claimedRangeKm | 502                | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| testCycle      | MIDC               | published | [source](https://ev.tata.cars/support.html)                                                                                                    |
| maxDcKw        | 70                 | estimate  | —                                                                                                                                              |
| maxAcKw        | 7.2                | published | [source](https://static-cdn.team-bhp.com/prod/new-car-cms/Tata/Curvv-EV/2024/08/07/c1c353c0-feed-4cfe-8a3e-2f42254e29f2-curvv-ev-brochure.pdf) |
| cityWhPerKm    | 130                | estimate  | —                                                                                                                                              |
| highwayWhPerKm | 160                | estimate  | —                                                                                                                                              |

## MG ZS EV — 50.3 kWh (`mg-zs-ev-50.3`)

| Field          | Value              | Kind      | Source                                                                    |
| -------------- | ------------------ | --------- | ------------------------------------------------------------------------- |
| nominalKwh     | 50.3               | published | [source](https://www.mgmotor.co.in/vehicles/mgzsev-electric-car-in-india) |
| usableKwh      | null (unpublished) | estimate  | —                                                                         |
| claimedRangeKm | 461                | published | [source](https://www.mgmotor.co.in/vehicles/mgzsev-electric-car-in-india) |
| testCycle      | ARAI               | published | [source](https://www.mgmotor.co.in/vehicles/mgzsev-electric-car-in-india) |
| maxDcKw        | 50                 | estimate  | —                                                                         |
| maxAcKw        | 7.4                | estimate  | —                                                                         |
| cityWhPerKm    | 140                | estimate  | —                                                                         |
| highwayWhPerKm | 170                | estimate  | —                                                                         |

## MG Windsor EV — 38 kWh (`mg-windsor-ev-38`)

| Field          | Value              | Kind      | Source                                                                                                    |
| -------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 38                 | published | [source](https://www.mgmotor.co.in/content/dam/brand/mgmotor/press-release/documents/mgi-pr-pdf-0056.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                         |
| claimedRangeKm | 332                | published | [source](https://www.mgmotor.co.in/content/dam/brand/mgmotor/press-release/documents/mgi-pr-pdf-0056.pdf) |
| testCycle      | ARAI               | published | [source](https://www.mgmotor.co.in/content/dam/brand/mgmotor/press-release/documents/mgi-pr-pdf-0056.pdf) |
| maxDcKw        | 45                 | estimate  | —                                                                                                         |
| maxAcKw        | 7.4                | estimate  | —                                                                                                         |
| cityWhPerKm    | 120                | estimate  | —                                                                                                         |
| highwayWhPerKm | 150                | estimate  | —                                                                                                         |

## MG Comet EV — 17.3 kWh (`mg-comet-ev-17.3`)

| Field          | Value              | Kind      | Source                                                                                                     |
| -------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 17.3               | published | [source](https://s7ap1.scene7.com/is/content/mgmotor/mgmotor/documents/MG%20Comet%20EV%20-%20Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                          |
| claimedRangeKm | 230                | published | [source](https://s7ap1.scene7.com/is/content/mgmotor/mgmotor/documents/MG%20Comet%20EV%20-%20Brochure.pdf) |
| testCycle      | ARAI               | published | [source](https://s7ap1.scene7.com/is/content/mgmotor/mgmotor/documents/MG%20Comet%20EV%20-%20Brochure.pdf) |
| maxDcKw        | 0                  | estimate  | —                                                                                                          |
| maxAcKw        | 3.3                | estimate  | —                                                                                                          |
| cityWhPerKm    | 95                 | estimate  | —                                                                                                          |
| highwayWhPerKm | 130                | estimate  | —                                                                                                          |

## Hyundai Creta Electric — 42 kWh (`hyundai-creta-electric-42`)

| Field          | Value              | Kind      | Source                                                                                             |
| -------------- | ------------------ | --------- | -------------------------------------------------------------------------------------------------- |
| nominalKwh     | 42                 | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                  |
| claimedRangeKm | 390                | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| testCycle      | ARAI               | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                  |
| maxAcKw        | 11                 | estimate  | —                                                                                                  |
| cityWhPerKm    | 125                | estimate  | —                                                                                                  |
| highwayWhPerKm | 155                | estimate  | —                                                                                                  |

## Hyundai Creta Electric — 51.4 kWh (`hyundai-creta-electric-51.4`)

| Field          | Value              | Kind      | Source                                                                                             |
| -------------- | ------------------ | --------- | -------------------------------------------------------------------------------------------------- |
| nominalKwh     | 51.4               | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                  |
| claimedRangeKm | 473                | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| testCycle      | ARAI               | published | [source](https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf) |
| maxDcKw        | 50                 | estimate  | —                                                                                                  |
| maxAcKw        | 11                 | estimate  | —                                                                                                  |
| cityWhPerKm    | 130                | estimate  | —                                                                                                  |
| highwayWhPerKm | 160                | estimate  | —                                                                                                  |

## Hyundai Ioniq 5 — 72.6 kWh (`hyundai-ioniq-5-72.6`)

| Field          | Value              | Kind      | Source                                                                                                 |
| -------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------ |
| nominalKwh     | 72.6               | published | [source](https://www.91wheels.com/news/hyundai-ioniq-5-ev-launched-at-rs-44-95-lakh-gets-631-km-range) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                      |
| claimedRangeKm | 631                | published | [source](https://www.91wheels.com/news/hyundai-ioniq-5-ev-launched-at-rs-44-95-lakh-gets-631-km-range) |
| testCycle      | ARAI               | published | [source](https://www.91wheels.com/news/hyundai-ioniq-5-ev-launched-at-rs-44-95-lakh-gets-631-km-range) |
| maxDcKw        | 220                | estimate  | —                                                                                                      |
| maxAcKw        | 11                 | estimate  | —                                                                                                      |
| cityWhPerKm    | 150                | estimate  | —                                                                                                      |
| highwayWhPerKm | 185                | estimate  | —                                                                                                      |

## BYD Atto 3 — 49.92 kWh (`byd-atto-3-49.92`)

| Field          | Value              | Kind      | Source                                                                                   |
| -------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------- |
| nominalKwh     | 49.92              | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                        |
| claimedRangeKm | 468                | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| testCycle      | ARAI               | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| maxDcKw        | 70                 | estimate  | —                                                                                        |
| maxAcKw        | 7                  | estimate  | —                                                                                        |
| cityWhPerKm    | 145                | estimate  | —                                                                                        |
| highwayWhPerKm | 175                | estimate  | —                                                                                        |

## BYD Atto 3 — 60.48 kWh (`byd-atto-3-60.48`)

| Field          | Value              | Kind      | Source                                                                                   |
| -------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------- |
| nominalKwh     | 60.48              | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                        |
| claimedRangeKm | 521                | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf) |
| maxDcKw        | 80                 | estimate  | —                                                                                        |
| maxAcKw        | 7                  | estimate  | —                                                                                        |
| cityWhPerKm    | 150                | estimate  | —                                                                                        |
| highwayWhPerKm | 180                | estimate  | —                                                                                        |

## BYD Seal — 61.44 kWh (`byd-seal-61.44`)

| Field          | Value              | Kind      | Source                                                     |
| -------------- | ------------------ | --------- | ---------------------------------------------------------- |
| nominalKwh     | 61.44              | published | [source](https://bydautoindia.com/bydseal)                 |
| usableKwh      | null (unpublished) | estimate  | —                                                          |
| claimedRangeKm | 510                | published | [source](https://www.autocarindia.com/cars/byd/seal/range) |
| testCycle      | ARAI               | published | [source](https://www.autocarindia.com/cars/byd/seal/range) |
| maxDcKw        | 110                | estimate  | —                                                          |
| maxAcKw        | 7                  | estimate  | —                                                          |
| cityWhPerKm    | 145                | estimate  | —                                                          |
| highwayWhPerKm | 170                | estimate  | —                                                          |

## BYD Seal — 82.56 kWh (`byd-seal-82.56`)

| Field          | Value              | Kind      | Source                                                     |
| -------------- | ------------------ | --------- | ---------------------------------------------------------- |
| nominalKwh     | 82.56              | published | [source](https://bydautoindia.com/bydseal)                 |
| usableKwh      | null (unpublished) | estimate  | —                                                          |
| claimedRangeKm | 650                | published | [source](https://www.autocarindia.com/cars/byd/seal/range) |
| testCycle      | ARAI               | published | [source](https://www.autocarindia.com/cars/byd/seal/range) |
| maxDcKw        | 150                | estimate  | —                                                          |
| maxAcKw        | 7                  | estimate  | —                                                          |
| cityWhPerKm    | 150                | estimate  | —                                                          |
| highwayWhPerKm | 175                | estimate  | —                                                          |

## Kia EV6 — 77.4 kWh (`kia-ev6-77.4`)

| Field          | Value              | Kind      | Source                                                                                                   |
| -------------- | ------------------ | --------- | -------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 77.4               | published | [source](https://www.kia.com/content/dam/kia2/in/en/our-vehicles/showroom/Brochures/Kia-EV6_Desktop.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                        |
| claimedRangeKm | 708                | published | [source](https://www.kia.com/content/dam/kia2/in/en/our-vehicles/showroom/Brochures/Kia-EV6_Desktop.pdf) |
| testCycle      | ARAI               | published | [source](https://www.kia.com/content/dam/kia2/in/en/our-vehicles/showroom/Brochures/Kia-EV6_Desktop.pdf) |
| maxDcKw        | 240                | estimate  | —                                                                                                        |
| maxAcKw        | 11                 | estimate  | —                                                                                                        |
| cityWhPerKm    | 160                | estimate  | —                                                                                                        |
| highwayWhPerKm | 190                | estimate  | —                                                                                                        |

## Kia EV6 — 84 kWh (`kia-ev6-84`)

| Field          | Value              | Kind      | Source                                                                                                         |
| -------------- | ------------------ | --------- | -------------------------------------------------------------------------------------------------------------- |
| nominalKwh     | 84                 | published | [source](https://www.kia.com/content/dam/kia2/in/en/images/buy/download-brochure/Ev6-Latest-Brochure-2025.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                              |
| claimedRangeKm | 663                | published | [source](https://www.kia.com/content/dam/kia2/in/en/images/buy/download-brochure/Ev6-Latest-Brochure-2025.pdf) |
| testCycle      | MIDC               | published | [source](https://www.kia.com/content/dam/kia2/in/en/images/buy/download-brochure/Ev6-Latest-Brochure-2025.pdf) |
| maxDcKw        | 258                | estimate  | —                                                                                                              |
| maxAcKw        | 11                 | estimate  | —                                                                                                              |
| cityWhPerKm    | 160                | estimate  | —                                                                                                              |
| highwayWhPerKm | 190                | estimate  | —                                                                                                              |

## Citroën eC3 — 29.2 kWh (`citroen-ec3-29.2`)

| Field          | Value              | Kind      | Source                                                                                            |
| -------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------- |
| nominalKwh     | 29.2               | published | [source](https://www.citroennepal.com/content/dam/citroen/nepal/new-e-c3/e-C3-Shine-Brochure.pdf) |
| usableKwh      | null (unpublished) | estimate  | —                                                                                                 |
| claimedRangeKm | 320                | published | [source](https://www.citroennepal.com/content/dam/citroen/nepal/new-e-c3/e-C3-Shine-Brochure.pdf) |
| testCycle      | MIDC               | published | [source](https://www.citroennepal.com/content/dam/citroen/nepal/new-e-c3/e-C3-Shine-Brochure.pdf) |
| maxDcKw        | 30                 | estimate  | —                                                                                                 |
| maxAcKw        | 3.3                | estimate  | —                                                                                                 |
| cityWhPerKm    | 115                | estimate  | —                                                                                                 |
| highwayWhPerKm | 145                | estimate  | —                                                                                                 |
