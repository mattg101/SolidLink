# Snapshot Schema

## Overview
Snapshots are JSON objects that describe a SolidWorks model tree. This schema
defines required fields, canonical ordering, and numeric normalization rules to
ensure deterministic diffs.

## Root Object
Fields (in order):
1. `title` (string, required)
2. `type` (string, required) - e.g., `Assembly` or `Part`
3. `unitToMeters` (number, optional)
4. `rootComponent` (object, required)

## Component Object (`rootComponent`, `children[]`)
Fields (in order):
1. `name` (string, required)
2. `transform` (number[], required) - transform matrix values
3. `materialColor` (number[], required) - RGBA values
4. `bodies` (object[], required)
5. `children` (object[], required)
6. `referenceFrames` (object[], required)

### Bodies (`bodies[]`)
Fields (in order):
1. `name` (string, required)
2. `tessellation` (number[], required) - triangle vertices

### Reference Frames (`referenceFrames[]`)
Fields (in order):
1. `name` (string, required)
2. `type` (string, required)
3. `transform` (number[], required)

## Canonical Ordering
- Object properties must appear in the order listed above.
- `children` are sorted by `name` (ordinal); ties preserve input order.
- `bodies` are sorted by `name` (ordinal).
- `referenceFrames` are sorted by `name` then `type` (ordinal); ties preserve
  input order.

## Numeric Normalization
- All numeric values are rounded to 6 decimal places using
  `MidpointRounding.AwayFromZero`.
- NaN and Infinity are rejected.
- Serialization uses invariant culture formatting.
