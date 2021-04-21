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
});
