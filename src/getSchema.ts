import { PrismaLexer } from './lexer';
import { PrismaVisitor } from './visitor';
import { parser } from './parser';

export function getSchema(source: string): Schema {
  const lexingResult = PrismaLexer.tokenize(source);
  parser.input = lexingResult.tokens;
  const cstNode = parser.schema();
  if (parser.errors.length > 0) throw parser.errors[0];
  const visitor = new PrismaVisitor();
  return visitor.visit(cstNode);
}

export interface Schema {
  type: 'schema';
  list: Block[];
}

export type Block =
  | Model
  | View
  | Datasource
  | Generator
  | Enum
  | Comment
  | Break;

export interface Object {
  type: 'model' | 'view';
  name: string;
  properties: Array<Property | Comment | Break>;
}

export interface Model extends Object {
  type: 'model';
}

export interface View extends Object {
  type: 'view';
}

export interface Datasource {
  type: 'datasource';
  name: string;
  assignments: Array<Assignment | Comment | Break>;
}

export interface Generator {
  type: 'generator';
  name: string;
  assignments: Array<Assignment | Comment | Break>;
}

export interface Enum {
  type: 'enum';
  name: string;
  enumerators: Array<Enumerator | Comment | Break>;
}

export interface Comment {
  type: 'comment';
  text: string;
}

export interface Break {
  type: 'break';
}

export type Property = GroupedObjectAttribute | ObjectAttribute | Field;

export interface Assignment {
  type: 'assignment';
  key: string;
  value: Value;
}

export interface Enumerator {
  type: 'enumerator';
  name: string;
  value?: Value;
  comment?: string;
}

export interface ObjectAttribute {
  type: 'attribute';
  kind: 'object' | 'view';
  group?: string;
  name: string;
  args: AttributeArgument[];
}

export type GroupedObjectAttribute = ObjectAttribute & { group: string };

export interface Field {
  type: 'field';
  name: string;
  fieldType: string | Func;
  array?: boolean;
  optional?: boolean;
  attributes?: Attribute[];
  comment?: string;
}

export type Attr =
  | Attribute
  | GroupedAttribute
  | ObjectAttribute
  | GroupedObjectAttribute;

export interface Attribute {
  type: 'attribute';
  kind: 'field';
  group?: string;
  name: string;
  args?: AttributeArgument[];
}

export type GroupedAttribute = Attribute & { group: string };

export interface AttributeArgument {
  type: 'attributeArgument';
  value: KeyValue | Value | Func;
}

export interface KeyValue {
  type: 'keyValue';
  key: string;
  value: Value;
}

export interface Func {
  type: 'function';
  name: string;
  params: Value[];
}

export interface RelationArray {
  type: 'array';
  args: string[];
}

export type Value =
  | string
  | number
  | boolean
  | Func
  | RelationArray
  | Array<Value>;
