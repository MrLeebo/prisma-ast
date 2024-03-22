import { CstNode, IToken } from '@chevrotain/types';
import * as Types from './getSchema';

import { appendLocationData, isToken } from './schemaUtils';
import { PrismaParser, defaultParser } from './parser';
import { ICstVisitor } from 'chevrotain';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Class<T> = new (...args: any[]) => T;
export type PrismaVisitor = ICstVisitor<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export const VisitorClassFactory = (
  parser: PrismaParser
): Class<PrismaVisitor> => {
  const BasePrismaVisitor = parser.getBaseCstVisitorConstructorWithDefaults();
  return class PrismaVisitor extends BasePrismaVisitor {
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
            } as const satisfies Types.Datasource;
          case 'generator':
            return {
              type: 'generator',
              name: name.image,
              assignments: list,
            } as const satisfies Types.Generator;
          case 'model':
            return {
              type: 'model',
              name: name.image,
              properties: list,
            } as const satisfies Types.Model;
          case 'view':
            return {
              type: 'view',
              name: name.image,
              properties: list,
            } as const satisfies Types.View;
          case 'enum':
            return {
              type: 'enum',
              name: name.image,
              enumerators: list,
            } as const satisfies Types.Enum;
          case 'type':
            return {
              type: 'type',
              name: name.image,
              properties: list,
            } as const satisfies Types.Type;
          default:
            throw new Error(`Unexpected block type: ${type}`);
        }
      })();

      return this.maybeAppendLocationData(data, type, name);
    }

    break(): Types.Break {
      return { type: 'break' };
    }

    comment(ctx: CstNode & { text: [IToken] }): Types.Comment {
      const [comment] = ctx.text;
      const data = {
        type: 'comment',
        text: comment.image,
      } as const satisfies Types.Comment;
      return this.maybeAppendLocationData(data, comment);
    }

    block(ctx: CstNode & { list: CstNode[] }): BlockList {
      return ctx.list?.map((item) => this.visit([item]));
    }

    assignment(
      ctx: CstNode & { assignmentName: [IToken]; assignmentValue: [CstNode] }
    ): Types.Assignment {
      const value = this.visit(ctx.assignmentValue);
      const [key] = ctx.assignmentName;
      const data = {
        type: 'assignment',
        key: key.image,
        value,
      } as const satisfies Types.Assignment;
      return this.maybeAppendLocationData(data, key);
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
      const attributes = ctx.attributeList?.map((item) => this.visit([item]));
      const comment = ctx.comment?.[0]?.image;
      const data = {
        type: 'field',
        name: name.image,
        fieldType,
        array: ctx.array != null,
        optional: ctx.optional != null,
        attributes,
        comment,
      } as const satisfies Types.Field;

      return this.maybeAppendLocationData(
        data,
        name,
        ctx.optional?.[0],
        ctx.array?.[0]
      );
    }

    fieldAttribute(
      ctx: CstNode & {
        fieldAttribute: [IToken];
        groupName: [IToken];
        attributeName: [IToken];
        attributeArg: CstNode[];
      }
    ): Types.Attr {
      const [name] = ctx.attributeName;
      const [group] = ctx.groupName || [{}];
      const args = ctx.attributeArg?.map((attr) => this.visit(attr));
      const data = {
        type: 'attribute',
        name: name.image,
        kind: 'field',
        group: group.image,
        args,
      } as const satisfies Types.Attr;
      return this.maybeAppendLocationData(
        data,
        name,
        ...ctx.fieldAttribute,
        group
      );
    }

    blockAttribute(
      ctx: CstNode & {
        blockAttribute: [IToken];
        groupName: [IToken];
        attributeName: [IToken];
        attributeArg: CstNode[];
      }
    ): Types.Attr | null {
      const [name] = ctx.attributeName;
      const [group] = ctx.groupName || [{}];
      const args = ctx.attributeArg?.map((attr) => this.visit(attr));
      const data = {
        type: 'attribute',
        name: name.image,
        kind: 'object',
        group: group.image,
        args,
      } as const satisfies Types.Attr;

      return this.maybeAppendLocationData(
        data,
        name,
        ...ctx.blockAttribute,
        group
      );
    }

    attributeArg(ctx: CstNode & { value: [CstNode] }): Types.AttributeArgument {
      const value = this.visit(ctx.value);
      return { type: 'attributeArgument', value };
    }

    func(
      ctx: CstNode & {
        funcName: [IToken];
        value: CstNode[];
        keyedArg: CstNode[];
      }
    ): Types.Func {
      const [name] = ctx.funcName;
      const params = ctx.value?.map((item) => this.visit([item]));
      const keyedParams = ctx.keyedArg?.map((item) => this.visit([item]));
      const pars = (params || keyedParams) && [
        ...(params ?? []),
        ...(keyedParams ?? []),
      ];
      const data = {
        type: 'function',
        name: name.image,
        params: pars,
      } as const satisfies Types.Func;
      return this.maybeAppendLocationData(data, name);
    }

    array(ctx: CstNode & { value: CstNode[] }): Types.RelationArray {
      const args = ctx.value?.map((item) => this.visit([item]));
      return { type: 'array', args };
    }

    keyedArg(
      ctx: CstNode & { keyName: [IToken]; value: [CstNode] }
    ): Types.KeyValue {
      const [key] = ctx.keyName;
      const value = this.visit(ctx.value);
      const data = {
        type: 'keyValue',
        key: key.image,
        value,
      } as const satisfies Types.KeyValue;
      return this.maybeAppendLocationData(data, key);
    }

    value(ctx: CstNode & { value: [IToken] | [CstNode] }): Types.Value {
      if (isToken(ctx.value)) {
        const [{ image }] = ctx.value;
        return image;
      }
      return this.visit(ctx.value);
    }

    enum(
      ctx: CstNode & {
        enumName: [IToken];
        attributeList: CstNode[];
        comment: [IToken];
      }
    ): Types.Enumerator {
      const [name] = ctx.enumName;
      const attributes = ctx.attributeList?.map((item) => this.visit([item]));
      const comment = ctx.comment?.[0]?.image;
      const data = {
        type: 'enumerator',
        name: name.image,
        attributes,
        comment,
      } as const satisfies Types.Enumerator;
      return this.maybeAppendLocationData(data, name);
    }

    maybeAppendLocationData<T extends Record<string, unknown>>(
      data: T,
      ...tokens: IToken[]
    ): T {
      if (parser.config.nodeLocationTracking === 'none') return data;
      return appendLocationData(data, ...tokens);
    }
  };
};

type BlockList = Array<
  | Types.Comment
  | Types.Property
  | Types.Attribute
  | Types.Field
  | Types.Enum
  | Types.Assignment
  | Types.Break
>;
export const DefaultVisitorClass = VisitorClassFactory(defaultParser);
export const defaultVisitor = new DefaultVisitorClass();
