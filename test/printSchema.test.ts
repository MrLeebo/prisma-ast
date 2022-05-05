import { getSchema, printSchema } from '../src';
import { loadFixture, getFixtures } from './utils';

describe('printSchema', () => {
  for (const fixture of getFixtures()) {
    it(`print ${fixture}`, async () => {
      const source = await loadFixture(fixture);
      const schema = getSchema(source);
      expect(schema).not.toBeUndefined();
      expect(printSchema(schema)).toMatchSnapshot();
    });
  }

  it('prints windows-style line breaks', () => {
    const source = `
model Foo {
  one Int\r\n\r\n\r\ntwo String
}
    `;
    const schema = getSchema(source);
    expect(schema).not.toBeUndefined();
    expect(printSchema(schema)).toMatchSnapshot();
  });

  it('re-sorts the schema', async () => {
    const source = await loadFixture('unsorted.prisma');
    const schema = getSchema(source);
    expect(schema).not.toBeUndefined();
    expect(printSchema(schema, { sort: true, locales: 'en-US' }))
      .toMatchInlineSnapshot(`
      "
      generator client {
        provider = \\"prisma-client-js\\"
      }

      datasource db {
        url      = env(\\"DATABASE_URL\\")
        provider = \\"postgresql\\"
      }

      model AppSetting {
        key   String @id
        value Json
      }

      model User {
        id        Int      @id @default(autoincrement())
        createdAt DateTime @default(now())
        email     String   @unique
        name      String?
        role      Role     @default(MEMBER)
      }

      enum Role {
        ADMIN
        OWNER // similar to ADMIN, but can delete the project
        MEMBER
        USER // deprecated
      }
      // this is a comment
      "
    `);
  });

  it('re-sorts the schema with a custom sort order', async () => {
    const source = await loadFixture('unsorted.prisma');
    const schema = getSchema(source);
    expect(schema).not.toBeUndefined();
    expect(
      printSchema(schema, {
        sort: true,
        locales: 'en-US',
        sortOrder: ['generator', 'datasource', 'model', 'enum'],
      })
    ).toMatchInlineSnapshot(`
      "
      generator client {
        provider = \\"prisma-client-js\\"
      }

      datasource db {
        url      = env(\\"DATABASE_URL\\")
        provider = \\"postgresql\\"
      }

      model AppSetting {
        key   String @id
        value Json
      }

      model User {
        id        Int      @id @default(autoincrement())
        createdAt DateTime @default(now())
        email     String   @unique
        name      String?
        role      Role     @default(MEMBER)
      }

      enum Role {
        ADMIN
        OWNER // similar to ADMIN, but can delete the project
        MEMBER
        USER // deprecated
      }
      // this is a comment
      "
    `);
  });
});
