import { CstParser } from 'chevrotain';
import getConfig, { PrismaAstParserConfig } from './getConfig';
import * as lexer from './lexer';

type ComponentType =
  | 'datasource'
  | 'generator'
  | 'model'
  | 'view'
  | 'enum'
  | 'type';
export class PrismaParser extends CstParser {
  readonly config: PrismaAstParserConfig;

  constructor(config: PrismaAstParserConfig) {
    super(lexer.multiModeTokens, config);
    this.performSelfAnalysis();
    this.config = config;
  }

  private break = this.RULE('break', () => {
    this.CONSUME1(lexer.LineBreak);
    this.CONSUME2(lexer.LineBreak);
  });

  private keyedArg = this.RULE('keyedArg', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'keyName' });
    this.CONSUME(lexer.Colon);
    this.SUBRULE(this.value);
  });

  private array = this.RULE('array', () => {
    this.CONSUME(lexer.LSquare);
    this.MANY_SEP({
      SEP: lexer.Comma,
      DEF: () => {
        this.SUBRULE(this.value);
      },
    });
    this.CONSUME(lexer.RSquare);
  });

  private func = this.RULE('func', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'funcName' });
    this.CONSUME(lexer.LRound);
    this.MANY_SEP({
      SEP: lexer.Comma,
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.keyedArg) },
          { ALT: () => this.SUBRULE(this.value) },
        ]);
      },
    });
    this.CONSUME(lexer.RRound);
  });

  private value = this.RULE('value', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.StringLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(lexer.NumberLiteral, { LABEL: 'value' }) },
      { ALT: () => this.SUBRULE(this.array, { LABEL: 'value' }) },
      { ALT: () => this.SUBRULE(this.func, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(lexer.True, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(lexer.False, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(lexer.Null, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(lexer.Identifier, { LABEL: 'value' }) },
    ]);
  });

  private property = this.RULE('property', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'propertyName' });
    this.CONSUME(lexer.Equals);
    this.SUBRULE(this.value, { LABEL: 'propertyValue' });
  });

  private assignment = this.RULE('assignment', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'assignmentName' });
    this.CONSUME(lexer.Equals);
    this.SUBRULE(this.value, { LABEL: 'assignmentValue' });
  });

  private field = this.RULE('field', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'fieldName' });
    this.SUBRULE(this.value, { LABEL: 'fieldType' });
    this.OPTION1(() => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(lexer.LSquare, { LABEL: 'array' });
            this.CONSUME(lexer.RSquare, { LABEL: 'array' });
          },
        },
        { ALT: () => this.CONSUME(lexer.QuestionMark, { LABEL: 'optional' }) },
      ]);
    });
    this.MANY(() => {
      this.SUBRULE(this.fieldAttribute, { LABEL: 'attributeList' });
    });
    this.OPTION2(() => {
      this.CONSUME(lexer.Comment, { LABEL: 'comment' });
    });
  });

  private block = this.RULE(
    'block',
    (
      options: {
        componentType?: ComponentType;
      } = {}
    ) => {
      const { componentType } = options;
      const isEnum = componentType === 'enum';
      const isObject =
        componentType === 'model' ||
        componentType === 'view' ||
        componentType === 'type';

      this.CONSUME(lexer.LCurly);
      this.CONSUME1(lexer.LineBreak);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.comment, { LABEL: 'list' }) },
          {
            GATE: () => isObject,
            ALT: () => this.SUBRULE(this.property, { LABEL: 'list' }),
          },
          { ALT: () => this.SUBRULE(this.blockAttribute, { LABEL: 'list' }) },
          {
            GATE: () => isObject,
            ALT: () => this.SUBRULE(this.field, { LABEL: 'list' }),
          },
          {
            GATE: () => isEnum,
            ALT: () => this.SUBRULE(this.enum, { LABEL: 'list' }),
          },
          {
            GATE: () => !isObject,
            ALT: () => this.SUBRULE(this.assignment, { LABEL: 'list' }),
          },
          { ALT: () => this.SUBRULE(this.break, { LABEL: 'list' }) },
          { ALT: () => this.CONSUME2(lexer.LineBreak) },
        ]);
      });
      this.CONSUME(lexer.RCurly);
    }
  );

  private enum = this.RULE('enum', () => {
    this.CONSUME(lexer.Identifier, { LABEL: 'enumName' });
    this.MANY(() => {
      this.SUBRULE(this.fieldAttribute, { LABEL: 'attributeList' });
    });
    this.OPTION(() => {
      this.CONSUME(lexer.Comment, { LABEL: 'comment' });
    });
  });

  private fieldAttribute = this.RULE('fieldAttribute', () => {
    this.CONSUME(lexer.FieldAttribute, { LABEL: 'fieldAttribute' });
    this.OR([
      {
        ALT: () => {
          this.CONSUME1(lexer.Identifier, { LABEL: 'groupName' });
          this.CONSUME(lexer.Dot);
          this.CONSUME2(lexer.Identifier, { LABEL: 'attributeName' });
        },
      },
      {
        ALT: () => this.CONSUME(lexer.Identifier, { LABEL: 'attributeName' }),
      },
    ]);

    this.OPTION(() => {
      this.CONSUME(lexer.LRound);
      this.MANY_SEP({
        SEP: lexer.Comma,
        DEF: () => {
          this.SUBRULE(this.attributeArg);
        },
      });
      this.CONSUME(lexer.RRound);
    });
  });

  private blockAttribute = this.RULE('blockAttribute', () => {
    this.CONSUME(lexer.BlockAttribute, { LABEL: 'blockAttribute' }),
      this.OR([
        {
          ALT: () => {
            this.CONSUME1(lexer.Identifier, { LABEL: 'groupName' });
            this.CONSUME(lexer.Dot);
            this.CONSUME2(lexer.Identifier, { LABEL: 'attributeName' });
          },
        },
        {
          ALT: () => this.CONSUME(lexer.Identifier, { LABEL: 'attributeName' }),
        },
      ]);

    this.OPTION(() => {
      this.CONSUME(lexer.LRound);
      this.MANY_SEP({
        SEP: lexer.Comma,
        DEF: () => {
          this.SUBRULE(this.attributeArg);
        },
      });
      this.CONSUME(lexer.RRound);
    });
  });

  private attributeArg = this.RULE('attributeArg', () => {
    this.OR([
      {
        ALT: () => this.SUBRULE(this.keyedArg, { LABEL: 'value' }),
      },
      {
        ALT: () => this.SUBRULE(this.value, { LABEL: 'value' }),
      },
    ]);
  });

  private component = this.RULE('component', () => {
    const type = this.OR1([
      { ALT: () => this.CONSUME(lexer.Datasource, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME(lexer.Generator, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME(lexer.Model, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME(lexer.View, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME(lexer.Enum, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME(lexer.Type, { LABEL: 'type' }) },
    ]);
    this.OR2([
      {
        ALT: () => {
          this.CONSUME1(lexer.Identifier, { LABEL: 'groupName' });
          this.CONSUME(lexer.Dot);
          this.CONSUME2(lexer.Identifier, { LABEL: 'componentName' });
        },
      },
      {
        ALT: () => this.CONSUME(lexer.Identifier, { LABEL: 'componentName' }),
      },
    ]);

    this.SUBRULE(this.block, {
      ARGS: [{ componentType: type.image as ComponentType }],
    });
  });

  private comment = this.RULE('comment', () => {
    this.CONSUME(lexer.Comment, { LABEL: 'text' });
  });

  public schema = this.RULE('schema', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.comment, { LABEL: 'list' }) },
        { ALT: () => this.SUBRULE(this.component, { LABEL: 'list' }) },
        { ALT: () => this.SUBRULE(this.break, { LABEL: 'list' }) },
        { ALT: () => this.CONSUME(lexer.LineBreak) },
      ]);
    });
  });
}

export const defaultParser = new PrismaParser(getConfig().parser);
