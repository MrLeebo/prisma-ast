import getConfig, { PrismaAstParserConfig } from '../src/getConfig';
import { type Field, getSchema, type BlockAttribute } from '../src/getSchema';
import { PrismaParser } from '../src/parser';
import { VisitorClassFactory } from '../src/visitor';
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

  // https://github.com/MrLeebo/prisma-ast/issues/28
  describe('empty comments', () => {
    it('parses empty comments', async () => {
      const source = await loadFixture('empty-comment.prisma');
      const schema = getSchema(source);

      for (const node of schema.list) {
        if (node.type !== 'model') continue;
        if (node.name !== 'Product') continue;

        for (const property of node.properties) {
          if (property.type === 'comment') {
            expect(property.text).toEqual('//');
            return;
          }
        }
      }

      fail();
    });

    it('parses empty inline comments', async () => {
      const source = await loadFixture('empty-comment.prisma');
      const schema = getSchema(source);

      for (const node of schema.list) {
        if (node.type !== 'model') continue;
        if (node.name !== 'Product') continue;

        for (const property of node.properties) {
          if (property.type === 'field' && property.comment != null) {
            expect(property.comment).toEqual('//');
            return;
          }
        }
      }

      fail();
    });

    it('parses empty comments in enum', async () => {
      const source = await loadFixture('empty-comment.prisma');
      const schema = getSchema(source);

      for (const node of schema.list) {
        if (node.type !== 'enum') continue;
        if (node.name !== 'TextType') continue;

        for (const property of node.enumerators) {
          if (property.type === 'comment') {
            expect(property.text).toEqual('//');
            return;
          }
        }
      }

      fail();
    });

    it('parses empty inline enum comments', async () => {
      const source = await loadFixture('empty-comment.prisma');
      const schema = getSchema(source);

      for (const node of schema.list) {
        if (node.type !== 'enum') continue;
        if (node.name !== 'TextType') continue;

        for (const property of node.enumerators) {
          if (property.type === 'enumerator' && property.comment != null) {
            expect(property.comment).toEqual('//');
            return;
          }
        }
      }

      fail();
    });
  });

  describe('with location tracking', () => {
    describe('passed-in parser and visitor', () => {
      it('contains field location info', async () => {
        const source = await loadFixture('example.prisma');
        const config: PrismaAstParserConfig = {
          nodeLocationTracking: 'full',
        };
        const parser = new PrismaParser(config);
        const VisitorClass = VisitorClassFactory(parser);
        const visitor = new VisitorClass(parser);
        const components = getSchema(source, {
          parser,
          visitor,
        });
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
    });

    describe('static config', () => {
      beforeAll(() => {
        getConfig().parser.nodeLocationTracking = 'full';
      });

      afterAll(() => {
        getConfig().parser.nodeLocationTracking = 'none';
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
