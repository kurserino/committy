# Tasks

## 1. Decode by byte order mark

- [x] 1.1 In `src/config/load.js` read the file as bytes and decode by BOM (EF BB BF → UTF-8 without the mark, FF FE → UTF-16LE, FE FF → UTF-16BE, otherwise UTF-8); verify tests in `test/config-load.test.js` for UTF-8 with BOM, UTF-16LE with BOM, UTF-16BE with BOM, and plain UTF-8 still parsing, and that the malformed JSON error is unchanged
- [x] 1.2 Note the accepted encodings in the README "Configuration files" section; verify `npm test` and `openspec validate accept-config-bom --strict` pass
