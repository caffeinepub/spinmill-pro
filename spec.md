# SpinMill Pro

## Current State
The Production Log entry form auto-fills Count (Ne) and Lot Number from the selected machine, then calls `getProductionOrderBalance(yarnCountNe, lotNumber)` to show the order balance panel. The balance panel is blocked by `hasInProgressOrder` which checks `Number(o.yarnCountNe) === Number(machineRunningCount)`.

## Requested Changes (Diff)

### Add
- Nothing new added.

### Modify
- **Backend `getProductionOrderBalance`**: Fix the produced quantity calculation. Currently it sums production logs where `log.machineId == order.id` -- this is wrong because it compares machine IDs against production order IDs. Fix: collect all machine IDs whose `runningLotNumber == lotNumber`, then sum production logs for those machines.
- **Frontend `ProductionLogs.tsx` `hasInProgressOrder` check**: Remove the `Number(o.yarnCountNe) === Number(machineRunningCount)` comparison. Since Count now accepts strings like "30/1", `Number("30/1")` = NaN causing the check to always fail. Match only on `lotNumber` to find in-progress orders.

### Remove
- Nothing removed.

## Implementation Plan
1. Regenerate backend with fixed `getProductionOrderBalance` -- collect machineIds by `runningLotNumber == lotNumber`, then sum logs for those machines.
2. Fix frontend `hasInProgressOrder` to only match on `lotNumber`, not on yarnCountNe numeric comparison.
3. Validate and deploy.
