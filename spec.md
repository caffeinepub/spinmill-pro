# SpinMill Pro — Realisation Report

## Current State
App has Reports section with Issue vs Packing Summary and Combined Stock Report. No dedicated Realisation Report exists. WIP tracking is not implemented. Waste entry has been removed from all sections. useActor.ts still contains a call to `_initializeAccessControlWithSecret` on line 30 which causes replica rejection errors.

## Requested Changes (Diff)

### Add
- New `RealisationReport.tsx` page with:
  - Unit selector tabs (OE Spinning / Ring Spinning)
  - Date range filter (from/to)
  - **Section A**: Raw Material Warehouse — grade/material-wise table showing Opening Stock, Inward, Issued, Closing Balance (auto-calculated from backend data filtered by warehouse and date range)
  - **Section B**: WIP in Department — Opening WIP (manual, auto-carried from previous period's closing WIP via localStorage), Closing WIP (manual with Auto-calculate button using formula: Opening WIP + RM Issued − Yarn Packed − Total Waste)
  - **Section C**: Waste Production — manual entry table with hardcoded waste types per unit (OE: Lickerin Dropping, Flat Strips, Microdust, Router Fan; Ring: BRD, LRD, Flat Strips, Usable Waste, Microdust, Metal Waste, Hard Waste, Sweeping Waste), grade-wise, stored in localStorage
  - **Section D**: Yarn Production — packing entries in period joined with production orders by lot number to get unit-specific data, grouped by count (Ne), sum of quantityKg
  - **Section E**: Summary table with formulas: 1) Total RM Issued 2) Opening WIP 3) Total Issue (1+2) 4) Closing WIP 5) Net Consumption (3-4) 6) Total Yarn Packed 7) Theoretical Waste (5-6) 8) Yarn Realisation (6/5*100) 9) Total Waste Produced 10) Invisible Loss/Gain (5-6-9) 11) Invisible Loss %
  - Print PDF button using window.print() with Tailwind print: utilities
  - Report header showing company name, unit, and date range
- New page route `realisation-report` in App.tsx (under Reports sidebar group)

### Modify
- `useActor.ts`: Remove lines that call `_initializeAccessControlWithSecret` and its associated `adminToken` variable; remove unused `getSecretParameter` import if only used for that call
- `App.tsx`: Add `'realisation-report'` to PageId type, import RealisationReport, add sidebar nav item under Reports group, add to pageComponents map

### Remove
- Nothing

## Implementation Plan
1. Fix `useActor.ts` — permanently remove the `_initializeAccessControlWithSecret` call
2. Create `RealisationReport.tsx` with all 5 sections; use `useRawMaterialOpeningStock`, `useInwardEntries`, `useMaterialIssues`, `usePackingEntries`, `useProductionOrders`, `useYarnCountLabels` hooks; localStorage for WIP and waste data
3. Update `App.tsx` to register the new page under the Reports sidebar group
