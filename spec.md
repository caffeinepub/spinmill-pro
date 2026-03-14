# SpinMill Pro

## Current State
Yarn Opening Stock allows selecting 'Outside Yarn' as a unit option in the UI dropdown. However, when saving, the Candid IDL runtime definition in `backend.did.js` was missing the `outsideYarn` variant, causing a "variant has no data" error even though the TypeScript type definitions (`backend.d.ts`, `backend.did.d.ts`) correctly included it.

## Requested Changes (Diff)

### Add
- `'outsideYarn': IDL.Null` to both `SpinningUnit` IDL.Variant definitions in `backend.did.js` (one at line 37, one at line 621)

### Modify
- `backend.did.js`: Both SpinningUnit variant definitions now include `outsideYarn`

### Remove
- Nothing removed

## Implementation Plan
1. Add `'outsideYarn': IDL.Null` to both SpinningUnit IDL.Variant definitions in `backend.did.js`
