# SpinMill Pro

## Current State
Production Orders have:
- Product Type: Carded / Combed (enum: `carded`, `combed`)
- Type field (twistDirection): OE / RS (`s` = OE, `z` = RS)
- No "Unit" field
- No "End Use" field

## Requested Changes (Diff)

### Add
- **Unit** field on ProductionOrder: options `Openend` / `Ring Spinning`
- **Product Type** options extended: add `Polyester`, `Bamboo`, `Viscose`, `LT` (in addition to existing Carded / Combed)
- **End Use** field on ProductionOrder: options `Warp`, `Weft`, `Pile`, `Ground`, `TFO`

### Modify
- Backend: extend `ProductType` enum with `polyester`, `bamboo`, `viscose`, `lt`
- Backend: add new `SpinningUnit` enum with `openend`, `ringSpinning`
- Backend: add new `EndUse` enum with `warp`, `weft`, `pile`, `ground`, `tfo`
- Backend: add `spinningUnit: SpinningUnit` and `endUse: EndUse` fields to `ProductionOrder`
- Backend: update `createProductionOrder` and `updateProductionOrder` to accept the two new fields
- Frontend ProductionOrders.tsx: add Unit select (Openend / Ring Spinning) and End Use select (Warp/Weft/Pile/Ground/TFO) in the form
- Frontend ProductionOrders.tsx: add Unit and End Use columns to the table
- Frontend ProductionOrders.tsx: update Product Type options to show all 6 options

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate Motoko backend with extended enums and fields
2. Update `backend.d.ts` with new types
3. Update `ProductionOrders.tsx` form, table, and default values
4. Update any other pages that read/display production orders (ProductionLogs, YarnInventory) if needed
