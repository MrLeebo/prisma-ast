import { CstNode, IToken } from '@chevrotain/types';
import { parser } from './parser';
import * as Types from './getSchema';
import { appendLocationData, isToken } from './schemaUtils';

const BasePrismaVisitor = parser.getBaseCstVisitorConstructorWithDefaults();
export class PrismaVisitor extends BasePrismaVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  schema(ctx: CstNode & { list: CstNode[] }): Types.Schema {
    const list = ctx.list?.map((item) => this.visit([item])) || [];
    return { type: 'schema', list };
  }

  component(
    ctx: CstNode & {
      type: [IToken];
      componentName: [IToken];
      block: [CstNode];
    }
  ): Types.Block {
    const [type] = ctx.type;
    const [name] = ctx.componentName;
    const list = this.visit(ctx.block);

    const data = (() => {
      switch (type.image) {
        case 'datasource':
          return {
            type: 'datasource',
            name: name.image,
            assignments: list,
          } as const;
        case 'generator':
          return {
            type: 'generator',
            name: name.image,
            assignments: list,
          } as const;
        case 'model':
          return { type: 'model', name: name.image, properties: list } as const;
        case 'view':
          return { type: 'view', name: name.image, properties: list } as const;
        case 'enum':
          return { type: 'enum', name: name.image, enumerators: list } as const;
        default:
          throw new Error(`Unexpected block type: ${type}`);
      }
    })();

    return appendLocationData(data, type, name);
  }

  break(): Types.Break {
    return { type: 'break' };
  }

  comment(ctx: CstNode & { text: [IToken] }): Types.Comment {
    const [comment] = ctx.text;
    const data = { type: 'comment', text: comment.image } as const;
    return appendLocationData(data, comment);
  }

  block(ctx: CstNode & { list: CstNode[] }): Types.Block[] {
    return ctx.list?.map((item) => this.visit([item]));
  }

  assignment(
    ctx: CstNode & { assignmentName: [IToken]; assignmentValue: [CstNode] }
  ): Types.Assignment {
    const value = this.visit(ctx.assignmentValue);
    const [key] = ctx.assignmentName;
    const data = { type: 'assignment', key: key.image, value } as const;
    return appendLocationData(data, key);
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
    const [name] = ctx.fieldName;
    const attributes =
      ctx.attributeList && ctx.attributeList.map((item) => this.visit([item]));
    const comment = ctx.comment?.[0]?.image;
    const data = {
      type: 'field',
      name: name.image,
      fieldType,
      array: ctx.array != null,
      optional: ctx.optional != null,
      attributes,
      comment,
    } as const;

    return appendLocationData(data, name, ctx.optional?.[0], ctx.array?.[0]);
  }

  attribute(
    ctx: CstNode & {
      blockAttribute: [IToken];
      fieldAttribute: [IToken];
      groupName: [IToken];
      attributeName: [IToken];
      attributeArg: CstNode[];
    }
  ): Types.Attr {
    const [name] = ctx.attributeName;
    const [group] = ctx.groupName || [{}];
    const args =
      ctx.attributeArg && ctx.attributeArg.map((attr) => this.visit(attr));
    const kind = ctx.blockAttribute != null ? 'object' : 'field';
    const data = {
      type: 'attribute',
      name: name.image,
      kind,
      group: group.image,
      args,
    } as const;
    const attrs = kind === 'object' ? ctx.blockAttribute : ctx.fieldAttribute;
    return appendLocationData(data, name, ...attrs, group);
  }

  attributeArg(ctx: CstNode & { value: [CstNode] }): Types.AttributeArgument {
    const value = this.visit(ctx.value);
    return { type: 'attributeArgument', value };
  }

  func(
    ctx: CstNode & { funcName: [IToken]; value: CstNode[]; keyedArg: CstNode[] }
  ): Types.Func {
    const [name] = ctx.funcName;
    const params = ctx.value && ctx.value.map((item) => this.visit([item]));
    const keyedParams =
      ctx.keyedArg && ctx.keyedArg.map((item) => this.visit([item]));
    const pars = (params || keyedParams) && [
      ...(params ?? []),
      ...(keyedParams ?? []),
    ];
    const data = { type: 'function', name: name.image, params: pars } as const;
    return appendLocationData(data, name);
  }

  array(ctx: CstNode & { value: CstNode[] }): Types.RelationArray {
    const args = ctx.value && ctx.value.map((item) => this.visit([item]));
    return { type: 'array', args };
  }

  keyedArg(
    ctx: CstNode & { keyName: [IToken]; value: [CstNode] }
  ): Types.KeyValue {
    const [key] = ctx.keyName;
    const value = this.visit(ctx.value);
    const data = { type: 'keyValue', key: key.image, value } as const;
    return appendLocationData(data, key);
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
    const [name] = ctx.enumName;
    const comment = ctx.comment?.[0]?.image;
    const data = { type: 'enumerator', name: name.image, comment } as const;
    return appendLocationData(data, name);
  }
}
