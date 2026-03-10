# SpinMill Pro

## Current State
Yarn Dispatch shows incorrect available balance for lots that have both packing entries AND yarn opening stock. The Yarn Stock report correctly sums both, but `getDispatchBalance` only added opening stock when no packing entries existed (`and not foundPacking` guard), so lots with both sources showed a lower balance in Dispatch.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- `src/backend/main.mo`: Remove `and not foundPacking` condition in both `getDispatchBalance` and `createDispatchEntry` opening-stock loops so opening stock is always accumulated for the matching lot, matching the Yarn Stock report behavior.

### Remove
- Nothing removed.

## Implementation Plan
1. Fix `getDispatchBalance`: iterate opening stock unconditionally for matching lot number.
2. Fix `createDispatchEntry`: same fix so the server-side balance validation matches the display balance.
