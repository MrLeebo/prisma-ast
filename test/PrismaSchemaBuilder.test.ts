import { createPrismaSchemaBuilder } from '../src/PrismaSchemaBuilder';
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
        provider = \\"prisma-client-js\\"
        output   = \\"client.js\\"
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
        provider   = \\"prisma-client-js\\"
        output     = \\"client.js\\"
        engineType = \\"library\\"
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
        url      = env(\\"DATABASE_URL\\")
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
        url      = \\"https://database.com\\"
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
        url = env(\\"DATABASE_URL\\")
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
        url = env(\\"DATABASE_URL\\")
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
        @@map(\\"projects\\")
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

  it('prints the schema', async () => {
    const source = await loadFixture('example.prisma');
    const result = createPrismaSchemaBuilder(source).print();
    expect(result).toMatchInlineSnapshot(`
      "// https://www.prisma.io/docs/concepts/components/prisma-schema
      // added some fields to test keyword ambiguous

      datasource db {
        url      = env(\\"DATABASE_URL\\")
        provider = \\"postgresql\\"
      }

      generator client {
        provider = \\"prisma-client-js\\"
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

        @@map(\\"posts\\")
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
        USER // basic role
        ADMIN // more powerful role
      }

      model Indexed {
        id  String @id(map: \\"PK_indexed\\") @db.UniqueIdentifier
        foo String @db.UniqueIdentifier
        bar String @db.UniqueIdentifier

        @@index([foo, bar(sort: Desc)], map: \\"IX_indexed_indexedFoo\\")
      }
      "
    `);
  });
});
