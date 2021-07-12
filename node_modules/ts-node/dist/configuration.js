"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfig = void 0;
const path_1 = require("path");
const index_1 = require("./index");
const tsconfigs_1 = require("./tsconfigs");
const util_1 = require("./util");
/**
 * TypeScript compiler option values required by `ts-node` which cannot be overridden.
 */
const TS_NODE_COMPILER_OPTIONS = {
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    declaration: false,
    noEmit: false,
    outDir: '.ts-node',
};
/*
 * Do post-processing on config options to support `ts-node`.
 */
function fixConfig(ts, config) {
    // Delete options that *should not* be passed through.
    delete config.options.out;
    delete config.options.outFile;
    delete config.options.composite;
    delete config.options.declarationDir;
    delete config.options.declarationMap;
    delete config.options.emitDeclarationOnly;
    // Target ES5 output by default (instead of ES3).
    if (config.options.target === undefined) {
        config.options.target = ts.ScriptTarget.ES5;
    }
    // Target CommonJS modules by default (instead of magically switching to ES6 when the target is ES6).
    if (config.options.module === undefined) {
        config.options.module = ts.ModuleKind.CommonJS;
    }
    return config;
}
/**
 * Load TypeScript configuration. Returns the parsed TypeScript config and
 * any `ts-node` options specified in the config file.
 *
 * Even when a tsconfig.json is not loaded, this function still handles merging
 * compilerOptions from various sources: API, environment variables, etc.
 *
 * @internal
 */
function readConfig(cwd, ts, rawApiOptions) {
    var _a, _b, _c;
    let config = { compilerOptions: {} };
    let basePath = cwd;
    let configFilePath = undefined;
    const projectSearchDir = path_1.resolve(cwd, (_a = rawApiOptions.projectSearchDir) !== null && _a !== void 0 ? _a : cwd);
    const { fileExists = ts.sys.fileExists, readFile = ts.sys.readFile, skipProject = index_1.DEFAULTS.skipProject, project = index_1.DEFAULTS.project, } = rawApiOptions;
    // Read project configuration when available.
    if (!skipProject) {
        configFilePath = project
            ? path_1.resolve(cwd, project)
            : ts.findConfigFile(projectSearchDir, fileExists);
        if (configFilePath) {
            const result = ts.readConfigFile(configFilePath, readFile);
            // Return diagnostics.
            if (result.error) {
                return {
                    configFilePath,
                    config: { errors: [result.error], fileNames: [], options: {} },
                    tsNodeOptionsFromTsconfig: {},
                };
            }
            config = result.config;
            basePath = path_1.dirname(configFilePath);
        }
    }
    // Fix ts-node options that come from tsconfig.json
    const tsNodeOptionsFromTsconfig = Object.assign({}, filterRecognizedTsConfigTsNodeOptions(config['ts-node']));
    // Remove resolution of "files".
    const files = (_c = (_b = rawApiOptions.files) !== null && _b !== void 0 ? _b : tsNodeOptionsFromTsconfig.files) !== null && _c !== void 0 ? _c : index_1.DEFAULTS.files;
    if (!files) {
        config.files = [];
        config.include = [];
    }
    // Only if a config file is *not* loaded, load an implicit configuration from @tsconfig/bases
    const skipDefaultCompilerOptions = configFilePath != null;
    const defaultCompilerOptionsForNodeVersion = skipDefaultCompilerOptions
        ? undefined
        : Object.assign(Object.assign({}, tsconfigs_1.getDefaultTsconfigJsonForNodeVersion(ts).compilerOptions), { types: ['node'] });
    // Merge compilerOptions from all sources
    config.compilerOptions = Object.assign({}, 
    // automatically-applied options from @tsconfig/bases
    defaultCompilerOptionsForNodeVersion, 
    // tsconfig.json "compilerOptions"
    config.compilerOptions, 
    // from env var
    index_1.DEFAULTS.compilerOptions, 
    // tsconfig.json "ts-node": "compilerOptions"
    tsNodeOptionsFromTsconfig.compilerOptions, 
    // passed programmatically
    rawApiOptions.compilerOptions, 
    // overrides required by ts-node, cannot be changed
    TS_NODE_COMPILER_OPTIONS);
    const fixedConfig = fixConfig(ts, ts.parseJsonConfigFileContent(config, {
        fileExists,
        readFile,
        readDirectory: ts.sys.readDirectory,
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    }, basePath, undefined, configFilePath));
    if (tsNodeOptionsFromTsconfig.require) {
        // Modules are found relative to the tsconfig file, not the `dir` option
        const tsconfigRelativeRequire = util_1.createRequire(configFilePath);
        tsNodeOptionsFromTsconfig.require = tsNodeOptionsFromTsconfig.require.map((path) => {
            return tsconfigRelativeRequire.resolve(path);
        });
    }
    return { configFilePath, config: fixedConfig, tsNodeOptionsFromTsconfig };
}
exports.readConfig = readConfig;
/**
 * Given the raw "ts-node" sub-object from a tsconfig, return an object with only the properties
 * recognized by "ts-node"
 */
function filterRecognizedTsConfigTsNodeOptions(jsonObject) {
    if (jsonObject == null)
        return jsonObject;
    const { compiler, compilerHost, compilerOptions, emit, files, ignore, ignoreDiagnostics, logError, preferTsExts, pretty, require, skipIgnore, transpileOnly, typeCheck, transpiler, } = jsonObject;
    const filteredTsConfigOptions = {
        compiler,
        compilerHost,
        compilerOptions,
        emit,
        files,
        ignore,
        ignoreDiagnostics,
        logError,
        preferTsExts,
        pretty,
        require,
        skipIgnore,
        transpileOnly,
        typeCheck,
        transpiler,
    };
    // Use the typechecker to make sure this implementation has the correct set of properties
    const catchExtraneousProps = null;
    const catchMissingProps = null;
    return filteredTsConfigOptions;
}
//# sourceMappingURL=configuration.js.map