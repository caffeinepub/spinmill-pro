# SpinMill Pro

## Current State
The app has edit/delete functionality for: PurchaseOrders, Machines, ProductionOrders, ProductionLogs (admin-only via isAdmin guard). The following pages have DELETE only but no EDIT:
- InwardEntry
- MaterialIssue
- PackingEntry
- YarnDispatch
- OutsideYarnInward
- YarnOpeningStock
- RawMaterialOpeningStock

Backend has update functions for RawMaterial, PurchaseOrder, ProductionOrder, Machine, ProductionLog but NOT for the above entities.

## Requested Changes (Diff)

### Add
- Backend: `updateInwardEntry` - updates fields, adjusts warehouse stock delta
- Backend: `updateMaterialIssue` - updates fields, adjusts warehouse stock delta
- Backend: `updatePackingEntry` - updates remarks, packingDate, quantityKg (with balance check)
- Backend: `updateDispatchEntry` - updates remarks, dispatchDate, quantityKg (with balance check)
- Backend: `updateYarnOpeningStock` - updates all fields
- Backend: `updateRawMaterialOpeningStock` - updates fields, adjusts warehouse stock
- Frontend: Edit button (admin-only) in InwardEntry, MaterialIssue, PackingEntry, YarnDispatch, YarnOpeningStock, OutsideYarnInward, RawMaterialOpeningStock
- Frontend: Edit dialog pre-populated with existing data for each page
- Frontend: useUpdateXxx mutation hooks for each entity

### Modify
- backend.d.ts: Add type declarations for all new update functions
- Each page: Add editItem state, openEdit handler, edit dialog, update mutation call

### Remove
- Nothing

## Implementation Plan
1. Add 6 update functions to backend/main.mo
2. Add update function declarations to backend.d.ts
3. Add useUpdateXxx hooks to useQueries.ts
4. Add edit functionality to 7 frontend pages (InwardEntry, MaterialIssue, PackingEntry, YarnDispatch, YarnOpeningStock, OutsideYarnInward, RawMaterialOpeningStock)
