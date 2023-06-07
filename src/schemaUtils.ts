import * as schema from './getSchema';

const schemaObjects = ['model', 'view'];
export function isSchemaObject(obj: schema.Object): boolean {
  return obj != null && 'type' in obj && schemaObjects.includes(obj.type);
}

export function isSchemaField(field: schema.Field): boolean {
  return field != null && 'type' in field && field.type === 'field';
}
