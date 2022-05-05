import { PrintOptions } from './printSchema';
import { createPrismaSchemaBuilder } from './PrismaSchemaBuilder';

type Options = PrintOptions;

export function produceSchema(
  source: string,
  producer: (builder: ReturnType<typeof createPrismaSchemaBuilder>) => void,
  options: Options = {}
): string {
  const builder = createPrismaSchemaBuilder(source);
  producer(builder);
  return builder.print(options);
}
