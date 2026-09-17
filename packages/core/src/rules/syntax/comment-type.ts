import { tokenize } from '../../parser/tokenizer.js';

const STATEMENT_KEYWORDS = new Set([
  'ASSERT', 'CALL', 'CHECK', 'CLASS', 'CLEAR', 'CREATE', 'DATA', 'DELETE', 'DO', 'ELSE', 'ELSEIF', 'ENDCASE', 'ENDCLASS', 'ENDIF', 'ENDLOOP', 'ENDMETHOD', 'ENDWHILE', 'EXPORT', 'FREE', 'IF', 'IMPORT', 'INSERT', 'LOOP', 'METHOD', 'MODIFY', 'MOVE', 'PERFORM', 'READ', 'RETURN', 'SELECT', 'TYPES', 'UPDATE', 'WHILE', 'WRITE',
]);

export function convertUnambiguousAsteriskComments(sourceText: string): string {
  return tokenize(sourceText, 'ABAP').map((token) =>
    token.kind === 'comment' && isUnambiguousProseComment(token.text)
      ? `"${token.text.slice(1)}`
      : token.text,
  ).join('');
}

function isUnambiguousProseComment(text: string): boolean {
  if (!/^\* [A-Za-z][A-Za-z ,;:.'-]*$/.test(text)) return false;
  const words = text.slice(2).match(/[A-Za-z]+/g) ?? [];
  return words.length >= 3 && !STATEMENT_KEYWORDS.has(words[0]!.toUpperCase());
}