# SpinMill Pro

## Current State
The Production Log entry uses a dialog where the user selects:
1. Date + Shift
2. Unit (OE Spinning / Ring Spinning / TFO / Outside Yarn)
3. Machine (filtered by unit, one machine at a time)
4. Shift Officer Name, Quantity (kg), Efficiency %

Each dialog submission creates one log entry for one machine.

## Requested Changes (Diff)

### Add
- A **Bulk Entry** button (alongside the existing "Add Log Entry" button) that opens a wide dialog for batch production entry.
- In the bulk entry dialog:
  - Common fields at the top: Date, Shift, Unit, Shift Officer Name
  - Once Unit is selected, all machines belonging to that unit are shown as a table with one row per machine
  - Each machine row displays: Machine Name, Machine Number, Running Count (Ne), Lot Number, a Qty (kg) input, and an Efficiency % input
  - Machines with no running lot number are shown with disabled inputs and a note
  - Rows where qty is filled are highlighted; rows with 0/empty qty are skipped on submit
  - A "Submit All" button saves log entries for all rows where qty > 0
  - Each row shows order balance info (order qty / produced / balance) inline if the machine has a running lot with an in-progress order
  - Validation: blocks submit if any filled row exceeds the order balance

### Modify
- Existing "Add Log Entry" single-machine dialog remains unchanged
- PageHeader action area shows both buttons side by side

### Remove
- Nothing removed

## Implementation Plan
1. Add `BulkProductionLogDialog` component inside ProductionLogs.tsx
2. The dialog has common fields (date, shift, unit, officer name) and a machine rows table
3. Machine rows state: map of machineId -> { quantityKg: string, efficiencyPercent: string }
4. When unit changes, rebuild machine rows from filteredMachines
5. Fetch order balance for each machine that has a runningLotNumber and an in-progress order
6. On submit, call addMutation for each machine row where quantityKg > 0 sequentially
7. Show per-row success/error state after submit
8. Add "Bulk Entry" button to page header
