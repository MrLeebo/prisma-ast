import { PrismaLexer } from '../src/lexer';
import { loadFixture } from './utils';

describe('lexer', () => {
  it('can tokenize', async () => {
    const source = await loadFixture('star.prisma');
    const tokens = PrismaLexer.tokenize(source);
    expect(tokens).toMatchSnapshot();
  });
});
