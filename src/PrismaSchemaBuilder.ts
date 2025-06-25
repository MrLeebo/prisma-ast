import * as schema from './getSchema';
import {
  isOneOfSchemaObjects,
  isSchemaField,
  isSchemaObject,
} from './schemaUtils';
import { PrintOptions, printSchema } from './printSchema';
import * as finder from './finder';

/** Returns the function type Original with its return type changed to NewReturn. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReplaceReturnType<Original extends (...args: any) => any, NewReturn> = (
  ...a: Parameters<Original>
) => NewReturn;

/**
 * Methods with return values that do not propagate the builder should not have
 * their return value modified by the type replacement system below
 * */
type ExtractKeys = 'getSchema' | 'getSubject' | 'getParent' | 'print';

/** These keys preserve the return value context that they were given */
type NeutralKeys =
  | 'break'
  | 'comment'
  | 'attribute'
  | 'enumerator'
  | 'then'
  | 'findByType'
  | 'findAllByType';

/** Keys allowed when you call .datasource() or .generator() */
type DatasourceOrGeneratorKeys = 'assignment';

/** Keys allowed when you call .enum("name") */
type EnumKeys = 'enumerator';

/** Keys allowed when you call .field("name") */
type FieldKeys = 'attribute' | 'removeAttribute';

/** Keys allowed when you call .model("name") */
type BlockKeys = 'blockAttribute' | 'field' | 'removeField';

type PrismaSchemaFinderOptions = finder.ByTypeOptions & {
  within?: finder.ByTypeSourceObject[];
};

/**
 * Utility type for making the PrismaSchemaBuilder below readable:
 * Removes methods from the builder that are prohibited based on the context
 * the builder is in. For example, you can add fields to a model, but you can't
 * add fields to an enum or a datasource.
 */
type PrismaSchemaSubset<
  Universe extends keyof ConcretePrismaSchemaBuilder,
  Method
> = ReplaceReturnType<
  ConcretePrismaSchemaBuilder[Universe],
  PrismaSchemaBuilder<Exclude<keyof ConcretePrismaSchemaBuilder, Method>>
>;

/**
 * The brain of this whole operation: depending on the key of the method name
 * we receive, filter the available list of method calls the user can make to
 * prevent them from making invalid calls, such as builder.datasource().field()
 * */
type PrismaSchemaBuilder<K extends keyof ConcretePrismaSchemaBuilder> = {
  [U in K]: U extends ExtractKeys
    ? ConcretePrismaSchemaBuilder[U]
    : U extends NeutralKeys
    ? ConcretePrismaSchemaBuilder[U] //ReplaceReturnType<ConcretePrismaSchemaBuilder[U], PrismaSchemaBuilder<K>>
    : U extends 'datasource'
    ? PrismaSchemaSubset<U, 'datasource' | EnumKeys | FieldKeys | BlockKeys>
    : U extends 'generator'
    ? PrismaSchemaSubset<U, EnumKeys | FieldKeys | BlockKeys>
    : U extends 'model'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys | FieldKeys>
    : U extends 'view'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys | FieldKeys>
    : U extends 'type'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys | FieldKeys>
    : U extends 'field'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys>
    : U extends 'removeField'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys | FieldKeys>
    : U extends 'enum'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | BlockKeys | FieldKeys>
    : U extends 'removeAttribute'
    ? PrismaSchemaSubset<U, DatasourceOrGeneratorKeys | EnumKeys>
    : PrismaSchemaSubset<
        U,
        DatasourceOrGeneratorKeys | EnumKeys | FieldKeys | BlockKeys | 'comment'
      >;
};

type Arg =
  | string
  | {
      name: string;
      function?: Arg[];
    };
type Parent = schema.Block | undefined;
type Subject = schema.Block | schema.Field | schema.Enumerator | undefined;

export class ConcretePrismaSchemaBuilder {
  private schema: schema.Schema;
  private _subject: Subject;
  private _parent: Parent;

  constructor(source = '') {
    this.schema = schema.getSchema(source);
  }

  /** Prints the schema out as a source string */
  print(options: PrintOptions = {}): string {
    return printSchema(this.schema, options);
  }

  /** Returns the underlying schema object for more advanced use cases. */
  getSchema(): schema.Schema {
    return this.schema;
  }

  /** Mutation Methods */

