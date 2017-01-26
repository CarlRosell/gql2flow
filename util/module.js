// file I/O helpers
'use strict';
const fileIO = require('./fileIO');

const generateModule = (moduleName, interfaces) => `// @flow
// graphql flow definitions
${interfaces}
`;

const writeModuleToFile = (outputFile, module) =>
  fileIO.writeToFile(outputFile, module);

module.exports = { writeModuleToFile, generateModule };
