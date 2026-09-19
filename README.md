# ABAP Cleaner VS Code Port

TypeScript VS Code formatter/linter port of SAP ABAP cleaner. The local Java/Eclipse source tree is used only as a read-only behavioral reference and is excluded from Git by the root `.gitignore`; this project does not execute or depend on Java.

## Develop and Test

```powershell
npm install
npm run build
npm run typecheck
npm test
npm run verify:core-isolation
npm run verify:settings-schema
npm run package --workspace abap-cleaner-vscode-dev
```

The VSIX is written to `packages/vscode-extension/abap-cleaner-vscode-dev.vsix`. Install it locally with VS Code's **Extensions: Install from VSIX...** command. Its development id is `abap-cleaner-dev.abap-cleaner-vscode-dev`.

Configure it with:

```jsonc
"[abap]": {
  "editor.defaultFormatter": "abap-cleaner-dev.abap-cleaner-vscode-dev",
  "editor.formatOnSave": true
},
"abapCleaner.profile": "default",
"abapCleaner.abapRelease": "754",
"abapCleaner.lint.enabled": true,
"abapCleaner.lint.run": "onSave",
"abapCleaner.rangeFormatting.expandMode": "FULL_STATEMENT",
"editor.codeActionsOnSave": {
  "source.fixAll.abapCleaner": "explicit"
}
```

Range formatting expands to the selected statement by default. `FULL_CONTROL_BLOCK` expands to the innermost matched `IF`, loop, `CASE`, `TRY`, `SELECT`, or `PROVIDE` block. `FULL_METHOD` expands to enclosing `METHOD`, `FORM`, or `FUNCTION` blocks; `FULL_CLASS` expands to enclosing `CLASS` or `INTERFACE` blocks.

Current ABAP rules: `EMPTY_LINES_IN_CLASS_DEFINITION` (consecutive blank lines only), `EMPTY_LINES_OUTSIDE_METHODS` (direct class/interface boundaries only), `EMPTY_LINES_WITHIN_METHODS` (consecutive blank lines only), `NEEDLESS_SPACES` (empty brackets only), `SPACES_IN_EMPTY_BRACKETS` (literal spacing subset), `SPACE_BEFORE_PERIOD`, `SPACE_AROUND_COMMENT_SIGN`, `ABAP_DOC_LANG` (synchronized ABAP Doc `lang="en"` only), `CHAIN_OF_ONE` (simple single-line chains only), `ASSERT_EQUALS_BOOLEAN` (two-parameter one-line boolean assertions, including functional `ACT` expressions), `ASSERT_EQUALS_SUBRC` (simple one-line numeric subrc assertions only), `ASSERT_PARAMETER_ORDER` (two scalar `assert_equals` parameters only), `CHECK_IN_LOOP` (simple initial checks in complete `LOOP`, `DO`, and `WHILE` blocks), `CHECK_OUTSIDE_LOOP` (simple initial checks in complete procedures with no enclosing loop), `CALL_METHOD` (static one-line calls with existing or empty argument lists only), `RECEIVING_KEYWORD` (simple one-line calls with one simple receiving parameter only), `COMPARISON_OPERATOR` (textual operators in logical control statements only), `EXPORTING_KEYWORD` (simple single-line calls only), `EMPTY_COMMAND` (standalone punctuation-only lines only), `END_OF_COMMENT` (exact redundant `ENDMETHOD` name comments only), `EQUALS_SIGN_CHAIN` (one-line plain-identifier chains with simple final values only), `EXIT_OUTSIDE_LOOP` (bare exits in complete procedures with no enclosing loop), `NEEDLESS_PARENTHESES` (one outer pair around simple initial predicates only), `PRAGMA_POSITION` (one complete trailing pragma before a period only), `PSEUDO_COMMENT` (complete trailing codes in an unambiguous mapped subset only), `TYPO` (embedded unambiguous correction subset in comments only), and `NOT_IS` (simple single-line predicates only). Individual rule settings appear under `abapCleaner.rules.*`. Each lint diagnostic provides a quick fix that applies that rule throughout the current document; `source.fixAll.abapCleaner` applies all enabled ported rules. BDL activation is registered but cleanup is not ported.