  /** Adds or updates a generator block based on the name. */
  generator(name: string, provider = 'prisma-client-js'): this {
    const generator: schema.Generator =
      this.schema.list.reduce<schema.Generator>(
        (memo, block) =>
          block.type === 'generator' && block.name === name ? block : memo,
        {
          type: 'generator',
          name,
          assignments: [
            { type: 'assignment', key: 'provider', value: `"${provider}"` },
          ],
        }
      );

    if (!this.schema.list.includes(generator)) this.schema.list.push(generator);
    this._subject = generator;
    return this;
  }

  /** Removes something from the schema with the given name. */
  drop(name: string): this {
    const index = this.schema.list.findIndex(
      (block) => 'name' in block && block.name === name
    );
    if (index !== -1) this.schema.list.splice(index, 1);
    return this;
  }

  /** Sets the datasource for the schema. */
  datasource(provider: string, url: string | { env: string }): this {
    const datasource: schema.Datasource = {
      type: 'datasource',
      name: 'db',
      assignments: [
        {
          type: 'assignment',
          key: 'url',
          value:
            typeof url === 'string'
              ? `"${url}"`
              : { type: 'function', name: 'env', params: [`"${url.env}"`] },
        },
        { type: 'assignment', key: 'provider', value: `"${provider}"` },
      ],
    };
    const existingIndex = this.schema.list.findIndex(
      (block) => block.type === 'datasource'
    );
    this.schema.list.splice(
      existingIndex,
      existingIndex !== -1 ? 1 : 0,
      datasource
    );
    this._subject = datasource;
    return this;
  }

  /** Adds or updates a model based on the name. Can be chained with .field() or .blockAttribute() to add to it. */
  model(name: string): this {
    const model = this.schema.list.reduce<schema.Model>(
      (memo, block) =>
        block.type === 'model' && block.name === name ? block : memo,
      { type: 'model', name, properties: [] }
    );
    if (!this.schema.list.includes(model)) this.schema.list.push(model);
    this._subject = model;
    return this;
  }

  /** Adds or updates a view based on the name. Can be chained with .field() or .blockAttribute() to add to it. */
  view(name: string): this {
    const view = this.schema.list.reduce<schema.View>(
      (memo, block) =>
        block.type === 'view' && block.name === name ? block : memo,
      { type: 'view', name, properties: [] }
    );
    if (!this.schema.list.includes(view)) this.schema.list.push(view);
    this._subject = view;
    return this;
  }

  /** Adds or updates a type based on the name. Can be chained with .field() or .blockAttribute() to add to it. */
  type(name: string): this {
    const type = this.schema.list.reduce<schema.Type>(
      (memo, block) =>
        block.type === 'type' && block.name === name ? block : memo,
      { type: 'type', name, properties: [] }
    );
    if (!this.schema.list.includes(type)) this.schema.list.push(type);
    this._subject = type;
    return this;
  }

  /** Adds or updates an enum based on the name. Can be chained with .enumerator() to add a value to it. */
  enum(name: string, enumeratorNames: string[] = []): this {
    const e = this.schema.list.reduce<schema.Enum>(
      (memo, block) =>
        block.type === 'enum' && block.name === name ? block : memo,
      {
        type: 'enum',
        name,
        enumerators: enumeratorNames.map((name) => ({
          type: 'enumerator',
          name,
        })),
      } satisfies schema.Enum
    );
    if (!this.schema.list.includes(e)) this.schema.list.push(e);
    this._subject = e;
    return this;
  }

  /** Add an enum value to the current enum. */
  enumerator(value: string): this {
    const subject = this.getSubject<schema.Enum>();
    if (!subject || !('type' in subject) || subject.type !== 'enum') {
      throw new Error('Subject must be a prisma enum!');
    }

    const enumerator = {
      type: 'enumerator',
      name: value,
    } satisfies schema.Enumerator;
    subject.enumerators.push(enumerator);
    this._parent = this._subject as Exclude<
      Subject,
      { type: 'field' | 'enumerator' }
    >;
    this._subject = enumerator;
    return this;
  }

  /**
   * Returns the current subject, such as a model, field, or enum.
   * @example
   * builder.getModel('User').field('firstName').getSubject() // the firstName field
   * */
  private getSubject<S extends Subject>(): S {
    return this._subject as S;
  }

  /** Returns the parent of the current subject when in a nested context. The parent of a field is its model or view. */
  private getParent<S extends Parent = schema.Object>(): S {
    return this._parent as S;
  }

