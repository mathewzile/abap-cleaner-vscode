import { parseAbapStatements } from '../../parser/statements.js';

const STATEMENT_KEYWORDS = new Set([
  'ASSERT', 'CALL', 'CASE', 'CHECK', 'CLASS', 'CLEAR', 'CONTINUE', 'CREATE', 'DATA', 'DELETE', 'DO', 'ELSE', 'ELSEIF', 'ENDCASE', 'ENDCLASS', 'ENDIF', 'ENDLOOP', 'ENDMETHOD', 'ENDFORM', 'ENDFUNCTION', 'ENDWHILE', 'EXIT', 'FORM', 'FREE', 'FUNCTION', 'IF', 'INSERT', 'LOOP', 'METHOD', 'MODIFY', 'MOVE', 'PERFORM', 'RAISE', 'READ', 'RETURN', 'SELECT', 'SORT', 'TYPES', 'UPDATE', 'WHILE', 'WRITE',
]);

export function uppercaseStandaloneStatementKeywords(sourceText: string): string {
  const replacements = parseAbapStatements(sourceText).flatMap((statement) => {
    const code = statement.tokens.filter((token) => token.kind !== 'whitespace' && token.kind !== 'comment');
    const first = code[0];
    const second = code[1];
    if (first?.kind !== 'word' || !STATEMENT_KEYWORDS.has(first.text.toUpperCase()) || first.text === first.text.toUpperCase() || second?.text === ':' || second?.text === '(') return [];
    return [{ start: first.offset, end: first.offset + first.text.length, text: first.text.toUpperCase() }];
  });

  return replacements.reduceRight((result, replacement) =>
    `${result.slice(0, replacement.start)}${replacement.text}${result.slice(replacement.end)}`, sourceText);
}