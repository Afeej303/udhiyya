# UI Handoff: EF-05 Household Intelligence

- **Slot:** `household-intelligence-slot`
- **Flag:** `FEATURE_EF_05`
- **Controller:** `enhancements/EF-05-household-intelligence/frontend/HouseholdIntelligencePanel.tsx`
- **View:** `enhancements/EF-05-household-intelligence/frontend/HouseholdIntelligenceView.tsx`

## States
- `ef05-loading`: Scanning...
- `ef05-empty`: No duplicates detected.
- `ef05-error`: Error banner + retry.
- `ef05-content`: Duplicate cluster list with confidence levels and resolution buttons.