  /**
   * Adds a block-level attribute to the current model.
   * @example
   * builder.model('Project')
   *   .blockAttribute("map", "projects")
   *   .blockAttribute("unique", ["firstName", "lastName"]) // @@unique([firstName, lastName])
   * */
  blockAttribute(
    name: string,
    args?: string | string[] | Record<string, schema.Value>
  ): this {
    let subject = this.getSubject<schema.Object | schema.Enum>();
    if (subject.type !== 'enum' && !isSchemaObject(subject)) {
      const parent = this.getParent<schema.Object>();
      if (!isOneOfSchemaObjects(parent, ['model', 'view', 'type', 'enum']))
        throw new Error('Subject must be a prisma model, view, or type!');

      subject = this._subject = parent;
    }

    const attributeArgs = ((): schema.AttributeArgument[] => {
      if (!args) return [] as schema.AttributeArgument[];
      if (typeof args === 'string')
        return [{ type: 'attributeArgument', value: `"${args}"` }];
      if (Array.isArray(args))
        return [{ type: 'attributeArgument', value: { type: 'array', args } }];
      return Object.entries(args).map(([key, value]) => ({
        type: 'attributeArgument',
        value: { type: 'keyValue', key, value },
      }));
    })();

    const property: schema.BlockAttribute = {
      type: 'attribute',
      kind: 'object',
      name,
      args: attributeArgs,
    };

    if (subject.type === 'enum') {
      subject.enumerators.push(property);
    } else {
      subject.properties.push(property);
    }
    return this;
  }

  /** Adds an attribute to the current field. */
  attribute<T extends schema.Field>(
    name: string,
    args?: Arg[] | Record<string, string[]>
  ): this {
    const parent = this.getParent();
    const subject = this.getSubject<T>();
    if (!isOneOfSchemaObjects(parent, ['model', 'view', 'type', 'enum'])) {
      throw new Error('Parent must be a prisma model or view!');
    }

    if (!isSchemaField(subject)) {
      throw new Error('Subject must be a prisma field or enumerator!');
    }

    if (!subject.attributes) subject.attributes = [];
    const attribute = subject.attributes.reduce<schema.Attribute>(
      (memo, attr) =>
        attr.type === 'attribute' &&
        `${attr.group ? `${attr.group}.` : ''}${attr.name}` === name
          ? attr
          : memo,
      {
        type: 'attribute',
        kind: 'field',
        name,
      }
    );

    if (Array.isArray(args)) {
      const mapArg = (arg: Arg): schema.Value | schema.Func => {
        return typeof arg === 'string'
          ? arg
          : {
              type: 'function',
              name: arg.name,
              params: arg.function?.map(mapArg) ?? [],
            };
      };

      if (args.length > 0)
        attribute.args = args.map((arg) => ({
          type: 'attributeArgument',
          value: mapArg(arg),
        }));
    } else if (typeof args === 'object') {
      attribute.args = Object.entries(args).map(([key, value]) => ({
        type: 'attributeArgument',
        value: { type: 'keyValue', key, value: { type: 'array', args: value } },
      }));
    }

    if (!subject.attributes.includes(attribute))
      subject.attributes.push(attribute);

    return this;
  }

  /** Remove an attribute from the current field */
  removeAttribute<T extends schema.Field>(name: string): this {
    const parent = this.getParent();
    const subject = this.getSubject<T>();
    if (!isSchemaObject(parent)) {
      throw new Error('Parent must be a prisma model or view!');
    }

    if (!isSchemaField(subject)) {
      throw new Error('Subject must be a prisma field!');
    }

    if (!subject.attributes) subject.attributes = [];
    subject.attributes = subject.attributes.filter(
      (attr) => !(attr.type === 'attribute' && attr.name === name)
    );

    return this;
  }

  /** Add an assignment to a generator or datasource */
  assignment<T extends schema.Generator | schema.Datasource>(
    key: string,
    value: string
  ): this {
    const subject = this.getSubject<T>();
    if (
      !subject ||
      !('type' in subject) ||
      !['generator', 'datasource'].includes(subject.type)
    )
      throw new Error('Subject must be a prisma generator or datasource!');

    function tap<T>(subject: T, callback: (s: T) => void) {
      callback(subject);
      return subject;
    }

    const assignment = subject.assignments.reduce<schema.Assignment>(
      (memo, assignment) =>
        assignment.type === 'assignment' && assignment.key === key
          ? tap(assignment, (a) => {
              a.value = `"${value}"`;
            })
          : memo,
      {
        type: 'assignment',
        key,
        value: `"${value}"`,
      }
    );

    if (!subject.assignments.includes(assignment))
      subject.assignments.push(assignment);

    return this;
  }

  /** Finder Methods */

