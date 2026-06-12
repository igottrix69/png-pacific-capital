# PNG Pacific Capital — Cocoa Operations & Export Management System

Enterprise dashboard for **Pacific Capital** (Papua New Guinea) — cocoa buying, processing, trading & exporting.

**Managing Director:** Jarrod Hulo

## Access
- PIN: `0000` (changeable in Administration)
- Session timeout, login history and audit trail included.

## Modules
Dashboard · Cocoa Purchasing · Inventory · Exports (global map) · Finance (P&L, Balance Sheet, Cash Flow) · Cash Transactions · Assets · Fleet · Warehouses · Suppliers · Customers · Contracts · Analytics (forecasting) · Reports (PDF/Excel/CSV) · Administration

## How it works
Pure static front-end (HTML/CSS/JS + Chart.js). All records persist in browser `localStorage`; every KPI, chart, alert and financial statement is recomputed live from entered data — no manual calculations.

## Run locally
```
node serve.js   # http://localhost:4600
```

## Reset / backup
Administration → Backups: download/restore JSON backups or reset to the demo dataset.
