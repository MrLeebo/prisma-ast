import * as Types from './getSchema';
import { EOL } from 'os';
import { schemaSorter } from './schemaSorter';

type Block = 'generator' | 'datasource' | 'model' | 'view' | 'enum' | 'type';

export interface PrintOptions {
  sort?: boolean;
  locales?: string | string[];
  sortOrder?: Block[];
}

/**
 * Converts the given schema object into a string representing the prisma
 * schema's source code. Optionally can take options to change the sort order
 * of the schema parts.
 * */
export function printSchema(
  schema: Types.Schema,
  options: PrintOptions = {}
): string {
  const { sort = false, locales = undefined, sortOrder = undefined } = options;
  let blocks = schema.list;
  if (sort) {
    // no point in preserving line breaks when re-sorting
    blocks = schema.list = blocks.filter((block) => block.type !== 'break');
    const sorter = schemaSorter(schema, locales, sortOrder);
    blocks.sort(sorter);
  }

  return (
    blocks
      .map(printBlock)
      .filter(Boolean)
      .join(EOL)
      .replace(/(\r?\n\s*){3,}/g, EOL + EOL) + EOL
  );
}

function printBlock(block: Types.Block): string {
  switch (block.type) {
    case 'comment':
      return printComment(block);
    case 'datasource':
      return printDatasource(block);
    case 'enum':
      return printEnum(block);
    case 'generator':
      return printGenerator(block);
    case 'model':
    case 'view':
    case 'type':
      return printObject(block);
    case 'break':
      return printBreak();
    default:
      throw new Error(`Unrecognized block type`);
  }
}

function printComment(comment: Types.Comment) {
  return comment.text;
}

function printBreak() {
  return EOL;
}

function printDatasource(db: Types.Datasource) {
  const children = computeAssignmentFormatting(db.assignments);

  return `
datasource ${db.name} {
  ${children}
}`;
}

function printEnum(enumerator: Types.Enum) {
  const list: Array<
    | Types.Comment
    | Types.Break
    | Types.Enumerator
    | Types.BlockAttribute
    | Types.GroupedBlockAttribute
    | Types.GroupedAttribute
  > = enumerator.enumerators;
  const children = list
    .filter(Boolean)
    .map(printEnumerator)
    .join(`${EOL}  `)
    .replace(/(\r?\n\s*){3,}/g, `${EOL + EOL}  `);

  return `
enum ${enumerator.name} {
  ${children}
}`;
}

function printEnumerator(
  enumerator:
    | Types.Enumerator
    | Types.Attribute
    | Types.Comment
    | Types.Break
    | Types.BlockAttribute
    | Types.GroupedBlockAttribute
    | Types.GroupedAttribute
) {
  switch (enumerator.type) {
    case 'enumerator': {
      const attrs = enumerator.attributes
        ? enumerator.attributes.map(printAttribute)
        : [];
      return [enumerator.name, ...attrs, enumerator.comment]
        .filter(Boolean)
        .join(' ');
    }
    case 'attribute':
      return printAttribute(enumerator);
    case 'comment':
      return printComment(enumerator);
    case 'break':
      return printBreak();
    default:
      throw new Error(`Unexpected enumerator type`);
  }
}

function printGenerator(generator: Types.Generator) {
  const children = computeAssignmentFormatting(generator.assignments);

  return `
generator ${generator.name} {
  ${children}
}`;
}

function printObject(object: Types.Object) {
  const props = [...object.properties];

  // If block attributes are declared in the middle of the block, move them to
  // the bottom of the list.
  let blockAttributeMoved = false;
  props.sort((a, b) => {
    if (
      a.type === 'attribute' &&
      a.kind === 'object' &&
      (b.type !== 'attribute' ||
        (b.type === 'attribute' && b.kind !== 'object'))
    ) {
      blockAttributeMoved = true;
      return 1;
    }

    if (
      b.type === 'attribute' &&
      b.kind === 'object' &&
      (a.type !== 'attribute' ||
        (a.type === 'attribute' && a.kind !== 'object'))
    ) {
      blockAttributeMoved = true;
      return -1;
    }

    return 0;
  });

  // Insert a break between the block attributes and the file if the block
  // attributes are too close to the model's fields
  const attrIndex = props.findIndex(
    (item) => item.type === 'attribute' && item.kind === 'object'
  );

  const needsSpace = !['break', 'comment'].includes(props[attrIndex - 1]?.type);
  if (blockAttributeMoved && needsSpace) {
    props.splice(attrIndex, 0, { type: 'break' });
  }

  const children = computePropertyFormatting(props);

  return `
${object.type} ${object.name} {
  ${children}
}`;
}

function printAssignment(
  node: Types.Assignment | Types.Comment | Types.Break,
  keyLength = 0
) {
  switch (node.type) {
    case 'comment':
      return printComment(node);
    case 'break':
      return printBreak();
    case 'assignment':
      return `${node.key.padEnd(keyLength)} = ${printValue(node.value)}`;
    default:
      throw new Error(`Unexpected assignment type`);
  }
}

