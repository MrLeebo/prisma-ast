# @mrleebo/prisma-ast

This library uses an abstract syntax tree to parse schema.prisma files into an object in JavaScript. It also allows you to update your Prisma schema files using a Builder object pattern that is fully implemented in TypeScript.

It is similar to [@prisma/sdk](https://github.com/prisma/prisma/tree/master/src/packages/sdk) except that it preserves comments and model attributes. It also doesn't attempt to validate the correctness of the schema at all; the focus is instead on the ability to parse the schema into an object, manipulate it using JavaScript, and re-print the schema back to a file without losing information that isn't captured by other parsers.

> It is probable that a future version of @prisma/sdk will render this library obsolete.

## Install

```bash
npm install @mrleebo/prisma-ast
```

## Examples

### Produce a modified schema by building upon an existing schema

```ts
produceSchema(source: string, (builder: PrismaSchemaBuilder) => void, printOptions?: PrintOptions): string
```

produceSchema is the simplest way to interact with prisma-ast; you input your schema source and a producer function to produce modifications to it, and it will output the schema source with your modifications applied.

```ts
import { produceSchema } from '@mrleebo/prisma-ast';

const input = `
model User {
  id   Int    @id @default(autoincrement())
  name String @unique
}
`;

const output = produceSchema(source, (builder) => {
  builder
    .model('AppSetting')
    .field('key', 'String', [{ name: 'id' }])
    .field('value', 'Json');
});
```

```prisma
model User {
  id   Int    @id @default(autoincrement())
  name String @unique
}

model AppSetting {
  key   String @id
  value Json
}
```

For more information about what the builder can do, check out the [PrismaSchemaBuilder](#prismaschemabuilder) class.

### PrismaSchemaBuilder

The `produceSchema()` utility will construct a builder for you, but you can also create your own instance, which may be useful for more interactive use-cases.

```ts
import { createPrismaSchemaBuilder } from '@mrleebo/prisma-ast';

const builder = createPrismaSchemaBuilder();

builder
  .model('User')
  .field('id', 'Int')
  .attribute('id')
  .attribute('default', [{ name: 'autoincrement' }])
  .field('name', 'String')
  .attribute('unique')
  .break()
  .comment('this is a comment')
  .blockAttribute('index', ['name']);

const output = builder.print();
```

```prisma
model User {
  id   Int @id @default(autoincrement())
  name String @unique

  // this is a comment
  @@index([name])
}
```

### Re-sort the schema

prisma-ast can sort the schema for you. The default sort order is `['generator', 'datasource', 'model', 'enum']` and will sort objects of the same type alphabetically.

```ts
print(options?: {
  sort: boolean,
  locales?: string | string[],
  sortOrder?: Array<'generator' | 'datasource' | 'model' | 'enum'>
})
```

You can optionally set your own sort order, or change the locale used by the sort.

```ts
// sort with default parameters
builder.print({ sort: true });

// sort with options
builder.print({
  sort: true,
  locales: 'en-US',
  sortOrder: ['datasource', 'generator', 'model', 'enum'],
});
```

### Set a datasource

Since a schema can only have one datasource, calling this command will override the existing datasource if the schema already has one, or create a datasource block if it doesn't.

```ts
datasource(provider: string, url: string | { env: string })
```

You can set a datasource by passing in the provider and url parameters.

```ts
builder.datasource('postgresql', { env: 'DATABASE_URL' });
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Access a datasource programmatially

If you want to perform a custom action that there isn't a Builder method for, you can access the underlying schema object programmatically.

```ts
import { Datasource } from '@mrleebo/prisma-ast';

// rename the datasource programmatically
builder
  .datasource('postgresql', { env: 'DATABASE_URL' })
  .then<Datasource>((datasource) => {
    datasource.name = 'DS';
  });
```

```prisma
datasource DS {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Add or update a generator

```ts
generator(name: string, provider: string)
```

If the schema already has a generator with the given name, it will be updated. Otherwise, a new generator will be created.

```ts
builder.generator('nexusPrisma', 'nexus-prisma');
```

```prisma
generator nexusPrisma {
  provider = "nexus-prisma"
}
```

### Adding additional assignments to generators

```ts
assignment(key: string, value: string)
```

If your generator accepts additional assignments, they can be added by chaining .assignment() calls to your generator.

```ts
builder.generator('client', 'prisma-client-js').assignment('output', 'db.js');
```

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "db.js"
}
```

### Access a generator programmatically

If you want to perform a custom action that there isn't a Builder method for, you can access the underlying schema object programmatically.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "db.js"
}
```

```ts
import { Generator } from '@mrleebo/prisma-ast';

// rename the generator programmatically
builder.generator('client').then<Generator>((generator) => {
  generator.name = 'foo';
});
```

```prisma
generator foo {
  provider = "prisma-client-js"
  output   = "db.js"
}
```

### Add or update a model

If the model with that name already exists in the schema, it will be selected and any fields that follow will be appended to the model. Otherwise, the model will be created and added to the schema.

```ts
builder.model('Project').field('name', 'String');
```

```prisma
model Project {
  name String
}
```

### Access a model programmatically

If you want to perform a custom action that there isn't a Builder method for, you can access the underlying schema object programmatically.

```prisma
model Project {
  name String
}
```

```ts
import { Model } from '@mrleebo/prisma-ast';

// rename the datasource programmatically
builder.model('Project').then<Model>((model) => {
  model.name = 'Task';
});
```

```prisma
model Task {
  name String
}
```

### Add a field with an attribute to a model

If the entered model name already exists, that model will be used as the subject for any field and attribute calls that follow.

```prisma
model Project {
  name        String
}
```

```ts
builder.model('Project').field('projectCode', 'String').attribute('unique');
```

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

### Add an attribute to an existing field

If the field already exists, you can add new attributes to it by making calls to `.attribute()`.

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

```ts
builder.model('Project').field('name').attribute('unique');
```

```prisma
model Project {
  name        String @unique
  projectCode String @unique
}
```

### Remove a field

You can remove an existing field with `.removeField()`.

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

```ts
builder.model('Project').removeField('projectCode');
```

```prisma
model Project {
  name String
}
```

### Remove an attribute from an existing field

You can remove an attribute from a field with `.removeAttribute()`.

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

```ts
builder.model('Project').field('projectCode').removeAttribute('unique');
```

```prisma
model Project {
  name        String
  projectCode String
}
```

### Access a field programmatically

If you want to perform a custom action that there isn't a Builder method for, you can access the underlying schema object programmatically.

```prisma
model TaskMessage {
  createdAt DateTime? @db.Timestamptz(6)
}
```

```ts
import { Field, Attribute } from '@mrleebo/prisma-ast';

// Replace the @db.Timestamptz(6) attribute with @default(now())
builder
  .model('TaskMessage')
  .field('createdAt')
  .then<Field>((field) => {
    const attribute: Attribute = {
      type: 'attribute',
      kind: 'field',
      name: 'default',
      args: [{ type: 'attributeArgument', value: 'now()' }],
    };
    field.attributes = [attribute];
  });
```

```prisma
model TaskMessage {
  createdAt DateTime? @default(now())
}
```

### Add an index to a model

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

```ts
builder.model('Project').blockAttribute('index', ['name']);
```

```prisma
model Project {
  name        String
  projectCode String @unique
  @@index([name])
}
```

### Add an enum

```ts
builder.enum('Role', ['USER', 'ADMIN']);
```

```prisma
enum Role {
  USER
  ADMIN
}
```

Additional enumerators can also be added to an existing Enum

```ts
builder
  .enum('Role')
  .break()
  .comment('New role added for feature #12')
  .enumerator('ORGANIZATION');
```

```prisma
enum Role {
  USER
  ADMIN

  // New role added for feature #12
  ORGANIZATION
}
```

### Comments and Line breaks are also parsed and can be added to the schema

```ts
builder
  .model('Project')
  .break()
  .comment('I wish I could add a color to your rainbow');
```

```prisma
model Project {
  name        String
  projectCode String @unique
  @@index([name])

  // I wish I could add a color to your rainbow
}
```

## Configuration Options

prisma-ast uses [lilconfig](https://github.com/antonk52/lilconfig) to read configuration options which
can be located in any of the following files, and in several other variations (see [the complete list of search paths](https://www.npmjs.com/package/cosmiconfig)):

- `"prisma-ast"` in `package.json`
- `.prisma-astrc`
- `.prisma-astrc.json`
- `.prisma-astrc.js`
- `.config/.prisma-astrc`

Configuration options are:

| Option                        | Description                                                                                                                                                                                     | Default Value |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `parser.nodeTrackingLocation` | Include the token locations of CST Nodes in the output schema.<br>Disabled by default because it can impact parsing performance.<br>Possible values are `"none"`, `"onlyOffset"`, and `"full"`. | `"none"`      |

### Example Custom Configuration

Here is an example of how you can customize your configuration options in `package.json`.

```json
{
  "prisma-ast": {
    "parser": {
      "nodeTrackingLocation": "full"
    }
  }
}
```

## Underlying utility functions

The `produceSchema` and `createPrismaSchemaBuilder` functions are intended to be your interface for interacting with the prisma schema, but you can also get direct access to the AST representation if you need to edit the schema for more advanced usages that aren't covered by the methods above.

### Parse a schema.prisma file into an AST object

The shape of the AST is not fully documented, and it is more likely to change than the builder API.

```ts
import { getSchema } from '@mrleebo/prisma-ast';

const source = `
model User {
  id   Int    @id @default(autoincrement())
  name String @unique
}
`;

const schema = getSchema(source);
```

### Print a schema AST back out as a string

This is what `builder.print()` calls internally, and is what you'd use to print if you called `getSchema()`.

```ts
import { printSchema } from '@mrleebo/prisma-ast';

const source = printSchema(schema);
```

You can optionally re-sort the schema. The default sort order is `['generator', 'datasource', 'model', 'enum']`, and objects with the same type are sorted alphabetically, but the sort order can be overridden.

```ts
const source = printSchema(schema, {
  sort: true,
  locales: 'en-US',
  sortOrder: ['datasource', 'generator', 'model', 'enum'],
});
```
