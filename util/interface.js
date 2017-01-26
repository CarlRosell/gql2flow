'use strict';
require('./polyfill');

const generateTypeName = name => `${name}`;
const typeNameDeclaration = '__typename: string;\n';
const generateEnumName = name => `${name}Enum`;

const generateRootDataName = schema => {
  let rootNamespaces = [];

  if (schema.queryType) {
    rootNamespaces.push(generateTypeName(schema.queryType.name));
  }

  if (schema.mutationType) {
    rootNamespaces.push(generateTypeName(schema.mutationType.name));
  }

  return rootNamespaces.join(' | ');
};

const maybeDescription = description => !description ? '' : `
/*
  description: ${description}
*/
`;

const generateRootTypes = (schema, options) => `
${options.exportString} type GraphQLResponseRoot = {
  data?: ${generateRootDataName(schema)};
  errors?: Array<GraphQLResponseError>;
}

${options.exportString} type GraphQLResponseError = {
  message: string;
  locations?: Array<GraphQLResponseErrorLocation>;
  [propName: string]: any;
}

${options.exportString} type GraphQLResponseErrorLocation = {
  line: number;
  column: number;
}
`;

const generateTypeDeclaration = (description, name, possibleTypes, options) => `
${maybeDescription(description)}
${options.exportString} type ${name} = ${possibleTypes};
`;

const generateInterfaceDeclaration = (description, declaration, fields, additionalInfo, isInput, options) => `
${!additionalInfo ? '' : additionalInfo}${maybeDescription(description)}
${options.exportString} type ${declaration} = {
  ${isInput ? '' : typeNameDeclaration}${fields}
}
`;

const generateEnumDeclaration = (description, name, enumValues, options) => `
${maybeDescription(description)}
${options.exportString} type ${generateEnumName(name)} = ${enumValues.join(' | ')};
`;

/**
  * TODO
  * - add support for custom types (via optional json file or something)
  * - allow this to return metadata for Non Null types
  */
const resolveInterfaceName = type => {
  switch (type.kind) {
    case 'LIST':
      return `Array<${resolveInterfaceName(type.ofType)}>`;
    case 'NON_NULL':
      return `${resolveInterfaceName(type.ofType)}`;
    case 'SCALAR':
      switch (type.name) {
        case 'ID':
        case 'String':
          return 'string';
        case 'Boolean':
          return 'boolean';
        case 'Float':
        case 'Int':
          return 'number';
        default:
          return 'any';
      }
    case 'INTERFACE':
      return generateTypeName(type.name);
    case 'ENUM':
      return generateEnumName(type.name);
    default:
      return generateTypeName(type.name);
  }
};

const fieldToDefinition = (field, isInput) => {
  let interfaceName = resolveInterfaceName(field.type);
  let fieldDef;
  let isNotNull = field.type.kind === 'NON_NULL';
  if (!isNotNull) {
    fieldDef = `${field.name}?: ${interfaceName}`;
  } else {
    fieldDef = `${field.name}: ${interfaceName}`;
  }

  return `${fieldDef};`;
};

const findRootType = type => {
  if (!type.ofType) {
    return type;
  }

  return findRootType(type.ofType);
};

const filterField = (field, options) => {
  let nestedType = findRootType(field.type);
  return !options.ignoredTypes.includes(nestedType.name);
};

const typeToInterface = (type, options) => {
  if (type.kind === 'SCALAR') {
    return null;
  }

  if (type.kind === 'ENUM') {
    return generateEnumDeclaration(type.description, type.name, type.enumValues.map(v => `"${v.name}"`), options);
  }

  let isInput = type.kind === 'INPUT_OBJECT';
  let f = isInput ? type.inputFields : type.fields || [];

  let fields = f
    .filter(field => filterField(field, options))
    .map(field => fieldToDefinition(field, isInput))
    .filter(field => field)
    .sort()
    .join('\n');

  let interfaceDeclaration = generateTypeName(type.name);
  let additionalInfo = '';

  if (type.kind === 'INTERFACE' || type.kind === 'UNION') {
    let possibleTypes = type.possibleTypes
      .filter(type => !options.ignoredTypes.includes(type.name))
      .map(type => generateTypeName(type.name));

    if (possibleTypes.length) {
      return generateTypeDeclaration(type.description, generateTypeName(type.name), possibleTypes.join('|'), options);
    }
  }
  return generateInterfaceDeclaration(type.description, interfaceDeclaration, fields, additionalInfo, isInput, options);
};

const typesToInterfaces = (schema, options) => {
  options.exportString = options.export ? 'export ' : '';
  let interfaces = [];
  interfaces.push(generateRootTypes(schema, options));
  // add root entry point & errors
  let typeInterfaces = schema.types
    .filter(type => !type.name.startsWith('__'))
    .filter(
      type => // remove ignored types
      !options.ignoredTypes.includes(type.name)
    )
    .map(
      type => // convert to interface
      typeToInterface(type, options)
    )
    .filter(type => type);

  // remove empty ones
  return interfaces.concat(typeInterfaces).join('\n\n'); // add newlines between interfaces
};

const schemaToInterfaces = (schema, options) => typesToInterfaces(schema.data.__schema, options);

module.exports = {schemaToInterfaces};