  /**
   * Queries the block list for the given block type. Returns `null` if none
   * match. Throws an error if more than one match is found.
   * */
  findByType<const Match extends finder.ByTypeMatch>(
    typeToMatch: Match,
    { within = this.schema.list, ...options }: PrismaSchemaFinderOptions
  ): finder.FindByBlock<Match> | null {
    return finder.findByType(within, typeToMatch, options);
  }

  /**
   * Queries the block list for the given block type. Returns an array of all
   * matching objects, and an empty array (`[]`) if none match.
   * */
  findAllByType<const Match extends finder.ByTypeMatch>(
    typeToMatch: Match,
    { within = this.schema.list, ...options }: PrismaSchemaFinderOptions
  ): Array<finder.FindByBlock<Match> | null> {
    return finder.findAllByType(within, typeToMatch, options);
  }

  /** Internal Utilities */

  private blockInsert(statement: schema.Break | schema.Comment): this {
    let subject = this.getSubject<schema.Block>();
    const allowed = [
      'datasource',
      'enum',
      'generator',
      'model',
      'view',
      'type',
    ];
    if (!subject || !('type' in subject) || !allowed.includes(subject.type)) {
      const parent = this.getParent<schema.Block>();
      if (!parent || !('type' in parent) || !allowed.includes(parent.type)) {
        throw new Error('Subject must be a prisma block!');
      }

      subject = this._subject = parent;
    }

    switch (subject.type) {
      case 'datasource': {
        subject.assignments.push(statement);
        break;
      }
      case 'enum': {
        subject.enumerators.push(statement);
        break;
      }
      case 'generator': {
        subject.assignments.push(statement);
        break;
      }
      case 'model': {
        subject.properties.push(statement);
        break;
      }
    }
    return this;
  }

  /** Add a line break */
  break(): this {
    const lineBreak: schema.Break = { type: 'break' };
    return this.blockInsert(lineBreak);
  }

  /**
   * Add a comment. Regular comments start with // and do not appear in the
   * prisma AST. Node comments start with /// and will appear in the AST,
   * affixed to the node that follows the comment.
   * */
  comment(text: string, node = false): this {
    const comment: schema.Comment = {
      type: 'comment',
      text: `//${node ? '/' : ''} ${text}`,
    };
    return this.blockInsert(comment);
  }

  /**
   * Add a comment to the schema. Regular comments start with // and do not appear in the
   * prisma AST. Node comments start with /// and will appear in the AST,
   * affixed to the node that follows the comment.
   * */
  schemaComment(text: string, node = false): this {
    const comment: schema.Comment = {
      type: 'comment',
      text: `//${node ? '/' : ''} ${text}`,
    };
    this.schema.list.push(comment);
    return this;
  }

  /**
   * Adds or updates a field in the current model. The field can be customized
   * further with one or more .attribute() calls.
   * */
  field(name: string, fieldType: string | schema.Func = 'String'): this {
    let subject = this.getSubject<schema.Object>();
    if (!isSchemaObject(subject)) {
      const parent = this.getParent<schema.Object>();
      if (!isSchemaObject(parent))
        throw new Error(
          'Subject must be a prisma model or view or composite type!'
        );

      subject = this._subject = parent;
    }

    const field = subject.properties.reduce<schema.Field>(
      (memo, block) =>
        block.type === 'field' && block.name === name ? block : memo,
      {
        type: 'field',
        name,
        fieldType,
      }
    );

    if (!subject.properties.includes(field)) subject.properties.push(field);
    this._parent = subject;
    this._subject = field;
    return this;
  }

  /** Drop a field from the current model or view or composite type. */
  removeField(name: string): this {
    let subject = this.getSubject<schema.Object>();
    if (!isSchemaObject(subject)) {
      const parent = this.getParent<schema.Object>();
      if (!isSchemaObject(parent))
        throw new Error(
          'Subject must be a prisma model or view or composite type!'
        );

      subject = this._subject = parent;
    }

    subject.properties = subject.properties.filter(
      (field) => !(field.type === 'field' && field.name === name)
    );
    return this;
  }

  /**
   * Returns the current subject, allowing for more advanced ways of
   * manipulating the schema.
   * */
  then<R extends NonNullable<Subject>>(
    callback: (subject: R) => unknown
  ): this {
    callback(this._subject as R);
    return this;
  }
}

export function createPrismaSchemaBuilder(
  source?: string
): PrismaSchemaBuilder<
  Exclude<
    keyof ConcretePrismaSchemaBuilder,
    DatasourceOrGeneratorKeys | EnumKeys | FieldKeys | BlockKeys
  >
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ConcretePrismaSchemaBuilder(source) as any;
}
