# kinkstarter
Repository to manage a development fund of a community

## Setup

This project uses [clasp](https://github.com/google/clasp) to manage Google Apps Script code locally.

### Prerequisites

```bash
npm install -g @google/clasp
clasp login
```

### Script Properties

The following Script Properties must be set in the Apps Script editor (Project Settings > Script Properties):

| Key | Description |
|-----|-------------|
| `FIO_READONLY_TOKEN` | FIO bank API read-only token |
| `VLASTNICTVI_KMENE_SHEET_ID` | Google Sheets ID for the "vlastnictvi kmene" spreadsheet |

### Usage

```bash
clasp pull   # pull latest changes from Apps Script
clasp push   # push local changes to Apps Script
clasp open   # open the script in the Apps Script editor
```