`UNUSED_VARIABLES` is opt-in and deletes a standalone declared scalar variable only when its name never occurs again anywhere in its method, including in comments. `FINAL_VARIABLE` is opt-in for ABAP 7.57 or later and replaces `DATA( )` with `FINAL( )` for a plain-assignment inline declaration that is read again but never reassigned, skipping methods that mention `ASSIGNING`, `REF`, `FIELD-SYMBOL`, or `ASSIGN`. `INSET` is enabled by default and reindents the leading line of each recognized command (and its attached leading comments) to match block nesting depth, leaving chained same-line statements and multi-line continuation lines untouched.

DDL/DCL cleanup covers 12 of the 20 in-scope upstream DDL rules (`DDL_CAMEL_CASE_NAME` is explicitly out of scope) as bounded subsets — empty-line standardization, annotation layout, spacing, and select-list/clause/JOIN/ASSOCIATION/DEFINE line breaks; the remaining 8 (full annotation-tree rewriting, the 7 `DDL_ALIGNMENT` rules) are deliberately deferred, not faked. See `spec/08-roadmap.md` "Current Status" for the exact per-rule scope and refusal conditions — this README's rule list above predates most of the ABAP and all of the DDL work and is not exhaustive.

`abapCleaner.cleanWorkspace` (Command Palette) finds every matching file in the workspace, cleans it with the active profile, and overwrites it on disk after a confirmation prompt; run it from a clean Git state so changes are reviewable and revertable.

`CALCULATION_ASSIGNMENT` is available as an opt-in rule for ABAP 7.54 or later: set `abapCleaner.abapRelease` to `754` or later and `abapCleaner.rules.CALCULATION_ASSIGNMENT.enabled` to `true`. Its current scope is direct one-line plain-identifier assignments only.

`CREATE_OBJECT` is also opt-in for ABAP 7.40 or later: set `abapCleaner.abapRelease` to `740` or later and `abapCleaner.rules.CREATE_OBJECT.enabled` to `true`. Its current scope is one-line static constructions with plain identifier or literal `EXPORTING` values; dynamic types, exceptions, expressions, comments, and target reuse remain unchanged.

`RAISE_TYPE` is opt-in for ABAP 7.52 or later: set `abapCleaner.abapRelease` to `752` or later and `abapCleaner.rules.RAISE_TYPE.enabled` to `true`. Its current scope is one-line `RAISE [RESUMABLE] EXCEPTION TYPE` and `RAISE SHORTDUMP TYPE` statements without messages, with simple identifier or literal `EXPORTING` values.

`ADD_TO_ETC` is opt-in for ABAP 7.54 or later: set `abapCleaner.abapRelease` to `754` or later and `abapCleaner.rules.ADD_TO_ETC.enabled` to `true`. Its current scope is one-line `ADD`, `SUBTRACT`, `MULTIPLY`, and `DIVIDE` statements with simple identifiers, literals, and numeric values.

`TRANSLATE` is opt-in for ABAP 7.02 or later and currently transforms only a `TRANSLATE ... TO UPPER|LOWER CASE` statement immediately following an explicit scalar `DATA` declaration. `DESCRIBE_TABLE` is opt-in and currently transforms only exact comment-free `DESCRIBE TABLE ... LINES ...` statements with a plain, `DATA(...)`, or `FINAL(...)` target immediately followed by `RETURN.`.

`CONDENSE` is opt-in for ABAP 7.02 or later and currently transforms only `CONDENSE <name> [NO-GAPS]` statements immediately following an explicit scalar `DATA` declaration.

`IMPLICIT_TYPE` is enabled by default and currently transforms only standalone, uncommented untyped and `<name>(<positive integer>)` `DATA` and `TYPES` declarations.

`ESCAPE_CHAR_FOR_PARAMS` is opt-in and currently adds `!` to critical parameter names or removes it from noncritical names in one-line `METHODS ... IMPORTING <name> TYPE <type>.` declarations.

`LOGICAL_OPERATOR_POSITION` moves terminal `AND`, `OR`, or `EQUIV`, plus selected `LOOP` or `DELETE` `WHERE` keywords, to the next line's start while leaving comments and other statement forms untouched.

`ONE_COMMAND_PER_LINE` is opt-in and currently separates consecutive, uncommented one-line commands while preserving the line's existing indentation.

`DECLARATION_CHAIN` is opt-in and currently separates two-item, comment-free one-line `DATA:` and `TYPES:` declarations with simple `TYPE` names.

