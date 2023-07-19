import type { CstNode, IToken } from 'chevrotain';
import getConfig from './getConfig';
import * as schema from './getSchema';

const schemaObjects = ['model', 'view'];

/** Returns true if the value is an Object, such as a model or view. */
export function isSchemaObject(obj: schema.Object): boolean {
  return obj != null && 'type' in obj && schemaObjects.includes(obj.type);
}

/** Returns true if the value is a Field. */
export function isSchemaField(field: schema.Field): boolean {
  return field != null && 'type' in field && field.type === 'field';
}

/** Returns true if the value of the CstNode is a Token. */
export function isToken(node: [IToken] | [CstNode]): node is [IToken] {
  return 'image' in node[0];
}

/**
 * If parser.nodeLocationTracking is set, then read the location statistics
 * from the available tokens. If tracking is 'none' then just return the
 * existing data structure.
 * */
export function appendLocationData<T extends Record<string, unknown>>(
  data: T,
  ...tokens: IToken[]
): T {
  const { parser } = getConfig();
  if (parser.nodeLocationTracking === 'none') return data;

  const location = tokens.reduce((memo, token) => {
    if (!token) return memo;

    const {
      endColumn = -Infinity,
      endLine = -Infinity,
      endOffset = -Infinity,
      startColumn = Infinity,
      startLine = Infinity,
      startOffset = Infinity,
    } = memo;

    if (token.startLine != null && token.startLine < startLine)
      memo.startLine = token.startLine;
    if (token.startColumn != null && token.startColumn < startColumn)
      memo.startColumn = token.startColumn;
    if (token.startOffset != null && token.startOffset < startOffset)
      memo.startOffset = token.startOffset;

    if (token.endLine != null && token.endLine > endLine)
      memo.endLine = token.endLine;
    if (token.endColumn != null && token.endColumn > endColumn)
      memo.endColumn = token.endColumn;
    if (token.endOffset != null && token.endOffset > endOffset)
      memo.endOffset = token.endOffset;

    return memo;
  }, {} as IToken);

  return Object.assign(data, { location });
}
