// Shared "flat AND/OR chain of single-token comparisons" parser reused by ALIGN_LOGICAL_EXPRESSIONS
// (ABAP) and DDL_ALIGN_LOGICAL_EXPRESSIONS (DDL) — see align-logical-expressions.ts's header comment
// for the full bounded-subset rationale. This module only parses an already-isolated token span
// (`body`) into a uniform-joiner, uniform-operator condition chain; finding that span (the ABAP
// trigger-keyword-to-period Command, or the DDL ON-keyword-to-boundary token run) is each caller's
// own concern, since the two languages isolate it very differently.
import type { Token } from '../../parser/tokenizer.js';

const COMPARISON_OPERATORS = new Set(['=', '<>', '<', '>', '<=', '>=']);

export interface Condition {
  readonly lhs: Token;
  readonly op: Token;
  readonly rhs: Token;
}

export function parseConditionChain(body: readonly Token[]): readonly Condition[] | undefined {
  if (body.length < 3) return undefined;

  const conditions: Condition[] = [];
  const joiners: Token[] = [];

  const first = parseCondition(body, 0);
  if (first === undefined) return undefined;
  conditions.push(first.condition);
  let cursor = first.nextIndex;

  while (cursor < body.length) {
    const joiner = body[cursor]!;
    if (joiner.kind !== 'word' || (joiner.text.toUpperCase() !== 'AND' && joiner.text.toUpperCase() !== 'OR')) return undefined;

    const next = parseCondition(body, cursor + 1);
    if (next === undefined) return undefined;
    joiners.push(joiner);
    conditions.push(next.condition);
    cursor = next.nextIndex;
  }

  if (conditions.length < 2) return undefined;

  const joinerText = joiners[0]!.text.toUpperCase();
  if (joiners.some((joiner) => joiner.text.toUpperCase() !== joinerText)) return undefined;

  const opText = conditions[0]!.op.text;
  if (conditions.some((condition) => condition.op.text !== opText)) return undefined;

  for (let index = 1; index < conditions.length; index += 1) {
    if (conditions[index]!.lhs.line === conditions[index - 1]!.rhs.line) return undefined;
  }

  return conditions;
}

function parseCondition(body: readonly Token[], startIndex: number): { readonly condition: Condition; readonly nextIndex: number } | undefined {
  const lhs = body[startIndex];
  const op = body[startIndex + 1];
  const rhs = body[startIndex + 2];
  if (lhs === undefined || op === undefined || rhs === undefined) return undefined;
  if (op.kind !== 'punctuation' || !COMPARISON_OPERATORS.has(op.text)) return undefined;
  if (lhs.line !== op.line || op.line !== rhs.line) return undefined;
  return { condition: { lhs, op, rhs }, nextIndex: startIndex + 3 };
}
