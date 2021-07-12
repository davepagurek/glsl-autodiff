"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSlashes = exports.parse = exports.split = exports.assign = exports.yn = exports.createRequire = void 0;
const module_1 = require("module");
const ynModule = require("yn");
/** @internal */
exports.createRequire = (_a = module_1.createRequire !== null && module_1.createRequire !== void 0 ? module_1.createRequire : module_1.createRequireFromPath) !== null && _a !== void 0 ? _a : require('create-require');
/**
 * Wrapper around yn module that returns `undefined` instead of `null`.
 * This is implemented by yn v4, but we're staying on v3 to avoid v4's node 10 requirement.
 * @internal
 */
function yn(value) {
    var _a;
    return (_a = ynModule(value)) !== null && _a !== void 0 ? _a : undefined;
}
exports.yn = yn;
/**
 * Like `Object.assign`, but ignores `undefined` properties.
 *
 * @internal
 */
function assign(initialValue, ...sources) {
    for (const source of sources) {
        for (const key of Object.keys(source)) {
            const value = source[key];
            if (value !== undefined)
                initialValue[key] = value;
        }
    }
    return initialValue;
}
exports.assign = assign;
/**
 * Split a string array of values.
 * @internal
 */
function split(value) {
    return typeof value === 'string' ? value.split(/ *, */g) : undefined;
}
exports.split = split;
/**
 * Parse a string as JSON.
 * @internal
 */
function parse(value) {
    return typeof value === 'string' ? JSON.parse(value) : undefined;
}
exports.parse = parse;
/**
 * Replace backslashes with forward slashes.
 * @internal
 */
function normalizeSlashes(value) {
    return value.replace(/\\/g, '/');
}
exports.normalizeSlashes = normalizeSlashes;
//# sourceMappingURL=util.js.map