import { CstNode, IToken } from '@chevrotain/types';
import { parser } from './parser';

const BasePrismaVisitor = parser.getBaseCstVisitorConstructorWithDefaults();
export class PrismaVisitor extends BasePrismaVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  schema(ctx: CstNode & { list: CstNode[] }) {
    const list = ctx.list && ctx.list.map(item => this.visit([item]));
    return { type: 'schema', list };
  }

  component(
    ctx: CstNode & {
      type: [IToken];
      groupName?: [IToken];
      componentName: [IToken];
      block: [CstNode];
    }
  ) {
    const [{ image: type }] = ctx.type;
    const [{ image: group }] = ctx.groupName || [{}];
    const [{ image: name }] = ctx.componentName;
    const list = this.visit(ctx.block);
    const listKey =
      type === 'datasource' || type === 'generator'
        ? 'assignments'
        : type === 'enum'
        ? 'enumerators'
        : 'properties';
    return { type, group, name, [listKey]: list };
  }

  comment(ctx: CstNode & { text: [IToken] }) {
    const [{ image: comment }] = ctx.text;
    return { type: 'comment', text: comment };
  }

  block(ctx: CstNode & { list: CstNode[] }) {
    return ctx.list && ctx.list.map(item => this.visit([item]));
  }

  property(
    ctx: CstNode & { propertyName: [IToken]; propertyValue: [CstNode] }
  ) {
    const value = this.visit(ctx.propertyValue);
    const [{ image: name }] = ctx.propertyName;
    return { type: 'property', name, value };
  }

  assignment(
    ctx: CstNode & { assignmentName: [IToken]; assignmentValue: [CstNode] }
  ) {
    const value = this.visit(ctx.assignmentValue);
    const [{ image: key }] = ctx.assignmentName;
    return { type: 'assignment', key, value };
  }

  field(
    ctx: CstNode & {
      fieldName: [IToken];
      fieldType: [CstNode];
      array: [IToken];
      optional: [IToken];
      attributeList: CstNode[];
    }
  ) {
    const fieldType = this.visit(ctx.fieldType);
    const [{ image: name }] = ctx.fieldName;
    const attributes =
      ctx.attributeList && ctx.attributeList.map(item => this.visit([item]));
    return {
      type: 'field',
      name,
      fieldType,
      array: ctx.array != null,
      optional: ctx.optional != null,
      attributes,
    };
  }

  attribute(
    ctx: CstNode & {
      modelAttribute: [IToken];
      fieldAttribute: [IToken];
      groupName: [IToken];
      attributeName: [IToken];
      attributeArg: CstNode[];
    }
  ) {
    const [{ image: name }] = ctx.attributeName;
    const [{ image: group }] = ctx.groupName || [{}];
    const args =
      ctx.attributeArg && ctx.attributeArg.map(attr => this.visit(attr));
    const kind = ctx.modelAttribute != null ? 'model' : 'field';
    return { type: 'attribute', name, kind, group, args };
  }

  attributeArg(ctx: CstNode & { value: [CstNode] }) {
    const value = this.visit(ctx.value);
    return { type: 'attributeArgument', value };
  }

  func(ctx: CstNode & { funcName: [IToken]; value: CstNode[] }) {
    const [{ image: name }] = ctx.funcName;
    const params = ctx.value && ctx.value.map(item => this.visit([item]));
    return { type: 'function', name, params };
  }

  array(ctx: CstNode & { value: CstNode[] }) {
    const args = ctx.value && ctx.value.map(item => this.visit([item]));
    return { type: 'array', args };
  }

  keyedArg(ctx: CstNode & { keyName: [IToken]; value: [CstNode] }) {
    const [{ image: key }] = ctx.keyName;
    const value = this.visit(ctx.value);
    return { type: 'keyValue', key, value };
  }

  value(ctx: CstNode & { value: [IToken] | [CstNode] }) {
    if (isToken(ctx.value)) {
      const [{ image }] = ctx.value;
      return image;
    }
    return this.visit(ctx.value);
  }

  enum(ctx: CstNode & { enumName: [IToken] }) {
    const [{ image: name }] = ctx.enumName;
    return { type: 'enumerator', name };
  }
}

function isToken(node: [IToken] | [CstNode]): node is [IToken] {
  return 'image' in node[0];
}
