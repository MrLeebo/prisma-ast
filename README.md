<p align="center">
  <a href="https://www.npmjs.com/package/prisma-ast" target="_blank" rel="noopener">
    <img src="https://img.shields.io/npm/dw/@mrleebo/prisma-ast.svg" alt="Total Downloads" />
  </a>
  <a href="https://www.npmjs.com/package/@mrleebo/prisma-ast" target="_blank" rel="noopener">
    <img src="https://img.shields.io/npm/v/@mrleebo/prisma-ast.svg" alt="npm package"/>
  </a>
  <a href="https://github.com/mrleebo/prisma-ast/blob/main/LICENSE" target="_blank" rel="noopener">
    <img src="https://img.shields.io/npm/l/@mrleebo/prisma-ast.svg" alt="License">
  </a>
</p>
<p align="center">
  <a href="https://www.prisma.io/">
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" height="28" />
  </a>
  <a href="https://www.buymeacoffee.com/mrleebo" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="Buy Me A Coffee" height="28" >
  </a>
</p>

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

const source = `
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

### Query the prisma schema for specific objects

The builder can also help you find matching objects in the schema based on name (by string or RegExp) or parent context. You can use this to write tests against your schema, or find fields that don't match a naming convention, for example.

```ts
const source = `
  model Product {
    id     String  @id @default(auto()) @map("_id") @db.ObjectId
    name   String
    photos Photo[]
  }
`

const builder = createPrismaSchemaBuilder(source);

const product = builder.findByType('model', { name: 'Product' });
expect(product).toHaveProperty('name', 'Product');

const id = builder.findByType('field', {
  name: 'id',
  within: product?.properties,
});
expect(id).toHaveProperty('name', 'id');

const map = builder.findByType('attribute', {
  name: 'map',
  within: id?.attributes,
});
expect(map).toHaveProperty('name', 'map');
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

### Need More SchemaBuilder Code snippets?

There is a lot that you can do with the schema builder. There are [additional sample references available](./EXAMPLES.md) for you to explore.

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
