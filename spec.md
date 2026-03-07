# SpinMill Pro

## Current State

The app is a full-stack textile spinning mill management system. The backend (main.mo) has raw material opening stock functions (addRawMaterialOpeningStock, getAllRawMaterialOpeningStock, deleteRawMaterialOpeningStock), but the yarn opening stock functions (addYarnOpeningStock, getAllYarnOpeningStock, deleteYarnOpeningStock) are missing from the backend entirely. The frontend has hooks and a UI page (YarnOpeningStock.tsx) wired to call these backend functions, so every add/delete operation fails with "operation failed". Additionally, Yarn Inventory (YarnInventory.tsx) only aggregates from packing entries and does not include yarn opening stock.

## Requested Changes (Diff)

### Add
- Backend: `addYarnOpeningStock(lotNumber, yarnCountNe, spinningUnit, productType, endUse, weightKg)` -- stores a yarn opening stock record in a separate set (openingStockYarnIds), persists a YarnInventory-shaped record so it can be retrieved and displayed. Requires auth (user role). Returns the new record id.
- Backend: `getAllYarnOpeningStock()` -- returns all yarn inventory records whose IDs are in openingStockYarnIds, sorted by id. Public (no auth required).
- Backend: `deleteYarnOpeningStock(id)` -- removes the yarn inventory record and its id from openingStockYarnIds. Requires auth (user role).
- Backend: SpinningUnit type must include `#tfo` variant alongside existing `#openend` and `#ringSpinning`.

### Modify
- Backend: All existing yarn opening stock-related code paths (openingStockYarnIds Set is already declared but unused -- wire it up).
- Frontend (YarnInventory.tsx): Include yarn opening stock entries in the aggregated inventory view, alongside packing entries. Each opening stock entry should be merged/summed by the same key (lotNumber|yarnCountNe|spinningUnit|productType|endUse) as packing entries.
- Frontend (YarnOpeningStock.tsx): Add TFO as a Unit option in the add form (value "tfo") matching the new backend SpinningUnit.

### Remove
- Nothing removed.

## Implementation Plan

1. Regenerate backend with addYarnOpeningStock, getAllYarnOpeningStock, deleteYarnOpeningStock functions and SpinningUnit including #tfo.
2. Update YarnInventory.tsx to fetch yarn opening stock entries (useYarnOpeningStock hook) and merge them into the aggregated lots alongside packing entries.
3. Update YarnOpeningStock.tsx form to include TFO as a Unit option.
4. Validate and deploy.
