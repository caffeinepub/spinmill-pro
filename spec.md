# SpinMill Pro

## Current State
Full-stack textile spinning mill management app with modules for Raw Materials, Production Orders, Machines, Batch Tracking, Quality Control, Production Logs, Yarn Inventory, Purchase Orders (Procurement), Inward Entry, and Reports. The `ProductionOrder` type currently has: id, orderNumber, productType, yarnCountNe, twistDirection, quantityKg, targetDate, status.

## Requested Changes (Diff)

### Add
- `lotNumber: Text` field to the `ProductionOrder` backend type
- `lotNumber` parameter to `createProductionOrder` and `updateProductionOrder` backend functions
- Lot Number input field in the Production Orders form (frontend)
- Lot Number column in the Production Orders table (frontend)

### Modify
- `ProductionOrder` type in Motoko: add `lotNumber : Text` field
- `createProductionOrder` function: accept `lotNumber` parameter
- `updateProductionOrder` function: accept `lotNumber` parameter

### Remove
- Nothing removed

## Implementation Plan
1. Add `lotNumber : Text` to the `ProductionOrder` type in main.mo
2. Update `createProductionOrder` to accept and store `lotNumber`
3. Update `updateProductionOrder` to accept and update `lotNumber`
4. Update `backend.d.ts` to include `lotNumber` in the `ProductionOrder` interface and both create/update function signatures
5. Update `ProductionOrders.tsx` to include Lot Number field in the form and column in the table
