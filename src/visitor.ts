import { CstNode, IToken } from '@chevrotain/types';
import { parser } from './parser';
import * as Types from './getSchema';

const BasePrismaVisitor = parser.getBaseCstVisitorConstructorWithDefaults();
export class PrismaVisitor extends BasePrismaVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  schema(ctx: CstNode & { list: CstNode[] }): Types.Schema {
    const list = ctx.list?.map(item => this.visit([item])) || [];
    return { type: 'schema', list };
  }

  component(
    ctx: CstNode & {
      type: [IToken];
      componentName: [IToken];
      block: [CstNode];
    }
  ): Types.Block {
    const [{ image: type }] = ctx.type;
    const [{ image: name }] = ctx.componentName;
    const list = this.visit(ctx.block);

    switch (type) {
      case 'datasource':
        return { type: 'datasource', name, assignments: list };
      case 'generator':
        return { type: 'generator', name, assignments: list };
      case 'model':
        return { type: 'model', name, properties: list };
      case 'enum':
        return { type: 'enum', name, enumerators: list };
      default:
        throw new Error(`Unexpected block type: ${type}`);
    }
  }

  break(): Types.Break {
    return { type: 'break' };
  }

  comment(ctx: CstNode & { text: [IToken] }): Types.Comment {
    const [{ image: comment }] = ctx.text;
    return { type: 'comment', text: comment };
  }

  block(ctx: CstNode & { list: CstNode[] }): Types.Block[] {
    return ctx.list?.map(item => this.visit([item]));
  }

  assignment(
    ctx: CstNode & { assignmentName: [IToken]; assignmentValue: [CstNode] }
  ): Types.Assignment {
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
      comment: [IToken];
    }
  ): Types.Field {
    const fieldType = this.visit(ctx.fieldType);
    const [{ image: name }] = ctx.fieldName;
    const attributes =
      ctx.attributeList && ctx.attributeList.map(item => this.visit([item]));
    const comment = ctx.comment?.[0]?.image;
    return {
      type: 'field',
      name,
      fieldType,
      array: ctx.array != null,
      optional: ctx.optional != null,
      attributes,
      comment,
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
  ): Types.Attr {
    const [{ image: name }] = ctx.attributeName;
    const [{ image: group }] = ctx.groupName || [{}];
    const args =
      ctx.attributeArg && ctx.attributeArg.map(attr => this.visit(attr));
    const kind = ctx.modelAttribute != null ? 'model' : 'field';

    return { type: 'attribute', name, kind, group, args };
  }

  attributeArg(ctx: CstNode & { value: [CstNode] }): Types.AttributeArgument {
    const value = this.visit(ctx.value);
    return { type: 'attributeArgument', value };
  }

  func(ctx: CstNode & { funcName: [IToken]; value: CstNode[]; keyedArg: CstNode[] }): Types.Func {
    const [{ image: name }] = ctx.funcName;
    const params = ctx.value && ctx.value.map(item => this.visit([item]));
    const keyedParams = ctx.keyedArg && ctx.keyedArg.map(item => this.visit([item]));
    const pars = (params || keyedParams) && [...(params ?? []), ...(keyedParams ?? [])];
    return { type: 'function', name, params: pars };
  }

  array(ctx: CstNode & { value: CstNode[] }): Types.RelationArray {
    const args = ctx.value && ctx.value.map(item => this.visit([item]));
    return { type: 'array', args };
  }

  keyedArg(
    ctx: CstNode & { keyName: [IToken]; value: [CstNode] }
  ): Types.KeyValue {
    const [{ image: key }] = ctx.keyName;
    const value = this.visit(ctx.value);
    return { type: 'keyValue', key, value };
  }

  value(ctx: CstNode & { value: [IToken] | [CstNode] }): Types.Value {
    if (isToken(ctx.value)) {
      const [{ image }] = ctx.value;
      return image;
    }
    return this.visit(ctx.value);
  }

  enum(
    ctx: CstNode & { enumName: [IToken]; comment: [IToken] }
  ): Types.Enumerator {
    const [{ image: name }] = ctx.enumName;
    const comment = ctx.comment?.[0]?.image;
    return { type: 'enumerator', name, comment };
  }
}

function isToken(node: [IToken] | [CstNode]): node is [IToken] {
  return 'image' in node[0];
}
