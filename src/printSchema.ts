import * as Types from './getSchema';

export function printSchema(schema: Types.Schema): string {
  return schema.list
    .map(printBlock)
    .filter(Boolean)
    .join('\n')
    .replace(/(\n\s*){3,}/g, '\n\n');
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
      return printModel(block);
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
  return '\n';
}

function printDatasource(db: Types.Datasource) {
  const children = computeAssignmentFormatting(db.assignments);

  return `
datasource ${db.name} {
  ${children}
}`;
}

function printEnum(enumerator: Types.Enum) {
  const children = enumerator.enumerators
    .map(printEnumerator)
    .filter(Boolean)
    .join('\n  ')
    .replace(/(\n\s*){3,}/g, '\n\n  ');

  return `
enum ${enumerator.name} {
  ${children}
}`;
}

function printEnumerator(
  enumerator: Types.Enumerator | Types.Comment | Types.Break
) {
  switch (enumerator.type) {
    case 'enumerator':
      return enumerator.name;
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

function printModel(model: Types.Model) {
  let pos = 0;
  const listBlocks = model.properties.reduce<Array<typeof model.properties>>(
    (memo, current, index, arr) => {
      if (current.type !== 'field') return memo;
      if (index > 0 && arr[index - 1].type !== 'field') memo[++pos] = [];
      memo[pos].push(current);
      return memo;
    },
    [[]]
  );

  const nameLengths = listBlocks.map(lists =>
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

  const typeLengths = listBlocks.map(lists =>
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

  const children = model.properties
    .map((prop, index, arr) => {
      if (
        index > 0 &&
        prop.type === 'field' &&
        arr[index - 1].type !== 'field'
      ) {
        nameLengths.shift();
        typeLengths.shift();
      }

      return printProperty(prop, nameLengths[0], typeLengths[0]);
    })
    .filter(Boolean)
    .join('\n  ')
    .replace(/(\n\s*){3,}/g, '\n\n  ');

  return `
model ${model.name} {
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

function printAttribute(attribute: Types.Attribute | Types.ModelAttribute) {
  const args =
    attribute.args && attribute.args.length > 0
      ? `(${attribute.args
          .map(printAttributeArg)
          .filter(Boolean)
          .join(', ')})`
      : '';

  return `${attribute.kind === 'field' ? '@' : '@@'}${attribute.name}${args}`;
}

function printAttributeArg(arg: Types.AttributeArgument) {
  return printValue(arg.value);
}

function printField(field: Types.Field, nameLength = 0, typeLength = 0) {
  const name = field.name.padEnd(nameLength);
  const fieldType = printFieldType(field).padEnd(typeLength);
  const attrs = field.attributes ? field.attributes.map(printAttribute) : [];
  return [name, fieldType, ...attrs]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function printFieldType(field: Types.Field) {
  const suffix = field.array ? '[]' : field.optional ? '?' : '';

  if (typeof field.fieldType === 'object') {
    switch (field.fieldType.type) {
      case 'function': {
        const params = field.fieldType.params.map(printValue);
        return `${field.fieldType.name}(${params})${suffix}`;
      }
      default:
        throw new Error(`Unexpected field type`);
    }
  }

  return `${field.fieldType}${suffix}`;
}

function printValue(value: Types.KeyValue | Types.Value): string {
  switch (typeof value) {
    case 'object': {
      if ('type' in value) {
        switch (value.type) {
          case 'keyValue':
            return `${value.key}: ${printValue(value.value)}`;
          case 'function':
            return `${value.name}(${
              value.params ? value.params.map(printValue) : ''
            })`;
          case 'array':
            return `[${value.args.join(', ')}]`;
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
      if (current.type !== 'assignment') return memo;
      if (index > 0 && arr[index - 1].type !== 'assignment') memo[++pos] = [];
      memo[pos].push(current);
      return memo;
    },
    [[]]
  );

  const keyLengths = listBlocks.map(lists =>
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
      if (
        index > 0 &&
        item.type === 'assignment' &&
        arr[index - 1].type !== 'assignment'
      )
        keyLengths.shift();
      return printAssignment(item, keyLengths[0]);
    })
    .filter(Boolean)
    .join('\n  ')
    .replace(/(\n\s*){3,}/g, '\n\n  ');
}
