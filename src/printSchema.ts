import * as Types from './getSchema';

export function printSchema(schema: Types.Schema): string {
  return schema.list
    .map(printBlock)
    .filter(Boolean)
    .join('\n');
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
    default:
      throw new Error(`Unrecognized block type`);
  }
}

function printComment(comment: Types.Comment) {
  return comment.text;
}

function printDatasource(db: Types.Datasource) {
  const keyLength = db.assignments.reduce(
    (max, current) =>
      Math.max(max, current.type === 'assignment' ? current.key.length : 0),
    0
  );
  const children = db.assignments
    .map(assignment => printAssignment(assignment, keyLength))
    .filter(Boolean)
    .join('\n  ');

  return `
datasource ${db.name} {
  ${children}
}`;
}

function printEnum(enumerator: Types.Enum) {
  const children = enumerator.enumerators
    .map(enumerator =>
      enumerator.type === 'comment' ? printComment(enumerator) : enumerator.name
    )
    .filter(Boolean)
    .join('\n  ');

  return `
enum ${enumerator.name} {
  ${children}
}`;
}

function printGenerator(generator: Types.Generator) {
  const children = generator.assignments
    .map(printAssignment)
    .filter(Boolean)
    .join('\n  ');

  return `
generator ${generator.name} {
  ${children}
}`;
}

function printModel(model: Types.Model) {
  const nameLength = model.properties.reduce(
    (max, current) =>
      Math.max(max, current.type === 'field' ? current.name.length : 0),
    0
  );

  const typeLength = model.properties.reduce(
    (max, current) =>
      Math.max(
        max,
        current.type === 'field' ? printFieldType(current).length : 0
      ),
    0
  );

  const children = model.properties
    .map(prop => printProperty(prop, nameLength, typeLength))
    .filter(Boolean)
    .join('\n  ');

  return `
model ${model.name} {
  ${children}
}`;
}

function printAssignment(
  node: Types.Assignment | Types.Comment,
  keyLength = 0
) {
  if (node.type === 'comment') return printComment(node);
  return `${node.key.padEnd(keyLength)} = ${printValue(node.value)}`;
}

function printProperty(
  node: Types.Property | Types.Comment,
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