`SELF_REFERENCE_ME` removes `me->` only from attached direct method calls; attribute access stays unchanged to avoid parameter-shadowing risks.

`READ_TABLE` converts the exact one-line `READ TABLE ... WITH KEY component = operand ASSIGNING <field-symbol>.` form to `ASSIGN` with a table expression for ABAP 7.40 and later.

`VALUE_STATEMENT` is opt-in and factors a shared scalar assignment from exactly two simple, comment-free one-line `VALUE` rows on ABAP 7.40 and later.

`COMMENT_TYPE` is opt-in and converts only unambiguous plain-text column-one `*` comments; code-shaped comments, directives, headings, and separators remain unchanged.

`UPPER_AND_LOWER_CASE` is opt-in and currently uppercases only recognized standalone statement-leading keywords; identifiers and other tokens are unchanged.

`ABAP_DOC_PARAMETERS` is opt-in and currently adds one missing `@parameter` entry to an existing non-synchronized one-line ABAP Doc header above a simple one-line `METHODS ... IMPORTING` declaration.

`CLASS_DEFINITION` is opt-in and currently orders `PUBLIC` before `FINAL` in a simple one-line, comment-free class definition.

`IF_BLOCK_AT_METHOD_END` is opt-in and currently converts a final single-command `IF operand IS INITIAL` method block into an early `RETURN` guard.

`IF_BLOCK_AT_LOOP_END` is opt-in and currently converts a final single-command `IF operand IS INITIAL` loop block into an early `CONTINUE` guard.

`CDS_TEST_CLASS_LINES` is opt-in and currently removes exact generated ABAP Doc instructions plus a generated TODO directly before a simple populated `VALUE` constructor in annotated local CDS test classes.

`CAMEL_CASE_IN_CDS_TEST` is opt-in and currently adds `#EC CI_NOWHERE` only to exact comment-free `SELECT * FROM` statements for the annotated CDS test view; name casing remains unsupported.

`NEEDLESS_CLEAR` is enabled by default and currently removes only an uncommented `CLEAR <name>.` immediately after an explicit scalar `DATA` declaration for the same name.

`CLOSING_BRACKETS_POSITION` is opt-in and currently moves only isolated closing `)` or `]` lines, with an optional period, to the preceding non-comment code line.

`END_OF_COMMENT` removes only exact trailing name comments from paired `ENDMETHOD`, `ENDFORM`, and `ENDFUNCTION` commands; pseudo-comments remain unchanged.

`STRING_TEMPLATE` is enabled for ABAP 7.02 or later and currently transforms only same-line simple assignments that concatenate safe backtick literals and one identifier, in either order.

`ASSERT_CLASS` is opt-in and currently transforms one-line `ASSERT <identifier> IS [NOT] INITIAL|BOUND.`, scalar `=` and `<>`, `= abap_true|abap_false`, and `sy-subrc = <scalar>` statements. Configure `abapCleaner.rules.ASSERT_CLASS.assertClassName` to call an application-specific assertion class; it defaults to `cx_assert`.

`EMPTY_COMMAND` is enabled by default and removes standalone lines made only of `.`, `,`, and `:` while retaining trailing quote comments.

`EMPTY_SECTIONS` is opt-in and currently removes empty, uncommented `PUBLIC`, `PROTECTED`, and `PRIVATE SECTION.` declarations from final local (`lcl_*`) class definitions only.

`npm test` runs the core parser and rule tests; `npm run verify:core-isolation` prevents VS Code APIs from entering the portable core; `npm run verify:settings-schema` detects missing extension settings for ported rules; the package command produces the manual-install VSIX.

## Repository Publishing

The root `.gitignore` excludes generated dependencies, TypeScript output, VSIX artifacts, editor files, and the local `reference-eclipse-plugin/` source tree. Before the first public push, set this repository's Git remote and replace the development-only extension publisher (`abap-cleaner-dev`) and repository URL in `packages/vscode-extension/package.json` with the intended owner values.

The extension and core packages remain `private`; this is appropriate for Git source publishing and manual VSIX distribution. Marketplace publication requires deliberately choosing a publisher and changing the release metadata.

This repository is a derivative work of [SAP's ABAP cleaner](https://github.com/SAP/abap-cleaner) (Apache License 2.0). The root `LICENSE` file carries the full Apache-2.0 text, and `NOTICE` reproduces the required upstream attribution — see it before publishing or redistributing this repository.

