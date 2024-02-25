import { createToken, Lexer, IMultiModeLexerDefinition } from 'chevrotain';

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z][\w-]*/,
});
export const Datasource = createToken({
  name: 'Datasource',
  pattern: /datasource/,
  push_mode: 'block',
});
export const Generator = createToken({
  name: 'Generator',
  pattern: /generator/,
  push_mode: 'block',
});
export const Model = createToken({
  name: 'Model',
  pattern: /model/,
  push_mode: 'block',
});
export const View = createToken({
  name: 'View',
  pattern: /view/,
  push_mode: 'block',
});
export const Enum = createToken({
  name: 'Enum',
  pattern: /enum/,
  push_mode: 'block',
});
export const Type = createToken({
  name: 'Type',
  pattern: /type/,
  push_mode: 'block',
});
export const True = createToken({
  name: 'True',
  pattern: /true/,
  longer_alt: Identifier,
});
export const False = createToken({
  name: 'False',
  pattern: /false/,
  longer_alt: Identifier,
});
export const Null = createToken({
  name: 'Null',
  pattern: /null/,
  longer_alt: Identifier,
});
export const Comment = createToken({
  name: 'Comment',
  pattern: Lexer.NA,
});

export const DocComment = createToken({
  name: 'DocComment',
  pattern: /\/\/\/[ \t]*(.*)/,
  categories: [Comment],
});
export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/[ \t]*(.*)/,
  categories: [Comment],
});
export const Attribute = createToken({
  name: 'Attribute',
  pattern: Lexer.NA,
});
export const BlockAttribute = createToken({
  name: 'BlockAttribute',
  pattern: /@@/,
  label: "'@@'",
  categories: [Attribute],
});
export const FieldAttribute = createToken({
  name: 'FieldAttribute',
  pattern: /@/,
  label: "'@'",
  categories: [Attribute],
});
export const Dot = createToken({
  name: 'Dot',
  pattern: /\./,
  label: "'.'",
});
export const QuestionMark = createToken({
  name: 'QuestionMark',
  pattern: /\?/,
  label: "'?'",
});
export const LCurly = createToken({
  name: 'LCurly',
  pattern: /{/,
  label: "'{'",
});
export const RCurly = createToken({
  name: 'RCurly',
  pattern: /}/,
  label: "'}'",
  pop_mode: true,
});
export const LRound = createToken({
  name: 'LRound',
  pattern: /\(/,
  label: "'('",
});
export const RRound = createToken({
  name: 'RRound',
  pattern: /\)/,
  label: "')'",
});
export const LSquare = createToken({
  name: 'LSquare',
  pattern: /\[/,
  label: "'['",
});
export const RSquare = createToken({
  name: 'RSquare',
  pattern: /\]/,
  label: "']'",
});
export const Comma = createToken({
  name: 'Comma',
  pattern: /,/,
  label: "','",
});
export const Colon = createToken({
  name: 'Colon',
  pattern: /:/,
  label: "':'",
});
export const Equals = createToken({
  name: 'Equals',
  pattern: /=/,
  label: "'='",
});
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(:?[^\\"\n\r]|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
});
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
});
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});
export const LineBreak = createToken({
  name: 'LineBreak',
  pattern: /\n|\r\n/,
  line_breaks: true,
  label: 'LineBreak',
});

const naTokens = [Comment, DocComment, LineComment, LineBreak, WhiteSpace];

export const multiModeTokens: IMultiModeLexerDefinition = {
  modes: {
    global: [...naTokens, Datasource, Generator, Model, View, Enum, Type],
    block: [
      ...naTokens,
      Attribute,
      BlockAttribute,
      FieldAttribute,
      Dot,
      QuestionMark,
      LCurly,
      RCurly,
      LSquare,
      RSquare,
      LRound,
      RRound,
      Comma,
      Colon,
      Equals,
      True,
      False,
      Null,
      StringLiteral,
      NumberLiteral,
      Identifier,
    ],
  },
  defaultMode: 'global',
};

export const PrismaLexer = new Lexer(multiModeTokens);
