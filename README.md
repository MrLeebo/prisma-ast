# @mrleebo/prisma-ast

This library uses an abstract syntax tree to parse schema.prisma files into an object in JavaScript. 

It is similar to [@prisma/sdk](https://github.com/prisma/prisma/tree/master/src/packages/sdk) except that it preserves comments and model attributes. It also doesn't attempt to validate the correctness of the schema at all; the focus is instead on the ability to parse the schema into an object, manipulate it using JavaScript, and re-print the schema back to a file without losing information that isn't captured by other parsers.

> It is probable that a future version of @prisma/sdk will render this library obsolete.

## Install

```bash
npm install @mrleebo/prisma-ast
```

## Examples

### Parse a schema.prisma file into a JS object

```ts
import { getSchema } from '@mrleebo/prisma-ast'

const source = `
model User {
  id   Int    @id @default(autoincrement())
  name String @unique
}
`

const schema = getSchema(source)
```

### Print a schema back out as a string

```ts
import { printSchema } from '@mrleebo/prisma-ast'

const source = printSchema(schema)
```

### Add a datasource

```ts
schema.list.push({
  type: "datasource",
  name: "db",
  assignments: [
    {type: "assignment", key: "provider", value: '"postgresql"'},
    {
      type: "assignment",
      key: "url",
      value: {type: "function", name: "env", params: ['"DATABASE_URL"']},
    },
  ],
})
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Add a generator

```ts
schema.list.push({
  type: "generator",
  name: "nexusPrisma",
  assignments: [{type: "assignment", key: "provider", value: '"nexus-prisma"'}],
})
```

```prisma
generator nexusPrisma {
  provider = "nexus-prisma"
}
```

### Add a model

```ts
const model = schema.list.push({
  type: "model",
  name: "Project",
  properties: [
    { type: "field", name: "name", fieldType: "String" }
  ]
})
```

```prisma
model Project {
  name String
}
```

### Add a field to a model

```ts
const field = model.properties.push({
  type: "field",
  name: "projectCode",
  fieldType: "String",
  optional: false,
  attributes: [{type: "attribute", kind: "field", name: "unique"}],
})
```

```prisma
model Project {
  name        String
  projectCode String @unique
}
```

### Add an index to a model

```ts
model.properties.push({
  type: "attribute",
  kind: "model",
  name: "index",
  args: [{ type: "attributeArgument", value: { type: "array", args: ["name"] } }]
})
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
schema.list.push({
  type: "enum",
  name: "Role",
  enumerators: [
    {type: "enumerator", name: "USER"},
    {type: "enumerator", name: "ADMIN"},
  ],
})
```

```prisma
enum Role {
  USER
  ADMIN
}
```

### Comments and Line breaks are also parsed and can be added to the schema

```ts
model.properties.push({
  type: "break"
}, {
  type: "comment",
  text: "// I wish I could add a color to your rainbow"
})
```

```prisma
model Project {
  name        String
  projectCode String @unique
  @@index([name])

  // I wish I could add a color to your rainbow
}
```
