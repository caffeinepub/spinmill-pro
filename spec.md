# SpinMill Pro

## Current State
SpinMill Pro is a full-stack textile spinning mill management app with modules for procurement, inventory, production, packing, dispatch, and reporting. The backend uses Motoko with fixed variant types for ProductType and EndUse. Dropdown options (product types, end uses, etc.) are stored in localStorage, making them browser/environment-specific. The dashboard shows Yarn Inventory, QC Pass Rate, and a Quick Actions card. Production Orders shows all orders including completed/cancelled. Purchase Orders and Inward Entry show closed POs. Production balance in ProductionLogs doesn't re-fetch when the machine's order changes mid-entry. All data entry pages show all records without pagination.

## Requested Changes (Diff)

### Add
- Unit filter dropdown to Production Orders filter bar
- Outside Yarn Inward report tab in Reports section with date filter and lot number search bar
- Backend: `getDropdownOptions()` and `setDropdownOptions(json: Text)` functions to store dropdown config in the backend (stable)
- Backend: `oeProductionTodayKg`, `tfoProductionTodayKg`, `ringProductionTodayKg` to DashboardStats
- Bulk Issue dialog in Material Issue section (select warehouse + material, enter quantities for multiple departments at once)
- Backend: `getDropdownOptions` and `setDropdownOptions` for syncing dropdown lists across environments

### Modify
- ProductionOrders.tsx: Use yarn count labels (from useYarnCountLabels) to display TFO count correctly
- ProductionOrders.tsx: Add Unit filter; default status filter excludes completed/cancelled orders
- Dashboard.tsx: Remove Yarn Inventory KPI, QC Pass Rate KPI, Quick Actions card; add Daily Production cards for OE Spinning, TFO, and Ring Spinning (kg today)
- PurchaseOrders.tsx: Filter out closed POs from the table by default (show only open/partiallyReceived)
- InwardEntry.tsx: Filter out closed POs from the PO search/selection
- ProductionLogs.tsx: Fix balance re-fetch — invalidate/refetch getProductionOrderBalance query when machine selection changes (use key change)
- All data entry pages: Show only the latest 25 records by default; full list visible when user types in search
- useDropdownOptions.ts: Load from backend instead of localStorage; save to backend on change

### Remove
- Dashboard: Yarn Inventory KPI card, QC Pass Rate KPI card, Quick Actions card
- No closed Production Orders shown in the table (completed and cancelled orders excluded from default view — user can still see them by changing the status filter)

## Implementation Plan
1. Update backend main.mo: add stable dropdown options store, add dropdown get/set functions, add daily production by unit to DashboardStats
2. Regenerate backend.d.ts type bindings
3. Update useDropdownOptions.ts to load/save from backend
4. Update ProductionOrders.tsx: use count labels for TFO, add unit filter, default filter excludes closed orders
5. Update Dashboard.tsx: remove yarn inventory/QC/quick actions, add 3 daily production unit cards
6. Update PurchaseOrders.tsx: hide closed POs by default
7. Update InwardEntry.tsx: filter closed POs from selection
8. Update ProductionLogs.tsx: force balance re-fetch when machine changes
9. Add bulk issue dialog to MaterialIssue.tsx
10. Add Outside Yarn Inward tab to Reports.tsx
11. Apply latest-25-entries limit to all data entry pages
