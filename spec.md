# SpinMill Pro

## Current State
- Full textile spinning mill management app with: Dashboard, Raw Materials (auto-populated from inward), Purchase Orders, Inward Entry, Production Orders, Machines, Production Logs, Quality Control, Yarn Inventory, Reports.
- Raw Materials section shows stock per inward entry with warehouse badge (OE / Ring), filters by supplier/grade/warehouse/month.
- Warehouse stock is maintained in a `warehouseStock` map keyed by `warehouse_materialName`.
- No material issue/dispatch module exists currently.

## Requested Changes (Diff)

### Add
- **Material Issue** module: A new section in the sidebar under "Procurement" called "Material Issue"
- Backend `MaterialIssue` type: id, issueNumber (auto-generated e.g. ISS-2026-001), issueDate, department (text), warehouse (Warehouse enum), materialName (text), grade (text), issuedQty (Nat), remarks (text)
- `createMaterialIssue` shared function: creates issue record, deducts `issuedQty` from `warehouseStock` for the matching warehouse+materialName, also deducts from the corresponding raw material records (reduce weightKg proportionally or by matching entries, FIFO - earliest first, remove if weight reaches 0)
- `getAllMaterialIssues` query function
- `deleteMaterialIssue` shared function: reverses the stock deduction (adds back to warehouseStock)
- `getNextIssueNumber` query: returns next ISS-2026-NNN
- Department options: Blowroom, Carding, Drawing, Combing, Roving, Ring Frame, Autocoro, OE
- Material Issue page in frontend:
  - Table listing all issues with columns: Issue No., Date, Department, Warehouse, Material, Grade, Issued Qty (Kg), Remarks
  - "New Issue" button opens dialog form with fields: Issue No. (auto), Issue Date, Department (select), Warehouse (select: OE Raw Material / Ring Raw Material), Material Name (auto-populated from available stock in selected warehouse), Grade (auto-populated), Issued Qty (Kg), Remarks
  - After submit: issued qty is deducted from Raw Materials and warehouse stock automatically
  - Delete button per row reverses the deduction

### Modify
- **Sidebar**: Add "Material Issue" nav item under Procurement group
- **Raw Materials page**: Stock quantities reflect deductions from issues (already driven by backend warehouseStock and rawMaterials maps, so automatic once backend is updated)
- **Dashboard**: No change needed

### Remove
- Nothing removed

## Implementation Plan
1. Add `MaterialIssue` type and `materialIssueIdCounter` state in `main.mo`
2. Add `createMaterialIssue` function: auto-deducts from `warehouseStock` and FIFO-deducts from `rawMaterials` records matching warehouse+grade
3. Add `getAllMaterialIssues`, `deleteMaterialIssue` (reverses stock), `getNextIssueNumber` functions
4. Update `backend.d.ts` with new types and functions
5. Build `MaterialIssue.tsx` page with table, new-issue dialog, auto-fill material from warehouse stock, validation (cannot issue more than available stock)
6. Add Material Issue nav item to sidebar in `App.tsx`
7. Wire route in router
