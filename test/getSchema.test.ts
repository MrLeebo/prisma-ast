import getConfig from '../src/getConfig';
import { getSchema } from '../src/getSchema';
import { loadFixture, getFixtures } from './utils';

describe('getSchema', () => {
  for (const fixture of getFixtures()) {
    it(`parse ${fixture}`, async () => {
      const source = await loadFixture(fixture);
      const components = getSchema(source);

      expect(components).not.toBeUndefined();
      expect(components).toMatchSnapshot();
    });
  }

  describe('with location tracking', () => {
    beforeAll(() => {
      getConfig().parser.nodeLocationTracking = 'full';
    });

    afterAll(() => {
      getConfig().parser.nodeLocationTracking = 'none';
    });

    it('contains location info', async () => {
      const source = await loadFixture('example.prisma');
      const components = getSchema(source);
      expect(components).toHaveProperty('list[0].location.startLine', 1);
      expect(components).toHaveProperty('list[0].location.startColumn', 1);
      expect(components).toHaveProperty('list[0].location.startOffset', 0);
      expect(components).toHaveProperty('list[0].location.endLine', 1);
      expect(components).toHaveProperty('list[0].location.endColumn', 63);
      expect(components).toHaveProperty('list[0].location.endOffset', 62);
    });
  });

  describe('without location tracking', () => {
    it('does not contain location info', async () => {
      const source = await loadFixture('example.prisma');
      const components = getSchema(source);
      expect(components).not.toHaveProperty('list[0].location.startLine');
      expect(components).not.toHaveProperty('list[0].location.startColumn');
      expect(components).not.toHaveProperty('list[0].location.startOffset');
      expect(components).not.toHaveProperty('list[0].location.endLine');
      expect(components).not.toHaveProperty('list[0].location.endColumn');
      expect(components).not.toHaveProperty('list[0].location.endOffset');
    });
  });
});
