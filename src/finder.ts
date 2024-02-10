import type * as schema from './getSchema';

export type ByTypeSourceObject =
  | schema.Block
  | schema.Enumerator
  | schema.Field
  | schema.Property
  | schema.Attribute;

export type ByTypeMatchObject = Exclude<
  ByTypeSourceObject,
  schema.Comment | schema.Break
>;
export type ByTypeMatch = ByTypeMatchObject['type'];
export type ByTypeOptions = { name?: string | RegExp };
export type FindByBlock<Match> = Extract<ByTypeMatchObject, { type: Match }>;

export const findByType = <const Match extends ByTypeMatch>(
  list: ByTypeSourceObject[],
  typeToMatch: Match,
  options: ByTypeOptions = {}
): FindByBlock<Match> | null => {
  const [match, unexpected] = list.filter(findBy(typeToMatch, options));

  if (!match) return null;

  if (unexpected)
    throw new Error(`Found multiple blocks with [type=${typeToMatch}]`);

  return match;
};

export const findAllByType = <const Match extends ByTypeMatch>(
  list: ByTypeSourceObject[],
  typeToMatch: Match,
  options: ByTypeOptions = {}
): Array<FindByBlock<Match>> => {
  return list.filter(findBy(typeToMatch, options));
};

const findBy =
  <Match extends ByTypeMatch>(
    typeToMatch: Match,
    { name }: ByTypeOptions = {}
  ) =>
  (block: ByTypeSourceObject): block is FindByBlock<Match> => {
    if (name != null) {
      if (!('name' in block)) return false;
      const nameMatches =
        typeof name === 'string' ? block.name === name : name.test(block.name);
      if (!nameMatches) return false;
    }

    return block.type === typeToMatch;
  };
