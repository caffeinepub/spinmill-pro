# SpinMill Pro

## Current State
Yarn Inventory page shows a table with columns: Lot #, Count (Ne), Unit, Product Type, End Use, Weight (kg), Status, Actions. Unit/Product Type/End Use are looked up from matching Production Orders. No filters exist on this page.

## Requested Changes (Diff)

### Add
- Filter dropdowns above the Yarn Inventory table: Unit (Openend / Ring Spinning), Product Type (Carded, Combed, Polyester, Bamboo, Viscose, LT), End Use (Warp, Weft, Pile, Ground, TFO)
- "Clear Filters" button that appears when any filter is active
- Filter options populate dynamically from the actual data present in inventory

### Modify
- Yarn Inventory table to filter rows based on selected filter values

### Remove
- Nothing

## Implementation Plan
1. In YarnInventory.tsx, add three filter state variables: filterUnit, filterProductType, filterEndUse
2. Build filtered inventory list by cross-referencing each item's matched production order
3. Add filter dropdowns row above the table, using Select components
4. Show "Clear Filters" button when any filter is active
5. Apply filtering logic to the displayed rows
