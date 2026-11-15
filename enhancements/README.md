# Enhancements (M3)

Owner: M3. Features selected in `docs/EXTRA-FEATURE-PLAN.md`, built and verified in parallel with the MVP. Required MVP logic never goes here.

## Structure (one folder per feature)
```
enhancements/<EF-ID>-<name>/
  api/          extension endpoints, mounted only through M2's hook
  ui/
    controller  stable logic: state, API calls, events, all states
    view        thin, unstyled, replaceable (about 100 lines); stable test ids
    sandbox     standalone page, mock data, flag on
  tests/        unit, contract, and behavior tests (by test id or role)
  mock/         mock matching the contract
  UI-HANDOFF.md copy of UI-HANDOFF-TEMPLATE.md, filled in
```
File extensions depend on the stack.

## Rules
- Flag `FEATURE_<EF-ID>`, default `off`. With it off, the MVP behaves exactly as if the feature did not exist.
- MVP code loads enhancement code only through the agreed hook and slot, guarded by the flag.
- No global styles, routing or global state in the view. Do not try to match M1's design; M1's agent adapts the view.
- Evidence goes in `docs/VERIFICATION/<EF-ID>.md`.
