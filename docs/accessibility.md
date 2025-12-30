# Accessibility Notes

Implemented accessibility features:
- Modal uses a focus trap and closes on Escape (`src/components/CardDetailModal.jsx:L92-L112`).
- Buttons and interactive elements have `aria-label` attributes across the UI (e.g., cards, toolbar, header).
- Keyboard shortcuts:
  - Enter opens a card; Delete removes a card; Alt+Arrow keys reorder/move cards (`src/components/Card.jsx:L1-L21`).

## Report
- `docs/axe-report.json` is included as a placeholder report structure. In a real environment, run axe in CI or browser and save violations here.

## Manual checks
- Tab navigation reaches all controls in the modal without escaping.
- All form controls have labels or `aria-label`.
