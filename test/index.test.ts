import * as ast from '../src';

describe('@mrleebo/prisma-ast', () => {
  it.each([
    [ast.produceSchema],
    [ast.getSchema],
    [ast.printSchema],
    [ast.createPrismaSchemaBuilder],
  ])('exports expected functions', (importFn) => {
    expect(typeof importFn).toBe('function');
  });
});
