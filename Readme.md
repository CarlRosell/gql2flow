# GraphQL To Flow Types

_A fork of [gql2ts](https://github.com/avantcredit/gql2ts)_

```console
yarn global add gql2flow (recommended)
npm i -g gql2flow (legacy)
```

```
Usage: gql2flow [options] <schema.json>

Options:

  -h, --help                         output usage information
  -V, --version                      output the version number
  -o --output-file [outputFile]      name for ouput file, defaults to graphql-export.flow.js
  -m --module-name [moduleName]      name for the export module, defaults to "GQL"
  -i --ignored-types <ignoredTypes>  names of types to ignore (comma delimited)
  -e --export                        export types
```

## Examples

### With Default Options

```console
gql2flow schema.json
```

### With Optional Options

```console
gql2flow -i BadInterface,BadType,BadUnion -o schema.flow.js schema.json
```
