import { readFile, readdirSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

export function loadFixture(name: string) {
  const fixturePath = join(__dirname, 'fixtures', name);
  return readFileAsync(fixturePath, { encoding: 'utf-8' });
}

export function getFixtures() {
  const fixtureDir = join(__dirname, 'fixtures');
  return readdirSync(fixtureDir);
}
