# SpinMill Pro

## Current State
Full textile spinning mill management app with: Raw Materials, Purchase Orders, Inward Entry, Material Issue, Production Orders, Machines, Production Logs, Packing Entry, Yarn Inventory, Yarn Dispatch, Reports, User Management, and Dropdown Options pages.

Raw Materials stock is stored as individual records (per inward entry) with `grade` field = material name. A "Stock by Grade" summary is shown at the top of Raw Materials page, computed by summing `weightKg` across all records grouped by `grade`.

When a Material Issue is created, the backend deducts from `warehouseStock` (keyed by warehouse + materialName) AND does a FIFO deduction from individual `rawMaterials` records.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- **Backend `createMaterialIssue` FIFO deduction**: The FIFO loop currently matches raw material records by warehouse only. It must ALSO match by `material.grade == materialName` so that only records for the same material are deducted. This ensures the "Stock by Grade" summary remains accurate after an issue is done.

### Remove
- Nothing

## Implementation Plan
1. In `createMaterialIssue`, change the FIFO deduction condition from matching on warehouse only to matching on BOTH warehouse AND `material.grade == materialName`.
2. The `warehouseStock` deduction (keyed by `warehouse + materialName`) already works correctly and does not need changes.
3. No frontend changes needed.
