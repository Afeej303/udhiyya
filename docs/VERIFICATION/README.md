# Verification Evidence

Owner: M3. One file per feature, named `<EF-ID>.md`, copied from `EF-TEMPLATE.md`.

- **V0 and V1** are done by M3's builder and verifier agents. They gate M3 starting the next feature.
- **V2** is a 5-minute check in the real app by M1 or M2 when pinged. For UI features, M1's agent first adapts the view and re-runs the behavior tests. V2 gates turning the flag on, never M3's progress.

Rules are in `AGENTS.md` (M3 feature flow).
