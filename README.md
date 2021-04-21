# prisma-ast

This library uses an abstract syntax tree to parse schema.prisma files into an object in JavaScript. It is similar to [@prisma/sdk](https://github.com/prisma/prisma/tree/master/src/packages/sdk) except that it preserves comments and model attributes.

> It is probable that a future version of @prisma/sdk will render this library obsolete.

## Install

```bash
npm install prisma-ast
```

## Usage

```js
import { getSchema, printSchema }

function modifySchema() {
  const source = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

  const schema = getSchema(source);
  schema.list.push({ 
    type: "generator", 
    name: "nexusPrisma", 
    assignments: { type: "assignment", key: "provider", value: "nexus-prisma" } 
  });
  
  return printSchema(schema);
  /*
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator nexusPrisma {
  provider = "nexus-prisma"
}
  */
}
```
