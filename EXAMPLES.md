# SchemaBuilder

## Additional examples

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

### Access a datasource programmatically

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

### Add or update a view

If the view with that name already exists in the schema, it will be selected and any fields that follow will be appended to the view. Otherwise, the view will be created and added to the schema.

```ts
builder.view('Project').field('name', 'String');
```

```prisma
model Project {
  name String
}
```

### Add or update a composite type

If the composite type with that name already exists in the schema, it will be selected and any fields that follow will be appended to the type. Otherwise, the composite type will be created and added to the schema.

```ts
builder.type('Photo').field('width', 'Int').field('height', 'Int').field('url', 'String');
```

```prisma
type Photo {
  width   Int
  height  Int
  url     String
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
