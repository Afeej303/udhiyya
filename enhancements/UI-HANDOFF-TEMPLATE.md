# UI Handoff: [EF-XX, Feature name]

For M1's agent. Copy to `enhancements/<EF-ID>-*/UI-HANDOFF.md` and fill in. One page.

- **Slot:** [name, from `docs/FRONTEND-NEEDS.md`]
- **Flag:** `FEATURE_EF_XX` (frontend mechanism per `docs/ARCHITECTURE.md`)
- **Controller (do not change; `ASK M3` if it must):** [path]
- **View (replace or restyle freely):** [path]
- **Sandbox (how to run, mock data):** [command]
- **Extension API used:** [endpoints]

## Props in
| Prop | Type | Meaning |
|---|---|---|
| TBD | TBD | TBD |

## Events out
| Event | Payload | When |
|---|---|---|
| TBD | TBD | TBD |

## States to render
| State | What the user sees |
|---|---|
| Loading | TBD |
| Empty | TBD |
| Error | TBD |
| Success | TBD |

## Test ids / roles to keep
TBD

## Behavior tests
- **Command:** TBD
- **How to point them at the adapted view:** TBD

## Adaptation checklist
- [ ] Controller untouched
- [ ] View restyled with the design system; all four states present
- [ ] Test ids and roles preserved
- [ ] Mounted in the slot behind the flag; flag off renders nothing
- [ ] Behavior tests pass on the adapted view
- [ ] `ADAPTED` ping sent

## Known limitations
TBD
