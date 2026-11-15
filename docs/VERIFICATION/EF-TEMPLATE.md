# Verification: [EF-XX, Feature name]

- **Flag:** `FEATURE_EF_XX` (state: off / on)
- **Commit verified:** [hash]
- **Builder and verifier sessions:** [separate sessions, note IDs or times]
- **Overall:** V0 [Pass/Fail] · V1 [Pass/Fail] · V2 [Pending/Pass/Fail]

## V0: unit, edge, failure, UI behavior
| Check | Command | Actual result |
|---|---|---|
| Unit and edge tests | TBD | TBD |
| Failure paths (bad input, dependency down, unauthorized) | TBD | TBD |
| UI behavior tests in the sandbox (by test id or role) | TBD | TBD |
| Loading, empty, error, success states render | TBD | TBD |

## V1: contract and MVP regression
| Check | Command or method | Actual result |
|---|---|---|
| Contract tests against the mock | TBD | TBD |
| Contract tests against the shared deployment | TBD or "not deployed yet" | TBD |
| MVP smoke test, flag off (must be identical to before) | TBD | TBD |
| MVP smoke test, flag on | TBD | TBD |
| Diff scan: no secrets, no edits outside `enhancements/` and agreed hooks | TBD | TBD |

## Defects
| ID | Severity | Description | Status |
|---|---|---|---|
| TBD | | | |

## Known limitations
TBD

## V2 checklist (5 minutes or less)
1. Set `FEATURE_EF_XX=on`. Exact change: TBD
2. [Step] Expected: [observable result]
3. [Step] Expected: [observable result]
4. Set the flag off. Expected: the MVP is unchanged.

UI adaptation (M1): view adapted in `frontend/`, mounted in slot `[name]`, behavior tests re-run: [pass/fail, hash].

## Rollback
Set `FEATURE_EF_XX=off`. Data or schema side effects: [None / describe].

## V2 result
- **Checked by:** [M1/M2] · **Time:** TBD · **Result:** [Pass/Fail, notes]
