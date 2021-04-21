import { getSchema } from '../src/getSchema';
import { loadFixture, getFixtures } from './utils';

describe('getSchema', () => {
  for (const fixture of getFixtures()) {
    it(`parse ${fixture}`, async () => {
      const source = await loadFixture(fixture);
      const components = getSchema(source);

      expect(components).not.toBeUndefined();
      expect(JSON.stringify(components, null, 2)).toMatchSnapshot();
    });
  }
});
