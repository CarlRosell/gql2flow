#!/usr/bin/env node
'use strict';
const program = require('commander');
const prettier = require('prettier');

// file I/O helpers
const fileIO = require('./util/fileIO');

// Interface Utils
const interfaceUtils = require('./util/interface');

// Module Utils
const moduleUtils = require('./util/module')

program
  .version('1.0.0')
  .usage('[options] <schema.json>')
  .option('-o --output-file [outputFile]', 'name for ouput file, defaults to graphql-export.flow.js', 'graphql-export.flow.js')
  .option('-m --module-name [moduleName]', 'name for the export module, defaults to "GQL"', 'GQL')
  .option('-i --ignored-types <ignoredTypes>', 'names of types to ignore (comma delimited)', v => v.split(','), [])
  .option('-e --export', 'export types')
  .option('-p --post-fix [postFix]', 'add post fix to all of the types, defaults to ""', '')
  .action((fileName, options) => {
    const schema = fileIO.readFile(fileName);

    const interfaces = interfaceUtils.schemaToInterfaces(schema, options);

    const module = moduleUtils.generateModule(options.moduleName, interfaces);

    moduleUtils.writeModuleToFile(options.outputFile, prettier.format(module, { singleQuote: true }));
  })
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
