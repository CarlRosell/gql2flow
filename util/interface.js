'use strict';
require('./polyfill');

const generateTypeName = (name, options) => `${name}${options.postFix}`;
const typeNameDeclaration = '__typename: string;\n';
const generateEnumName = (name, options) => `${name}Enum${options.postFix}`;

const generateRootDataName = (schema, options) => {
  let rootNamespaces = [];

  if (schema.queryType) {
    rootNamespaces.push(generateTypeName(schema.queryType.name, options));
  }

  if (schema.mutationType) {
    rootNamespaces.push(generateTypeName(schema.mutationType.name, options));
  }

  return rootNamespaces.join(' | ');
};

const maybeDescription = description => !description ? '' : `
/*
  description: ${description}
*/
`;

const generateRootTypes = (schema, options) => `
${options.exportString} type GraphQLResponseRoot${options.postFix} = {
  data?: ${generateRootDataName(schema, options)};
  errors?: Array<GraphQLResponseError${options.postFix}>;
}

${options.exportString} type GraphQLResponseError${options.postFix} = {
  message: string;
  locations?: Array<GraphQLResponseErrorLocation${options.postFix}>;
  [propName: string]: any;
}

${options.exportString} type GraphQLResponseErrorLocation${options.postFix} = {
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
${options.exportString} type ${generateEnumName(name, options)} = ${enumValues.join(' | ')};
`;

/**
  * TODO
  * - add support for custom types (via optional json file or something)
  * - allow this to return metadata for Non Null types
  */
const resolveInterfaceName = (type, options) => {
  switch (type.kind) {
    case 'LIST':
      return `Array<${resolveInterfaceName(type.ofType, options)}>`;
    case 'NON_NULL':
      return `${resolveInterfaceName(type.ofType, options)}`;
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
      return generateTypeName(type.name, options);
    case 'ENUM':
      return generateEnumName(type.name, options);
    default:
      return generateTypeName(type.name, options);
  }
};

const fieldToDefinition = (field, isInput, options) => {
  let interfaceName = resolveInterfaceName(field.type, options);
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
    return generateEnumDeclaration(type.description, type.name, type.enumValues.map(v => `"${v.name}${options.postFix}"`), options);
  }

  let isInput = type.kind === 'INPUT_OBJECT';
  let f = isInput ? type.inputFields : type.fields || [];

  let fields = f
    .filter(field => filterField(field, options))
    .map(field => fieldToDefinition(field, isInput, options))
    .filter(field => field)
    .sort()
    .join('\n');

  let interfaceDeclaration = generateTypeName(type.name, options);
  let additionalInfo = '';

  if (type.kind === 'INTERFACE' || type.kind === 'UNION') {
    let possibleTypes = type.possibleTypes
      .filter(type => !options.ignoredTypes.includes(type.name))
      .map(type => generateTypeName(type.name, options));

    if (possibleTypes.length) {
      return generateTypeDeclaration(type.description, generateTypeName(type.name, options), possibleTypes.join('|'), options);
    }
  }
  return generateInterfaceDeclaration(type.description, interfaceDeclaration, fields, additionalInfo, isInput, options);
};

const typesToInterfaces = (schema, options) => {
  options.exportString = options.export ? 'export ' : '';
  options.postFix = options.postFix || '';

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

  return interfaces.concat(typeInterfaces).join('\n\n'); // add newlines between interfaces
};

const schemaToInterfaces = (schema, options) => typesToInterfaces(schema.data.__schema, options);

module.exports = {schemaToInterfaces};
