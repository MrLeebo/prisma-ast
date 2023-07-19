import { Block, Schema } from './getSchema';

const unsorted = ['break', 'comment'];
const defaultSortOrder = [
  'generator',
  'datasource',
  'model',
  'view',
  'enum',
  'break',
  'comment',
];

/** Sorts the schema parts, in the given order, and alphabetically for parts of the same type. */
export const schemaSorter =
  (
    schema: Schema,
    locales?: string | string[],
    sortOrder: string[] = defaultSortOrder
  ) =>
  (a: Block, b: Block): number => {
    // Preserve the position of comments and line breaks relative to their
    // position in the file, since when a re-sort happens it wouldn't be
    // clear whether a comment should affix to the object above or below it.
    const aUnsorted = unsorted.indexOf(a.type) !== -1;
    const bUnsorted = unsorted.indexOf(b.type) !== -1;

    if (aUnsorted !== bUnsorted) {
      return schema.list.indexOf(a) - schema.list.indexOf(b);
    }

    if (sortOrder !== defaultSortOrder)
      sortOrder = sortOrder.concat(defaultSortOrder);
    const typeIndex = sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type);
    if (typeIndex !== 0) return typeIndex;

    // Resolve ties using the name of object's name.
    if ('name' in a && 'name' in b)
      return a.name.localeCompare(b.name, locales);

    // If all else fails, leave objects in their original position.
    return 0;
  };
