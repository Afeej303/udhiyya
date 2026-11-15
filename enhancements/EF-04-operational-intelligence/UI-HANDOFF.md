# UI Handoff: EF-04 Operational Intelligence

Slot: `operational-intelligence-slot`
Flag: `FEATURE_EF_04`

## Controller
- `enhancements/EF-04-operational-intelligence/frontend/OperationalIntelligencePanel.tsx`

## API Endpoints
- `GET /api/ext/EF-04/status?programmeId=:id`
- `GET /api/ext/EF-04/issues?programmeId=:id`

## Test IDs
- `ef04-loading`
- `ef04-error`
- `ef04-empty`
- `ef04-content`
- `ef04-issue-item`
