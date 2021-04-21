// https://github.com/prisma/prisma/issues/2199#issuecomment-620787251

/*
Schema = blocks:BlockList* _ {
  return {
    type:"schema",
    blocks: blocks
  }
}

BlockList = _ block:Block {
  return block
}

Block = Model / Datasource / Generator / Enum / TypeAlias

TypeAlias = "type" sp name:Identifier _ "=" _ datatype:DataType attributes:AttributeList* {
  return {
    type: "type_alias",
    name: name,
    datatype: datatype,
    attributes: attributes
  }
}

Model = "model" sp name:Identifier sp "{" _ properties:PropertyList* _ "}" {
  return {
    type: "model",
    name: name,
    properties: properties
  }
}

PropertyList = _ property:Property {
  return property
}

Property = GroupedModelAttribute / ModelAttribute / Field

Datasource = "datasource" sp name:Identifier sp "{" _ assignments:DatasourceList* _ "}" {
  return {
    type: "datasource",
    name: name,
    assignments: assignments
  }
}

Generator = "generator" sp name:Identifier sp "{" _ assignments:GeneratorList* _ "}" {
  return {
    type: "generator",
    name: name,
    assignments: assignments
  }
}

Enum = "enum" sp name:Identifier sp "{" _ enumerators:EnumeratorList* _ "}"{
  return {
    type: "enum",
    name: name,
    enumerators: enumerators,
    attributes: []
  }
}

GroupedModelAttribute = "@@" group:Identifier "." name:Identifier args:AttributeArguments? {
  return {
    type: "attribute",
    group: group,
    name: name,
    arguments: args || []
  }
}

ModelAttribute = "@@" name:Identifier args:AttributeArguments? {
  return {
    type: "attribute",
    name: name,
    arguments: args || []
  }
}

DatasourceList = AssignmentList
GeneratorList = AssignmentList

EnumeratorList = name:Identifier value:EnumValue? sp {
  return {
    type: "enumerator",
    name: name,
    value: value
  }
}

EnumValue = _ "=" _ value:Value {
  return value
}

Enumerator = name:Identifier

AssignmentList = _ assignment:Assignment {
  return assignment
}

Assignment = key:Identifier _ "=" _ value:Value {
  return {
    type: "assignment",
    key: key,
    value: value
  }
}

Field = name:Identifier sp datatype:DataType attributes:AttributeList* {
  return {
    type: "field",
    name: name,
    datatype: datatype,
    attributes: attributes
  }
}

Identifier = head:[A-Za-z] tail:[_A-Za-z0-9]* {
  return [head].concat(tail).join('')
}

DataType = GroupType / OptionalType / ListType / NamedType / ReferenceType

GroupType = group:Identifier "." name:Identifier {
  return {
    type: "group_type",
    group: group,
    name: name,
  }
}

OptionalType = inner:(ListType / NamedType / ReferenceType) "?" {
  return {
    type: "optional_type",
    inner: inner
  }
}

ListType = inner:(NamedType / ReferenceType) "[]" {
  return {
    type: "list_type",
    inner: inner
  }
}

NamedType = name:("String" / "Float" / "Int" / "DateTime" / "Boolean") {
  return {
    type: "named_type",
    name: name
  }
}

ReferenceType = name:Identifier {
  return {
    type:"reference_type",
    name: name
  }
}

AttributeList = sp attr:(GroupedAttribute / Attribute) {
  return attr
}

GroupedAttribute = "@" group:Identifier "." name:Identifier args:AttributeArguments? {
  return {
    type:"attribute",
    group: group,
    name: name,
    arguments: args || []
  }
}

Attribute = "@" name:Identifier args:AttributeArguments? {
  return {
    type:"attribute",
    name: name,
    arguments: args || []
  }
}

AttributeArguments = "(" args:AttributeArgumentList* ")" {
  return args
}

AttributeArgumentList = _ argument:AttributeArgument _ ","? _ {
  return argument
}

AttributeArgument = KeyedArgument / UnkeyedArgument

KeyedArgument = name:Identifier _ ":" _ value:Value {
  return {
    type: "keyed_argument",
    name: name,
    value: value
  }
}

UnkeyedArgument = value:Value {
  return {
    type: "unkeyed_argument",
    value: value,
  }
}

Value = ListValue / StringValue / FloatValue / IntValue / BooleanValue / DateTimeValue / FunctionValue / ReferenceValue

ValueList = _ value:Value _ ","? _ {
  return value
}

ListValue = "[" values:ValueList* "]" {
  return {
    type:"list_value",
    values: values
  }
}

StringValue = value:string {
  return {
    type: "string_value",
    value: value
  }
}

IntValue = literal:[0-9]+ {
  return {
    type: "int_value",
    value: parseInt(literal.join(""), 10)
  }
}

FloatValue = literal:[0-9]+ "." decimal:[0-9]+ {
  return {
    type: "float_value",
    value: parseFloat(literal.join("") + "."+decimal.join(""), 10)
  }
}

BooleanValue = boolean:("true" / "false") {
  return {
    type:"boolean_type",
    value: boolean === "true" ? true : false
  }
}

// TODO: FINISH ME
DateTimeValue = "1/1/19" {
  return {
    type: "datetime_value",
    value: new Date()
  }
}

FunctionValue = name:Identifier "(" parameters:FunctionParamList* ")" {
  return {
    type: "function_value",
    name: name,
    parameters: parameters
  }
}

ReferenceValue = name:Identifier {
  return {
    type: "reference_value",
    name: name
  }
}

FunctionParamList = _ Value _ "," _

sp = [ \t\n\r]+

_ "whitespace"
  = [ \t\n\r]*

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

quotation_mark
  = '"'

unescaped
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i
*/
