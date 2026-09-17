# ABAP Cleaner VS Code Port

Development VS Code extension for the TypeScript port of automated ABAP cleaner rules.

Current implementation: ABAP document and statement-aware range formatting with
`EMPTY_LINES_IN_CLASS_DEFINITION`, `EMPTY_LINES_OUTSIDE_METHODS`,
`EMPTY_LINES_WITHIN_METHODS`, `NEEDLESS_SPACES`, `SPACES_IN_EMPTY_BRACKETS`,
`SPACE_BEFORE_PERIOD`, `SPACE_AROUND_COMMENT_SIGN`, `CHAIN_OF_ONE` (simple one-line chains
only), `COMPARISON_OPERATOR` (non-equality operators in logical control statements only), and
`EXPORTING_KEYWORD` (simple single-line calls only), and `NOT_IS` (simple single-line predicates
only). Lint diagnostics include per-rule quick fixes and `source.fixAll.abapCleaner`. DDL/DCL and
Behavior Definition files are
registered for future support but remain unchanged until their rule sets are ported.
