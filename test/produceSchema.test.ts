import { produceSchema } from '../src/produceSchema';

describe('produceSchema', () => {
  it('prints the schema', () => {
    const result = produceSchema(
      '',
      (builder) => {
        builder
          .datasource('postgresql', { env: 'DATABASE_URL' })
          .generator('client', 'prisma-client-js')
          .enum('Role', ['USER', 'ADMIN'])
          .model('User')
          .field('id', 'Int')
          .attribute('id')
          .attribute('default', [{ name: 'autoincrement' }])
          .field('name', 'String')
          .attribute('unique')
          .model('AppSetting')
          .field('key', 'String')
          .attribute('id')
          .field('value', 'Json')
          .blockAttribute('index', ['key']);
      },
      { sort: true }
    );

    expect(result).toMatchInlineSnapshot(`
      "
      generator client {
        provider = "prisma-client-js"
      }

      datasource db {
        url      = env("DATABASE_URL")
        provider = "postgresql"
      }

      model AppSetting {
        key   String @id
        value Json

        @@index([key])
      }

      model User {
        id   Int    @id @default(autoincrement())
        name String @unique
      }

      enum Role {
        USER
        ADMIN
      }
      "
    `);
  });
});
