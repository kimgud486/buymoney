Validation before merge:

- npm ci
- npm run lint
- npm test
- npm run audit:fake-data
- npm run audit:boundaries
- npm run audit:buttons
- npm run build
- npm run validate:final

AUTO_LIVE server order endpoint wiring is a required follow-up before production use.
