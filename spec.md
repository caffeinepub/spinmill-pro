# SpinMill Pro

## Current State
The app has raw material tracking with two warehouses (OE Raw Material and Ring Raw Material). Stock is managed via inward entries and opening stock. There is no way to transfer raw material between warehouses.

## Requested Changes (Diff)

### Add
- Backend: `transferWarehouseStock(materialName, fromWarehouse, toWarehouse, qty, transferDate, remarks)` function that deducts from source warehouse and adds to destination warehouse
- Backend: `WarehouseTransfer` type and stable storage for transfer records
- Backend: `getAllWarehouseTransfers()` query function
- Frontend: New `WarehouseTransfer.tsx` page under Procurement group in sidebar
- Page shows current warehouse stock summary, a transfer form, and a history table of all transfers
- backend.d.ts updated with new functions and types

### Modify
- App.tsx: Add `warehouse-transfer` PageId, nav item under Procurement group, and page component mapping

### Remove
- Nothing

## Implementation Plan
1. Add `WarehouseTransfer` type to backend Motoko with fields: id, materialName, fromWarehouse, toWarehouse, qty, transferDate, remarks
2. Add stable storage for transfers and next transfer ID
3. Add `transferWarehouseStock` shared function that validates stock, deducts from source, adds to destination
4. Add `getAllWarehouseTransfers` query function
5. Update backend.d.ts with new type and function signatures
6. Create `WarehouseTransfer.tsx` frontend page with stock summary, form, and history
7. Update App.tsx with new PageId, nav item (ArrowLeftRight icon), and page mapping
