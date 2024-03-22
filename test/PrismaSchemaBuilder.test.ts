import { createPrismaSchemaBuilder } from '../src/PrismaSchemaBuilder';
import * as schema from '../src/getSchema';
import { loadFixture } from './utils';

describe('PrismaSchemaBuilder', () => {
  it('adds a generator', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .generator('client', 'prisma-client-js')
      .assignment('output', 'client.js');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      generator client {
        provider = "prisma-client-js"
        output   = "client.js"
      }
      "
    `);
  });

  it('updates an existing generator', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .generator('client', 'prisma-client-js')
      .assignment('output', 'client.js');
    builder.generator('client').assignment('engineType', 'library');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      generator client {
        provider   = "prisma-client-js"
        output     = "client.js"
        engineType = "library"
      }
      "
    `);
  });

  it('accesses a generator', () => {
    const builder = createPrismaSchemaBuilder();
    builder.generator('client').then<schema.Generator>((generator) => {
      const assignment = generator.assignments[0] as schema.Assignment;
      assignment.value = '"prisma-client-ts"';
    });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      generator client {
        provider = "prisma-client-ts"
      }
      "
    `);
  });

  it('sets the datasource', () => {
    const builder = createPrismaSchemaBuilder();
    builder.datasource('postgresql', { env: 'DATABASE_URL' });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource db {
        url      = env("DATABASE_URL")
        provider = postgresql
      }
      "
    `);
  });

  it('accesses the datasource', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .datasource('postgresql', { env: 'DATABASE_URL' })
      .then<schema.Datasource>((datasource) => {
        datasource.name = 'my-database';
      });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource my-database {
        url      = env("DATABASE_URL")
        provider = postgresql
      }
      "
    `);
  });

  it('can reset datasource url with assignments', () => {
    // not really sure why you'd do this, but *shrug*
    const builder = createPrismaSchemaBuilder();
    builder
      .datasource('postgresql', { env: 'DATABASE_URL' })
      .assignment('url', 'https://database.com');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource db {
        url      = "https://database.com"
        provider = postgresql
      }
      "
    `);
  });

  it('adds a model', () => {
    const builder = createPrismaSchemaBuilder();
    builder.model('Project').field('name', 'String');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        name String
      }
      "
    `);
  });

  it('removes a model', () => {
    const builder = createPrismaSchemaBuilder(`
      datasource db {
        url = env("DATABASE_URL")
      }

      model Project {
        name String
      }
    `);
    builder.drop('Project');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource db {
        url = env("DATABASE_URL")
      }


      "
    `);
  });

  it("removes nothing if the object being dropped doesn't exist", () => {
    const builder = createPrismaSchemaBuilder(`
      datasource db {
        url = env("DATABASE_URL")
      }

      model Project {
        name String
      }
    `);
    builder.drop('TheBeat');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource db {
        url = env("DATABASE_URL")
      }

      model Project {
        name String
      }
      "
    `);
  });

  it('accesses a model', () => {
    const builder = createPrismaSchemaBuilder(`
    model Project {
      name String
    }
  `);
    builder.model('Project').then<schema.Model>((project) => {
      project.name = 'Task';
    });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Task {
        name String
      }
      "
    `);
  });

  it('renames a model attribute', () => {
    const builder = createPrismaSchemaBuilder(`
    model Project {
      name String

      @@id([name])
    }
  `);
    builder.model('Project').then<schema.Model>((project) => {
      for (const prop of project.properties) {
        if (prop.type === 'attribute' && prop.name === 'id') {
          prop.name = 'unique';
          return;
        }
      }
    });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        name String

        @@unique([name])
      }
      "
`);
  });

  it('removes an enum', () => {
    const builder = createPrismaSchemaBuilder(`
    datasource db {
      url = env("DATABASE_URL")
    }

    enum Role {
      MEMBER
      ADMIN
    }
    `);

    builder.drop('Role');

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      datasource db {
        url = env("DATABASE_URL")
      }


      "
    `);
  });

  it('adds an enum', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .enum('Role', ['USER', 'ADMIN'])
      .break()
      .comment('test')
      .enumerator('OWNER');

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      enum Role {
        USER
        ADMIN

        // test
        OWNER
      }
      "
    `);
  });

  it('updates an existing enum', () => {
    const builder = createPrismaSchemaBuilder();
    builder.enum('Role', ['USER', 'ADMIN']);
    builder.enum('Role').enumerator('OWNER');

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      enum Role {
        USER
        ADMIN
        OWNER
      }
      "
    `);
  });

  it('accesses an enum', () => {
    const builder = createPrismaSchemaBuilder();
    builder.enum('Role', ['USER', 'ADMIN']).then<schema.Enum>((e) => {
      e.name = 'UserType';
    });

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      enum UserType {
        USER
        ADMIN
      }
      "
    `);
  });

  it('adds a field to an existing model', () => {
    const builder = createPrismaSchemaBuilder(`
    model Project {
      name String
    }
    `);
    builder.model('Project').field('description', 'String');
    builder.model('Project').field('owner', 'String');

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        name        String
        description String
        owner       String
      }
      "
    `);
  });

  it('updates an existing field', () => {
    const builder = createPrismaSchemaBuilder(`
    model TaskScript {
      name      String
      createdAt DateTime
      updatedAt DateTime
    }
    `);
    builder
      .model('TaskScript')
      .field('createdAt', 'DateTime')
      .attribute('default', [{ name: 'now' }]);
    builder
      .model('TaskScript')
      .field('updatedAt', 'DateTime')
      .attribute('updatedAt');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model TaskScript {
        name      String
        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt
      }
      "
    `);
  });

  it('removes a field', () => {
    const builder = createPrismaSchemaBuilder(`
    model TaskScript {
      name      String
      createdAt DateTime
      updatedAt DateTime
    }
    `);
    builder
      .model('TaskScript')
      .removeField('createdAt')
      .removeField('updatedAt');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model TaskScript {
        name String
      }
      "
    `);
  });

  it('adds an attribute', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('TaskMessage')
      .field('createdAt', 'DateTime?')
      .attribute('db.Timestamptz', ['6']);
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model TaskMessage {
        createdAt DateTime? @db.Timestamptz(6)
      }
      "
    `);
  });

  it('replaces an attribute', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('TaskMessage')
      .field('createdAt', 'DateTime?')
      .attribute('db.Timestamptz', ['6']);

    // Replace the @db.Timestamptz(6) attribute by dropping and re-creating the field
    builder
      .model('TaskMessage')
      .field('createdAt', 'DateTime?')
      .removeAttribute('db.Timestamptz')
      .attribute('default', [{ name: 'now' }]);
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model TaskMessage {
        createdAt DateTime? @default(now())
      }
      "
    `);
  });

  it('replaces an attribute with access', () => {
    // Set up the schema with a model and a field with an attribute
    const builder = createPrismaSchemaBuilder();
    builder
      .model('TaskMessage')
      .field('createdAt', 'DateTime?')
      .attribute('db.Timestamptz', ['6']);

    // Replace the @db.Timestamptz(6) attribute with @default(now())
    builder
      .model('TaskMessage')
      .field('createdAt')
      .then<schema.Field>((field) => {
        const attribute: schema.Attribute = {
          kind: 'field',
          name: 'default',
          type: 'attribute',
          args: [{ type: 'attributeArgument', value: 'now()' }],
        };
        field.attributes = [attribute];
      });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model TaskMessage {
        createdAt DateTime? @default(now())
      }
      "
    `);
  });

  it('adds a field relation', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('Project')
      .field('user', 'User')
      .attribute('relation', { fields: ['clientId'], references: ['id'] });
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        user User @relation(fields: [clientId], references: [id])
      }
      "
    `);
  });

  it('adds a map attribute', () => {
    const builder = createPrismaSchemaBuilder();
    builder.model('Project').blockAttribute('map', 'projects');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        @@map("projects")
      }
      "
    `);
  });

  it('adds an id attribute', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('User')
      .field('firstName', 'String')
      .field('lastName', 'String')
      .blockAttribute('id', ['firstName', 'lastName']);
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model User {
        firstName String
        lastName  String

        @@id([firstName, lastName])
      }
      "
    `);
  });

  it('adds a unique attribute', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('Project')
      .field('code', 'String')
      .field('client', 'String')
      .blockAttribute('unique', ['code', 'client']);
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        code   String
        client String

        @@unique([code, client])
      }
      "
    `);
  });

  it('adds a comment', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('User')
      .comment('this is the part of the name you say first', true)
      .field('firstName', 'String')
      .comment('this is the part of the name you say last', true)
      .field('lastName', 'String')
      .break()
      .comment('this is a random comment')
      .break();

    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model User {
        /// this is the part of the name you say first
        firstName String
        /// this is the part of the name you say last
        lastName  String

        // this is a random comment

      }
      "
    `);
  });

  it('adds a schema comment', () => {
    const builder = createPrismaSchemaBuilder();
    builder
      .model('Project')
      .schemaComment('this is a comment')
      .schemaComment('this is a node comment', true)
      .model('Node');
    expect(builder.print()).toMatchInlineSnapshot(`
      "
      model Project {
        
      }
      // this is a comment
      /// this is a node comment

      model Node {
        
      }
      "
    `);
  });

  it('can reference the same attribute', () => {
    const builder = createPrismaSchemaBuilder(`
    model Test {
      id String @id @default(auto()) @map(\\"_id\\") @db.ObjectId
    }
    `);
    const result = builder
      .model('Test')
      .field('id', 'String')
      .attribute('id')
      .attribute('default', [{ name: 'auto' }])
      .attribute('map', [`"_id"`])
      .attribute('db.ObjectId')
      .print();
    expect(result).toMatchInlineSnapshot(`
      "
      model Test {
        id String @id @default(auto()) @map("_id") @db.ObjectId
      }
      "
    `);
  });

  it('can create a view', () => {
    const builder = createPrismaSchemaBuilder(`
    model Project {
      name String
    }
    `);
    const result = builder
      .view('TestView')
      .field('id', 'String')
      .attribute('id')
      .attribute('default', [{ name: 'auto' }])
      .attribute('map', [`"_id"`])
      .attribute('db.ObjectId')
      .print();
    expect(result).toMatchInlineSnapshot(`
      "
      model Project {
        name String
      }

      view TestView {
        id String @id @default(auto()) @map("_id") @db.ObjectId
      }
      "
    `);
  });

  it('edits an existing view', () => {
    const builder = createPrismaSchemaBuilder(`
    view TestView {
      id String
    }
    `);
    const result = builder.view('TestView').field('name', 'String').print();
    expect(result).toMatchInlineSnapshot(`
          "
          view TestView {
            id   String
            name String
          }
          "
      `);
  });

  it('adds a composite type', async () => {
    const builder = createPrismaSchemaBuilder(`
    datasource db {
      provider = "mongodb"
      url      = env("DATABASE_URL")
    }
    
    model Product {
      id     String  @id @default(auto()) @map("_id") @db.ObjectId
      name   String
      photos Photo[]
    }
    `);

    const result = builder
      .type('Photo')
      .field('height', 'Int')
      .attribute('default', ['0'])
      .field('width', 'Int')
      .attribute('default', ['0'])
      .field('url', 'String')
      .print();

    expect(result).toMatchSnapshot();
  });

  it('adds a mapped enum', async () => {
    const builder = createPrismaSchemaBuilder(`
    enum GradeLevel {
      KINDERGARTEN   @map("kindergarten")
      FIRST          @map("first")
      SECOND         @map("second")
      THIRD          @map("third")
      FOURTH         @map("fourth")
      FIFTH          @map("fifth")
      SIXTH          @map("sixth")
      SEVENTH        @map("seventh")
      EIGHTH         @map("eighth")
      NINTH          @map("ninth")
      TENTH          @map("tenth")
      ELEVENTH       @map("eleventh")
      TWELFTH        @map("twelfth")
      THIRTEEN       @map("thirteen")
      POST_SECONDARY @map("post_secondary")
      OTHER          @map("other")
    }
    `);

    builder
      .enum('GradeLevel')
      .enumerator('FOO')
      .attribute('map', ['"foo"'])
      .break()
      .blockAttribute('map', 'grades');
    expect(builder.print()).toMatchSnapshot();
  });

  it('prints the schema', async () => {
    const source = await loadFixture('example.prisma');
    const result = createPrismaSchemaBuilder(source).print();
    expect(result).toMatchInlineSnapshot(`
      "// https://www.prisma.io/docs/concepts/components/prisma-schema
      // added some fields to test keyword ambiguous

      datasource db {
        url      = env("DATABASE_URL")
        provider = "postgresql"
      }

      generator client {
        provider = "prisma-client-js"
      }

      model User {
        id        Int       @id @default(autoincrement())
        createdAt DateTime  @default(now())
        email     String    @unique
        name      String?
        role      Role      @default(USER)
        posts     Post[]
        projects  Project[]
      }

      model Post {
        id         Int      @id @default(autoincrement())
        createdAt  DateTime @default(now())
        updatedAt  DateTime @updatedAt
        published  Boolean  @default(false)
        title      String   @db.VarChar(255)
        author     User?    @relation(fields: [authorId], references: [id])
        authorId   Int?
        // keyword test
        model      String
        generator  String
        datasource String
        enum       String // inline comment

        @@map("posts")
      }

      model Project {
        client      User     @relation(fields: [clientId], references: [id])
        clientId    Int
        projectCode String
        dueDate     DateTime

        @@id([projectCode])
        @@unique([clientId, projectCode])
        @@index([dueDate])
      }

      model Model {
        id Int @id

        @@ignore
      }

      enum Role {
        USER @map("usr") // basic role
        ADMIN @map("adm") // more powerful role

        @@map("roles")
      }

      model Indexed {
        id  String @id(map: "PK_indexed") @db.UniqueIdentifier
        foo String @db.UniqueIdentifier
        bar String @db.UniqueIdentifier

        @@index([foo, bar(sort: Desc)], map: "IX_indexed_indexedFoo")
      }
      "
    `);
  });
});
