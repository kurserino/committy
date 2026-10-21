# Proposal

## Why

Found by the spec-drift check after `add-config-files`: a `.committy` saved with a byte order mark is rejected as invalid JSON. Windows tools add one routinely (Notepad, and `echo '{...}' > .committy` in Windows PowerShell 5.1 writes UTF-16LE with a BOM), and committy must work on Windows.

## What Changes

- Config files are decoded by BOM: UTF-8 with or without BOM, UTF-16LE and UTF-16BE with BOM. Files without a BOM keep being read as UTF-8.

## Capabilities

### New Capabilities

### Modified Capabilities
- `configuration`: "Config file format" specifies the accepted encodings.

## Impact

- Code: `src/config/load.js` only. Tests in `test/config-load.test.js`. README note on encodings. No new dependencies.
