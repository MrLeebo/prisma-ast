import { createPrismaSchemaBuilder } from '../src/PrismaSchemaBuilder';
import { loadFixture } from './utils';

describe('finder', () => {
  it('finds a model', async () => {
    const source = await loadFixture('example.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const model = finder.findByType('model', { name: 'Indexed' });
    expect(model).toHaveProperty('name', 'Indexed');
  });

  it('finds all matching models', async () => {
    const source = await loadFixture('atena-server.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const [proposalData, data, accountabilityData, unexpected] =
      finder.findAllByType('model', {
        name: /Data$/,
      });
    expect(proposalData).toHaveProperty('name', 'ProposalData');
    expect(data).toHaveProperty('name', 'Data');
    expect(accountabilityData).toHaveProperty('name', 'AccountabilityData');
    expect(unexpected).toBeUndefined();
  });

  it('finds an enumerator', async () => {
    const source = await loadFixture('atena-server.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const groupAccess = finder.findByType('enum', { name: 'GroupAccess' });
    expect(groupAccess).toHaveProperty('name', 'GroupAccess');

    const cities = finder.findByType('enumerator', {
      name: 'CITIES',
      within: groupAccess?.enumerators,
    });

    expect(cities).toHaveProperty('name', 'CITIES');
  });

  it('finds all matching fields', async () => {
    const source = await loadFixture('empty-comment.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const product = finder.findByType('model', { name: 'Product' });
    expect(product).toHaveProperty('name', 'Product');

    const [unit, unitOfMeasurement, unexpected] = finder.findAllByType(
      'field',
      { name: /unit/i, within: product?.properties }
    );
    expect(unit).toHaveProperty('name', 'unit');
    expect(unitOfMeasurement).toHaveProperty('name', 'unitOfMeasurement');
    expect(unexpected).toBeUndefined();
  });

  it('finds an attribute', async () => {
    const source = await loadFixture('composite-types.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const product = finder.findByType('model', { name: 'Product' });
    expect(product).toHaveProperty('name', 'Product');

    const id = finder.findByType('field', {
      name: 'id',
      within: product?.properties,
    });
    expect(id).toHaveProperty('name', 'id');

    const map = finder.findByType('attribute', {
      name: 'map',
      within: id?.attributes,
    });
    expect(map).toHaveProperty('name', 'map');
    expect(map).toHaveProperty(['args', 0, 'value'], '"_id"');
  });

  it('finds an assignment', async () => {
    const source = await loadFixture('kebab-case.prisma');
    const finder = createPrismaSchemaBuilder(source);

    const generator = finder.findByType('generator', {
      name: 'prisma-model-generator',
    });
    expect(generator).toHaveProperty('name', 'prisma-model-generator');

    const assignment = finder.findByType('assignment', {
      name: 'fileNamingStyle',
      within: generator?.assignments,
    });
    expect(assignment).toHaveProperty('value', '"kebab"');
  });
});
