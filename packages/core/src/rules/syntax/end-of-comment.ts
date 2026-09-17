import { parseAbapCommands, type Command } from '../../parser/commands.js';

export function removeRedundantMethodEndComments(sourceText: string): string {
  const commands = parseAbapCommands(sourceText);
  const openings: { readonly index: number; readonly kind: 'method' | 'routine' }[] = [];
  const replacements: { readonly start: number; readonly end: number }[] = [];
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]!;
    if (command.kind === 'method-open') {
      openings.push({ index, kind: 'method' });
    } else if (command.kind === 'routine-open') {
      openings.push({ index, kind: 'routine' });
    } else if (command.kind === 'method-close' || command.kind === 'routine-close') {
      const opening = openings.pop();
      if (opening === undefined || (command.kind === 'method-close' && opening.kind !== 'method') || (command.kind === 'routine-close' && opening.kind !== 'routine')) continue;
      const methodName = methodNameOf(commands[opening.index]!);
      const comment = command.tokens.find((token) => token.kind === 'comment');
      if (methodName === undefined || comment === undefined || !isExactMethodNameComment(comment.text, methodName)) continue;
      const commentIndex = command.tokens.indexOf(comment);
      const preceding = command.tokens[commentIndex - 1];
      replacements.push({ start: preceding?.kind === 'whitespace' ? preceding.offset : comment.offset, end: command.endOffset });
    }
  }
  return replacements.reduceRight((text, replacement) => text.slice(0, replacement.start) + text.slice(replacement.end), sourceText);
}

function methodNameOf(command: Command): string | undefined {
  const words = command.tokens.filter((token) => token.kind === 'word');
  return ['METHOD', 'FORM', 'FUNCTION'].includes(words[0]?.text.toUpperCase() ?? '') ? words[1]?.text : undefined;
}

function isExactMethodNameComment(comment: string, methodName: string): boolean {
  return /^"\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/i.exec(comment)?.[1]?.toUpperCase() === methodName.toUpperCase();
}