function printProperty(
  node: Types.Property | Types.Comment | Types.Break,
  nameLength = 0,
  typeLength = 0
) {
  switch (node.type) {
    case 'attribute':
      return printAttribute(node);
    case 'field':
      return printField(node, nameLength, typeLength);
    case 'comment':
      return printComment(node);
    case 'break':
      return printBreak();
    default:
      throw new Error(`Unrecognized property type`);
  }
}

function printAttribute(attribute: Types.Attribute | Types.BlockAttribute) {
  const args =
    attribute.args && attribute.args.length > 0
      ? `(${attribute.args.map(printAttributeArg).filter(Boolean).join(', ')})`
      : '';

  const name = [attribute.name];
  if (attribute.group) name.unshift(attribute.group);

  return `${attribute.kind === 'field' ? '@' : '@@'}${name.join('.')}${args}`;
}

function printAttributeArg(arg: Types.AttributeArgument) {
  return printValue(arg.value);
}

function printField(field: Types.Field, nameLength = 0, typeLength = 0) {
  const name = field.name.padEnd(nameLength);
  const fieldType = printFieldType(field).padEnd(typeLength);
  const attrs = field.attributes ? field.attributes.map(printAttribute) : [];
  const comment = field.comment;
  return (
    [name, fieldType, ...attrs]
      .filter(Boolean)
      .join(' ')
      // comments ignore indents
      .trim() + (comment ? ` ${comment}` : '')
  );
}

function printFieldType(field: Types.Field) {
  const suffix = field.array ? '[]' : field.optional ? '?' : '';

  if (typeof field.fieldType === 'object') {
    switch (field.fieldType.type) {
      case 'function': {
        return `${printFunction(field.fieldType)}${suffix}`;
      }
      default:
        throw new Error(`Unexpected field type`);
    }
  }

  return `${field.fieldType}${suffix}`;
}

function printFunction(func: Types.Func) {
  const params = func.params ? func.params.map(printValue) : '';
  return `${func.name}(${params})`;
}

function printValue(value: Types.KeyValue | Types.Value): string {
  switch (typeof value) {
    case 'object': {
      if ('type' in value) {
        switch (value.type) {
          case 'keyValue':
            return `${value.key}: ${printValue(value.value)}`;
          case 'function':
            return printFunction(value);
          case 'array':
            return `[${
              value.args != null ? value.args.map(printValue).join(', ') : ''
            }]`;
          default:
            throw new Error(`Unexpected value type`);
        }
      }

      throw new Error(`Unexpected object value`);
    }
    default:
      return String(value);
  }
}

function computeAssignmentFormatting(
  list: Array<Types.Comment | Types.Break | Types.Assignment>
) {
  let pos = 0;
  const listBlocks = list.reduce<Array<typeof list>>(
    (memo, current, index, arr) => {
      if (current.type === 'break') return memo;
      if (index > 0 && arr[index - 1].type === 'break') memo[++pos] = [];
      memo[pos].push(current);
      return memo;
    },
    [[]]
  );

  const keyLengths = listBlocks.map((lists) =>
    lists.reduce(
      (max, current) =>
        Math.max(
          max,
          // perhaps someone more typescript-savy than I am can fix this
          current.type === 'assignment' ? current.key.length : 0
        ),
      0
    )
  );

  return list
    .map((item, index, arr) => {
      if (index > 0 && item.type !== 'break' && arr[index - 1].type === 'break')
        keyLengths.shift();
      return printAssignment(item, keyLengths[0]);
    })
    .filter(Boolean)
    .join(`${EOL}  `)
    .replace(/(\r?\n\s*){3,}/g, `${EOL + EOL}  `);
}

function computePropertyFormatting(
  list: Array<Types.Break | Types.Comment | Types.Property>
) {
  let pos = 0;
  const listBlocks = list.reduce<Array<typeof list>>(
    (memo, current, index, arr) => {
      if (current.type === 'break') return memo;
      if (index > 0 && arr[index - 1].type === 'break') memo[++pos] = [];
      memo[pos].push(current);
      return memo;
    },
    [[]]
  );

  const nameLengths = listBlocks.map((lists) =>
    lists.reduce(
      (max, current) =>
        Math.max(
          max,
          // perhaps someone more typescript-savy than I am can fix this
          current.type === 'field' ? current.name.length : 0
        ),
      0
    )
  );

  const typeLengths = listBlocks.map((lists) =>
    lists.reduce(
      (max, current) =>
        Math.max(
          max,
          // perhaps someone more typescript-savy than I am can fix this
          current.type === 'field' ? printFieldType(current).length : 0
        ),
      0
    )
  );

  return list
    .map((prop, index, arr) => {
      if (
        index > 0 &&
        prop.type !== 'break' &&
        arr[index - 1].type === 'break'
      ) {
        nameLengths.shift();
        typeLengths.shift();
      }

      return printProperty(prop, nameLengths[0], typeLengths[0]);
    })
    .filter(Boolean)
    .join(`${EOL}  `)
    .replace(/(\r?\n\s*){3,}/g, `${EOL + EOL}  `);
}
