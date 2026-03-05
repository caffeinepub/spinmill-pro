# SpinMill Pro

## Current State
The Material Issue section exists under Procurement. Users can create a new issue, which deducts stock from the warehouse and performs FIFO deduction from raw materials. However, users are getting "Operation failed" when trying to submit a new material issue entry.

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- **Backend**: Fix `createMaterialIssue` so the operation succeeds when valid stock exists
  - The FIFO deduction checks `material.grade == grade`, but raw materials created from inward entries use `materialName` as the `grade` field. The grade filter must be removed or made optional so the FIFO deduction works based on warehouse match alone.
  - The backend `getNextIssueNumber` and `getPackingBalance` are `query` functions that call `AccessControl.hasPermission` with `caller` -- but `query` functions cannot authenticate the caller (no identity verification). Move the auth check to only `shared` (update) functions. For `query` functions that need caller identity, change to `shared query` or remove the auth guard.
  - `getAllMaterialIssues` also has an unnecessary auth check for a read-only function -- allow anonymous reads similar to other list functions.
- **Frontend**: In MaterialIssue.tsx, show the actual backend error message in the toast (not just "Operation failed") to help diagnose future issues.

### Remove
- Nothing to remove

## Implementation Plan
1. In `main.mo`, change `createMaterialIssue` FIFO deduction to match on warehouse only (not grade), since raw material `grade` = `materialName` from inward, not a separate grade field.
2. Change `getAllMaterialIssues` from requiring auth to allowing anonymous reads (consistent with other getAll functions).
3. Change `getNextIssueNumber` from `query` with caller auth check to removing the auth guard (it's a safe read).
4. In `MaterialIssue.tsx`, update the catch block to extract and display the real error message from the backend trap.
