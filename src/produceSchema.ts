import { PrintOptions } from './printSchema';
import { createPrismaSchemaBuilder } from './PrismaSchemaBuilder';

type Options = PrintOptions;

/**
 * Receives a prisma schema in the form of a string containing source code, and
 * a callback builder function. Use the builder to modify your schema as
 * desired. Returns the schema as a string with the modifications applied.
 * */
export function produceSchema(
  source: string,
  producer: (builder: ReturnType<typeof createPrismaSchemaBuilder>) => void,
  options: Options = {}
): string {
  const builder = createPrismaSchemaBuilder(source);
  producer(builder);
  return builder.print(options);
}
