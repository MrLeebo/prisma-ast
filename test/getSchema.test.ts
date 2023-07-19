import getConfig from '../src/getConfig';
import { type Field, getSchema, type BlockAttribute } from '../src/getSchema';
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

    it('contains field location info', async () => {
      const source = await loadFixture('example.prisma');
      const components = getSchema(source);
      const field = getField();
      expect(field).toHaveProperty('location.startLine', 14);
      expect(field).toHaveProperty('location.startColumn', 3);
      // TODO: these offsets are OS-specific, due to the differing length of the line endings
      expect(field).toHaveProperty('location.startOffset');
      expect(field).toHaveProperty('location.endLine', 14);
      expect(field).toHaveProperty('location.endColumn', 4);
      expect(field).toHaveProperty('location.endOffset');

      function getField(): Field | null {
        for (const component of components.list) {
          if (component.type === 'model') {
            const field = component.properties.find(
              (field) => field.type === 'field'
            ) as Field;
            if (field) return field;
          }
        }
        return null;
      }
    });

    it('contains block attribute location info', async () => {
      const source = await loadFixture('example.prisma');
      const components = getSchema(source);
      const attr = getBlockAttribute();
      expect(attr).toHaveProperty('location.startLine', 37);
      expect(attr).toHaveProperty('location.startColumn', 3);
      expect(attr).toHaveProperty('location.startOffset');
      expect(attr).toHaveProperty('location.endLine', 37);
      expect(attr).toHaveProperty('location.endColumn', 7);
      expect(attr).toHaveProperty('location.endOffset');

      function getBlockAttribute(): BlockAttribute | null {
        for (const component of components.list) {
          if (component.type === 'model' && component.name === 'Post') {
            const attr = component.properties.find(
              (attr) => attr.type === 'attribute'
            );
            if (attr) return attr as BlockAttribute;
          }
        }
        return null;
      }
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
