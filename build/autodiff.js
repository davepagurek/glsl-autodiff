/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./arithmetic.ts":
/*!***********************!*\
  !*** ./arithmetic.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithArithmetic = exports.Pow = exports.Div = exports.Mult = exports.Sum = exports.Neg = void 0;
const base_1 = __webpack_require__(/*! ./base */ "./base.ts");
class Neg extends base_1.Op {
    definition() {
        return `-${this.dependsOn[0].ref()}`;
    }
    derivative(param) {
        return '-' + this.dependsOn[0].derivRef(param);
    }
}
exports.Neg = Neg;
class Sum extends base_1.Op {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('+');
    }
    derivative(param) {
        return this.dependsOn.map((op) => op.derivRef(param)).join('+');
    }
}
exports.Sum = Sum;
class Mult extends base_1.Op {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('*');
    }
    derivative(param) {
        const [f, g] = this.dependsOn;
        return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`;
    }
}
exports.Mult = Mult;
class Div extends base_1.Op {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('/');
    }
    derivative(param) {
        const [f, g] = this.dependsOn;
        return `(${f.derivRef(param)}*${g.ref()}-${g.derivRef(param)}*${f.ref()})/(${g.ref()}*${g.ref()})`;
    }
}
exports.Div = Div;
class Pow extends base_1.Op {
    definition() {
        return `pow(${this.dependsOn[0].ref()},${this.dependsOn[1].ref()})`;
    }
    derivative(param) {
        const [a, b] = this.dependsOn;
        if (b.isConst()) {
            return `${b.ref()}*pow(${a.ref()},${b.ref()}-1.0)`;
        }
        else if (a.isConst()) {
            return `pow(${a.ref()},${b.ref()})*log(${a.ref()})*${b.derivRef(param)}`;
        }
        else {
            const t1 = `pow(${a.ref()},${b.ref()})`;
            const t2 = `${b.ref()}*(1.0/${a.ref()}*${a.derivRef(param)})`;
            const t3 = `log(${a.ref()})*${b.derivRef(param)}`;
            return `${t1}*(${t2}+${t3})`;
        }
    }
}
exports.Pow = Pow;
base_1.Op.prototype.neg = function () {
    return new Neg(this.ad, this);
};
base_1.Op.prototype.add = function (...params) {
    if (params.length === 0) {
        throw new Error(`add() called with too few arguments: ${params}`);
    }
    else {
        return new Sum(this.ad, this, ...this.ad.convertVals(params));
    }
};
base_1.Op.prototype.sub = function (val) {
    return this.add(this.ad.convertVal(val).neg());
};
base_1.Op.prototype.mult = function (...params) {
    if (params.length === 0) {
        throw new Error(`mult() called with too few arguments: ${params}`);
    }
    else if (params.length === 1) {
        return new Mult(this.ad, this, this.ad.convertVal(params[0]));
    }
    else {
        return this.mult(params[0]).mult(...params.slice(1));
    }
};
base_1.Op.prototype.div = function (param) {
    return new Div(this.ad, this, this.ad.convertVal(param));
};
base_1.Op.prototype.pow = function (param) {
    return new Pow(this.ad, this, this.ad.convertVal(param));
};
base_1.Op.prototype.sqrt = function () { return this.pow(0.5); };
function WithArithmetic(Base) {
    class AutoDiff extends Base {
        sum(...params) {
            if (params.length === 0) {
                throw new Error(`sum() called with too few arguments: ${params}`);
            }
            else {
                const first = this.convertVal(params[0]);
                if (params.length > 1) {
                    return first.add(...params.slice(1));
                }
                else {
                    return first;
                }
            }
        }
        prod(...params) {
            if (params.length === 0) {
                throw new Error(`prod() called with too few arguments: ${params}`);
            }
            else {
                const first = this.convertVal(params[0]);
                if (params.length > 1) {
                    return first.mult(...params.slice(1));
                }
                else {
                    return first;
                }
            }
        }
        sqrt(param) {
            return this.convertVal(param).sqrt();
        }
    }
    return AutoDiff;
}
exports.WithArithmetic = WithArithmetic;


/***/ }),

/***/ "./base.ts":
/*!*****************!*\
  !*** ./base.ts ***!
  \*****************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Param = exports.Value = exports.OpLiteral = exports.Op = void 0;
class Op {
    constructor(ad, ...params) {
        this.usedIn = [];
        this.ad = ad;
        this.id = ad.getNextID();
        this.dependsOn = params;
        for (const param of params) {
            param.usedIn.push(this);
        }
    }
    scalar() { return true; }
    useTempVar() {
        return this.usedIn.length > 1;
    }
    ref() {
        if (this.useTempVar()) {
            return `_glslad_v${this.id}`;
        }
        else {
            return `(${this.definition()})`;
        }
    }
    derivRef(param) {
        if (this.useTempVar()) {
            return `_glslad_dv${this.id}_d${param.name}`;
        }
        else {
            return `(${this.derivative(param)})`;
        }
    }
    initializer() {
        if (this.useTempVar()) {
            return `float ${this.ref()}=${this.definition()};\n`;
        }
        else {
            return '';
        }
    }
    derivInitializer(param) {
        if (this.useTempVar()) {
            return `float ${this.derivRef(param)}=${this.derivative(param)};\n`;
        }
        else {
            return '';
        }
    }
    isConst() {
        return this.dependsOn.every((op) => op.isConst());
    }
    deepDependencies() {
        const deps = new Set();
        for (const op of this.dependsOn) {
            for (const dep of op.deepDependencies().values()) {
                deps.add(dep);
            }
            deps.add(op);
        }
        return deps;
    }
    output(name) { return this.ad.output(name, this); }
    outputDeriv(name, param) { return this.ad.outputDeriv(name, param, this); }
}
exports.Op = Op;
class OpLiteral extends Op {
    initializer() { return ''; }
    derivInitializer() { return ''; }
    ref() { return this.definition(); }
    derivRef(param) { return this.derivative(param); }
}
exports.OpLiteral = OpLiteral;
class Value extends OpLiteral {
    constructor(ad, val) {
        super(ad);
        this.val = val;
    }
    isConst() { return true; }
    definition() { return `${this.val.toFixed(4)}`; }
    derivative() { return '0.0'; }
}
exports.Value = Value;
class Param extends OpLiteral {
    constructor(ad, name) {
        super(ad);
        this.name = name;
        this.ad.registerParam(this, name);
    }
    isConst() { return false; }
    definition() { return this.name; }
    derivative(param) {
        if (param === this) {
            return '1.0';
        }
        else {
            return '0.0';
        }
    }
}
exports.Param = Param;


/***/ }),

/***/ "./functions.ts":
/*!**********************!*\
  !*** ./functions.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithFunctions = exports.IfElse = exports.Max = exports.Min = exports.Clamp = exports.Mix = exports.Cos = exports.Sin = void 0;
const base_1 = __webpack_require__(/*! ./base */ "./base.ts");
class Sin extends base_1.Op {
    definition() {
        return `sin(${this.dependsOn[0].ref()})`;
    }
    derivative(param) {
        return `cos(${this.dependsOn[0].ref()})*${this.dependsOn[0].derivRef(param)}`;
    }
}
exports.Sin = Sin;
class Cos extends base_1.Op {
    definition() {
        return `cos(${this.dependsOn[0].ref()})`;
    }
    derivative(param) {
        return `-sin(${this.dependsOn[0].ref()})*${this.dependsOn[0].derivRef(param)}`;
    }
}
exports.Cos = Cos;
class Mix extends base_1.Op {
    definition() {
        return `mix(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const [a, b, mix] = this.dependsOn;
        const aDeriv = `(1.0-${a.ref()})*${mix.derivRef(param)}+(-${a.derivRef(param)})*${mix.ref()}`;
        const bDeriv = `${b.ref()}*${mix.derivRef(param)}+${b.derivRef(param)}*${mix.ref()}`;
        return `${aDeriv}+${bDeriv}`;
    }
}
exports.Mix = Mix;
class Clamp extends base_1.Op {
    definition() {
        return `clamp(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const [v, min, max] = this.dependsOn;
        return `${v.ref()}<${min.ref()} ? 0.0 : (${v.ref()}>${max.ref()} ? 0.0 : ${v.derivRef(param)})`;
    }
}
exports.Clamp = Clamp;
class Min extends base_1.Op {
    definition() {
        return `min(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const [a, b] = this.dependsOn;
        return `${a.ref()}<${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`;
    }
}
exports.Min = Min;
class Max extends base_1.Op {
    definition() {
        return `max(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const [a, b] = this.dependsOn;
        return `${a.ref()}>${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`;
    }
}
exports.Max = Max;
class IfElse extends base_1.Op {
    definition() {
        const [condition, thenOp, elseOp] = this.dependsOn;
        return `${condition.ref()}?${thenOp.ref()}:${elseOp.ref()}`;
    }
    derivative(param) {
        const [condition, thenOp, elseOp] = this.dependsOn;
        return `${condition.ref()}?${thenOp.derivRef(param)}:${elseOp.derivRef(param)}`;
    }
}
exports.IfElse = IfElse;
base_1.Op.prototype.sin = function () {
    return new Sin(this.ad, this);
};
base_1.Op.prototype.cos = function () {
    return new Cos(this.ad, this);
};
base_1.Op.prototype.tan = function () {
    return this.sin().div(this.cos());
};
base_1.Op.prototype.mix = function (b, amt) {
    return new Mix(this.ad, this, this.ad.convertVal(b), this.ad.convertVal(amt));
};
base_1.Op.prototype.clamp = function (min, max) {
    return new Clamp(this.ad, this, this.ad.convertVal(min), this.ad.convertVal(max));
};
base_1.Op.prototype.min = function (...params) {
    return params.reduce((acc, next) => new Min(this.ad, acc, this.ad.convertVal(next)), this);
};
base_1.Op.prototype.max = function (...params) {
    return params.reduce((acc, next) => new Max(this.ad, acc, this.ad.convertVal(next)), this);
};
base_1.Op.prototype.ifElse = function (thenOp, elseOp) {
    return new IfElse(this.ad, this, this.ad.convertVal(thenOp), this.ad.convertVal(elseOp));
};
function WithFunctions(Base) {
    class AutoDiff extends Base {
        sin(input) {
            return this.convertVal(input).sin();
        }
        cos(input) {
            return this.convertVal(input).cos();
        }
        tan(input) {
            return this.convertVal(input).tan();
        }
        mix(a, b, amt) {
            return this.convertVal(a).mix(b, amt);
        }
        clamp(val, min, max) {
            return this.convertVal(val).clamp(min, max);
        }
        min(...params) {
            if (params.length === 0) {
                throw new Error(`No arguments passed to min()!`);
            }
            else {
                const first = this.convertVal(params[0]);
                if (params.length > 1) {
                    return first.min(...params.slice(1));
                }
                else {
                    return first;
                }
            }
        }
        max(...params) {
            if (params.length === 0) {
                throw new Error(`No arguments passed to min()!`);
            }
            else {
                const first = this.convertVal(params[0]);
                if (params.length > 1) {
                    return first.max(...params.slice(1));
                }
                else {
                    return first;
                }
            }
        }
        ifElse(ifOp, thenOp, elseOp) {
            return this.convertVal(ifOp).ifElse(thenOp, elseOp);
        }
    }
    return AutoDiff;
}
exports.WithFunctions = WithFunctions;


/***/ }),

/***/ "./index.ts":
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const base_1 = __webpack_require__(/*! ./base */ "./base.ts");
const arithmetic_1 = __webpack_require__(/*! ./arithmetic */ "./arithmetic.ts");
const functions_1 = __webpack_require__(/*! ./functions */ "./functions.ts");
const vecBase_1 = __webpack_require__(/*! ./vecBase */ "./vecBase.ts");
const vecArithmetic_1 = __webpack_require__(/*! ./vecArithmetic */ "./vecArithmetic.ts");
const vecFunctions_1 = __webpack_require__(/*! ./vecFunctions */ "./vecFunctions.ts");
let AutoDiff = class AutoDiff {
    constructor() {
        this.nextID = 0;
        this.params = {};
        this.outputs = {};
        this.derivOutputs = {};
    }
    getNextID() {
        const id = this.nextID;
        this.nextID++;
        return id;
    }
    val(n) { return new base_1.Value(this, n); }
    registerParam(param, name) {
        this.params[name] = param;
    }
    param(name) {
        return new base_1.Param(this, name);
    }
    convertVal(param) {
        if (param instanceof base_1.Op) {
            return param;
        }
        else {
            return this.val(param);
        }
    }
    convertVals(params) {
        return params.map((param) => this.convertVal(param));
    }
    output(name, op) {
        this.outputs[name] = op;
        return this;
    }
    outputDeriv(name, param, op) {
        const paramName = typeof param === 'string' ? param : param.name;
        this.derivOutputs[paramName] = this.derivOutputs[paramName] || {};
        this.derivOutputs[paramName][name] = op;
        return this;
    }
    gen() {
        let code = '';
        const deps = new Set();
        for (const name in this.outputs) {
            for (const dep of this.outputs[name].deepDependencies().values()) {
                deps.add(dep);
            }
            deps.add(this.outputs[name]);
        }
        for (const param in this.derivOutputs) {
            for (const name in this.derivOutputs[param]) {
                for (const dep of this.derivOutputs[param][name].deepDependencies().values()) {
                    deps.add(dep);
                }
                deps.add(this.derivOutputs[param][name]);
            }
        }
        for (const dep of deps.values()) {
            code += dep.initializer();
        }
        for (const name in this.outputs) {
            code += `float ${name}=${this.outputs[name].ref()};\n`;
        }
        for (const param in this.derivOutputs) {
            const paramOp = this.params[param];
            const derivDeps = new Set();
            for (const name in this.derivOutputs[param]) {
                for (const dep of this.derivOutputs[param][name].deepDependencies().values()) {
                    derivDeps.add(dep);
                }
                derivDeps.add(this.derivOutputs[param][name]);
            }
            for (const dep of derivDeps.values()) {
                code += dep.derivInitializer(paramOp);
            }
            for (const name in this.derivOutputs[param]) {
                code += `float ${name}=${this.derivOutputs[param][name].derivRef(paramOp)};\n`;
            }
        }
        return code;
    }
};
AutoDiff = __decorate([
    functions_1.WithFunctions,
    arithmetic_1.WithArithmetic,
    vecBase_1.WithVecBase,
    vecArithmetic_1.WithVecArithmetic,
    vecFunctions_1.WithVecFunctions
], AutoDiff);
const AutoDiffGenerator = {
    gen(cb) {
        const ad = new AutoDiff();
        cb(ad);
        return ad.gen();
    }
};
window.AutoDiff = window.AutoDiff || AutoDiffGenerator;


/***/ }),

/***/ "./vecArithmetic.ts":
/*!**************************!*\
  !*** ./vecArithmetic.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithVecArithmetic = exports.VecMult = exports.VecScale = exports.VecSum = exports.VecNeg = void 0;
const vecBase_1 = __webpack_require__(/*! ./vecBase */ "./vecBase.ts");
class VecNeg extends vecBase_1.WithVecDependencies {
    definition() {
        return `-${this.dependsOn[0].ref()}`;
    }
    derivative(param) {
        return '-' + this.dependsOn[0].derivRef(param);
    }
}
exports.VecNeg = VecNeg;
class VecSum extends vecBase_1.WithVecDependencies {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('+');
    }
    derivative(param) {
        return this.dependsOn.map((op) => op.derivRef(param)).join('+');
    }
}
exports.VecSum = VecSum;
class VecScale extends vecBase_1.WithVecDependencies {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('*');
    }
    derivative(param) {
        return this.dependsOn.map((op) => op.derivRef(param)).join('*');
    }
}
exports.VecScale = VecScale;
class VecMult extends vecBase_1.WithVecDependencies {
    definition() {
        return this.dependsOn.map((op) => op.ref()).join('*');
    }
    derivative(param) {
        const [f, g] = this.dependsOn;
        return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`;
    }
}
exports.VecMult = VecMult;
vecBase_1.VectorOp.prototype.neg = function () {
    return new VecNeg(this.ad, this);
};
vecBase_1.VectorOp.prototype.add = function (...params) {
    return new VecSum(this.ad, ...params);
};
vecBase_1.VectorOp.prototype.scale = function (k) {
    return new VecScale(this.ad, this, this.ad.convertVal(k));
};
vecBase_1.VectorOp.prototype.mult = function (...params) {
    if (params.length === 0) {
        throw new Error(`mult() called with too few arguments: ${params}`);
    }
    else if (params.length === 1) {
        return new VecMult(this.ad, this, params[0]);
    }
    else {
        return this.mult(params[0]).mult(...params.slice(1));
    }
};
function WithVecArithmetic(Base) {
    class AutoDiff extends Base {
        vecSum(...params) {
            if (params.length === 0) {
                throw new Error('No arguments passed to vecSum()!');
            }
            else if (params.length === 1) {
                return params[0];
            }
            else {
                return params[0].add(...params.slice(1));
            }
        }
        vecProd(...params) {
            return params.reduce((acc, next) => acc.mult(next));
        }
    }
    return AutoDiff;
}
exports.WithVecArithmetic = WithVecArithmetic;


/***/ }),

/***/ "./vecBase.ts":
/*!********************!*\
  !*** ./vecBase.ts ***!
  \********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithVecBase = exports.VecParam = exports.Vec = exports.WithVecDependencies = exports.VectorOp = exports.Cache = exports.VecParamElementRef = exports.VecElementRef = void 0;
const base_1 = __webpack_require__(/*! ./base */ "./base.ts");
class VecElementRef extends base_1.Op {
    constructor(ad, prop, vec) {
        super(ad, vec);
        this.prop = prop;
    }
    definition() { return `${this.dependsOn[0].ref()}.${this.prop}`; }
    derivative(param) { return `${this.dependsOn[0].derivRef(param)}.${this.prop}`; }
}
exports.VecElementRef = VecElementRef;
class VecParamElementRef extends base_1.OpLiteral {
    constructor(ad, prop, vec) {
        super(ad, vec);
        this.prop = prop;
        this.name = `_glslad_r${vec.id}_${prop}`;
        this.ad.registerParam(this, this.name);
    }
    definition() { return `${this.dependsOn[0].ref()}.${this.prop}`; }
    derivative(param) {
        if (param === this) {
            return '1.0';
        }
        else {
            return '0.0';
        }
    }
}
exports.VecParamElementRef = VecParamElementRef;
function Cache(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    let created = false;
    let cached = undefined;
    descriptor.value = function (...args) {
        if (!created) {
            cached = originalMethod.apply(this, ...args);
            created = true;
        }
        return cached;
    };
    return descriptor;
}
exports.Cache = Cache;
class VectorOp extends base_1.Op {
    scalar() { return false; }
    x() { return new VecElementRef(this.ad, 'x', this); }
    y() { return new VecElementRef(this.ad, 'y', this); }
    z() { return new VecElementRef(this.ad, 'z', this); }
    w() { return new VecElementRef(this.ad, 'w', this); }
    getVecElementRef(el) {
        if (el === 'x') {
            return this.x();
        }
        else if (el === 'y') {
            return this.y();
        }
        else if (el === 'z') {
            return this.z();
        }
        else if (el === 'w') {
            return this.w();
        }
        else {
            throw new Error(`Can't get element ref ${el}`);
        }
    }
    u() { return this.x(); }
    v() { return this.y(); }
    r() { return this.x(); }
    g() { return this.y(); }
    b() { return this.z(); }
    a() { return this.w(); }
    xyzw() { return new Vec(this.ad, this.x(), this.y(), this.z(), this.w()); }
    xywz() { return new Vec(this.ad, this.x(), this.y(), this.w(), this.z()); }
    xzyw() { return new Vec(this.ad, this.x(), this.z(), this.y(), this.w()); }
    xzwy() { return new Vec(this.ad, this.x(), this.z(), this.w(), this.y()); }
    xwyz() { return new Vec(this.ad, this.x(), this.w(), this.y(), this.z()); }
    xwzy() { return new Vec(this.ad, this.x(), this.w(), this.z(), this.y()); }
    yxzw() { return new Vec(this.ad, this.y(), this.x(), this.z(), this.w()); }
    yxwz() { return new Vec(this.ad, this.y(), this.x(), this.w(), this.z()); }
    yzxw() { return new Vec(this.ad, this.y(), this.z(), this.x(), this.w()); }
    yzwx() { return new Vec(this.ad, this.y(), this.z(), this.w(), this.x()); }
    ywxz() { return new Vec(this.ad, this.y(), this.w(), this.x(), this.z()); }
    ywzx() { return new Vec(this.ad, this.y(), this.w(), this.z(), this.x()); }
    zxyw() { return new Vec(this.ad, this.z(), this.x(), this.y(), this.w()); }
    zxwy() { return new Vec(this.ad, this.z(), this.x(), this.w(), this.y()); }
    zyxw() { return new Vec(this.ad, this.z(), this.y(), this.x(), this.w()); }
    zywx() { return new Vec(this.ad, this.z(), this.y(), this.w(), this.x()); }
    zwxy() { return new Vec(this.ad, this.z(), this.w(), this.x(), this.y()); }
    zwyx() { return new Vec(this.ad, this.z(), this.w(), this.y(), this.x()); }
    wxyz() { return new Vec(this.ad, this.w(), this.x(), this.y(), this.z()); }
    wxzy() { return new Vec(this.ad, this.w(), this.x(), this.z(), this.y()); }
    wyxz() { return new Vec(this.ad, this.w(), this.y(), this.x(), this.z()); }
    wyzx() { return new Vec(this.ad, this.w(), this.y(), this.z(), this.x()); }
    wzxy() { return new Vec(this.ad, this.w(), this.z(), this.x(), this.y()); }
    wzyx() { return new Vec(this.ad, this.w(), this.z(), this.y(), this.x()); }
    xyz() { return new Vec(this.ad, this.x(), this.y(), this.z()); }
    xzy() { return new Vec(this.ad, this.x(), this.z(), this.y()); }
    yxz() { return new Vec(this.ad, this.y(), this.x(), this.z()); }
    yzx() { return new Vec(this.ad, this.y(), this.z(), this.x()); }
    zxy() { return new Vec(this.ad, this.z(), this.x(), this.y()); }
    zyx() { return new Vec(this.ad, this.z(), this.y(), this.x()); }
    xyw() { return new Vec(this.ad, this.x(), this.y(), this.w()); }
    xwy() { return new Vec(this.ad, this.x(), this.w(), this.y()); }
    yxw() { return new Vec(this.ad, this.y(), this.x(), this.w()); }
    ywx() { return new Vec(this.ad, this.y(), this.w(), this.x()); }
    wxy() { return new Vec(this.ad, this.w(), this.x(), this.y()); }
    wyx() { return new Vec(this.ad, this.w(), this.y(), this.x()); }
    xy() { return new Vec(this.ad, this.x(), this.y()); }
    yx() { return new Vec(this.ad, this.y(), this.x()); }
    xzw() { return new Vec(this.ad, this.x(), this.z(), this.w()); }
    xwz() { return new Vec(this.ad, this.x(), this.w(), this.z()); }
    zxw() { return new Vec(this.ad, this.z(), this.x(), this.w()); }
    zwx() { return new Vec(this.ad, this.z(), this.w(), this.x()); }
    wxz() { return new Vec(this.ad, this.w(), this.x(), this.z()); }
    wzx() { return new Vec(this.ad, this.w(), this.z(), this.x()); }
    xz() { return new Vec(this.ad, this.x(), this.z()); }
    zx() { return new Vec(this.ad, this.z(), this.x()); }
    xw() { return new Vec(this.ad, this.x(), this.w()); }
    wx() { return new Vec(this.ad, this.w(), this.x()); }
    yzw() { return new Vec(this.ad, this.y(), this.z(), this.w()); }
    ywz() { return new Vec(this.ad, this.y(), this.w(), this.z()); }
    zyw() { return new Vec(this.ad, this.z(), this.y(), this.w()); }
    zwy() { return new Vec(this.ad, this.z(), this.w(), this.y()); }
    wyz() { return new Vec(this.ad, this.w(), this.y(), this.z()); }
    wzy() { return new Vec(this.ad, this.w(), this.z(), this.y()); }
    yz() { return new Vec(this.ad, this.y(), this.z()); }
    zy() { return new Vec(this.ad, this.z(), this.y()); }
    yw() { return new Vec(this.ad, this.y(), this.w()); }
    wy() { return new Vec(this.ad, this.w(), this.y()); }
    zw() { return new Vec(this.ad, this.z(), this.w()); }
    wz() { return new Vec(this.ad, this.w(), this.z()); }
    rgba() { return new Vec(this.ad, this.r(), this.g(), this.b(), this.a()); }
    rgab() { return new Vec(this.ad, this.r(), this.g(), this.a(), this.b()); }
    rbga() { return new Vec(this.ad, this.r(), this.b(), this.g(), this.a()); }
    rbag() { return new Vec(this.ad, this.r(), this.b(), this.a(), this.g()); }
    ragb() { return new Vec(this.ad, this.r(), this.a(), this.g(), this.b()); }
    rabg() { return new Vec(this.ad, this.r(), this.a(), this.b(), this.g()); }
    grba() { return new Vec(this.ad, this.g(), this.r(), this.b(), this.a()); }
    grab() { return new Vec(this.ad, this.g(), this.r(), this.a(), this.b()); }
    gbra() { return new Vec(this.ad, this.g(), this.b(), this.r(), this.a()); }
    gbar() { return new Vec(this.ad, this.g(), this.b(), this.a(), this.r()); }
    garb() { return new Vec(this.ad, this.g(), this.a(), this.r(), this.b()); }
    gabr() { return new Vec(this.ad, this.g(), this.a(), this.b(), this.r()); }
    brga() { return new Vec(this.ad, this.b(), this.r(), this.g(), this.a()); }
    brag() { return new Vec(this.ad, this.b(), this.r(), this.a(), this.g()); }
    bgra() { return new Vec(this.ad, this.b(), this.g(), this.r(), this.a()); }
    bgar() { return new Vec(this.ad, this.b(), this.g(), this.a(), this.r()); }
    barg() { return new Vec(this.ad, this.b(), this.a(), this.r(), this.g()); }
    bagr() { return new Vec(this.ad, this.b(), this.a(), this.g(), this.r()); }
    argb() { return new Vec(this.ad, this.a(), this.r(), this.g(), this.b()); }
    arbg() { return new Vec(this.ad, this.a(), this.r(), this.b(), this.g()); }
    agrb() { return new Vec(this.ad, this.a(), this.g(), this.r(), this.b()); }
    agbr() { return new Vec(this.ad, this.a(), this.g(), this.b(), this.r()); }
    abrg() { return new Vec(this.ad, this.a(), this.b(), this.r(), this.g()); }
    abgr() { return new Vec(this.ad, this.a(), this.b(), this.g(), this.r()); }
    rgb() { return new Vec(this.ad, this.r(), this.g(), this.b()); }
    rbg() { return new Vec(this.ad, this.r(), this.b(), this.g()); }
    grb() { return new Vec(this.ad, this.g(), this.r(), this.b()); }
    gbr() { return new Vec(this.ad, this.g(), this.b(), this.r()); }
    brg() { return new Vec(this.ad, this.b(), this.r(), this.g()); }
    bgr() { return new Vec(this.ad, this.b(), this.g(), this.r()); }
    rga() { return new Vec(this.ad, this.r(), this.g(), this.a()); }
    rag() { return new Vec(this.ad, this.r(), this.a(), this.g()); }
    gra() { return new Vec(this.ad, this.g(), this.r(), this.a()); }
    gar() { return new Vec(this.ad, this.g(), this.a(), this.r()); }
    arg() { return new Vec(this.ad, this.a(), this.r(), this.g()); }
    agr() { return new Vec(this.ad, this.a(), this.g(), this.r()); }
    rg() { return new Vec(this.ad, this.r(), this.g()); }
    gr() { return new Vec(this.ad, this.g(), this.r()); }
    rba() { return new Vec(this.ad, this.r(), this.b(), this.a()); }
    rab() { return new Vec(this.ad, this.r(), this.a(), this.b()); }
    bra() { return new Vec(this.ad, this.b(), this.r(), this.a()); }
    bar() { return new Vec(this.ad, this.b(), this.a(), this.r()); }
    arb() { return new Vec(this.ad, this.a(), this.r(), this.b()); }
    abr() { return new Vec(this.ad, this.a(), this.b(), this.r()); }
    rb() { return new Vec(this.ad, this.r(), this.b()); }
    br() { return new Vec(this.ad, this.b(), this.r()); }
    ra() { return new Vec(this.ad, this.r(), this.a()); }
    ar() { return new Vec(this.ad, this.a(), this.r()); }
    gba() { return new Vec(this.ad, this.g(), this.b(), this.a()); }
    gab() { return new Vec(this.ad, this.g(), this.a(), this.b()); }
    bga() { return new Vec(this.ad, this.b(), this.g(), this.a()); }
    bag() { return new Vec(this.ad, this.b(), this.a(), this.g()); }
    agb() { return new Vec(this.ad, this.a(), this.g(), this.b()); }
    abg() { return new Vec(this.ad, this.a(), this.b(), this.g()); }
    gb() { return new Vec(this.ad, this.g(), this.b()); }
    bg() { return new Vec(this.ad, this.b(), this.g()); }
    ga() { return new Vec(this.ad, this.g(), this.a()); }
    ag() { return new Vec(this.ad, this.a(), this.g()); }
    ba() { return new Vec(this.ad, this.b(), this.a()); }
    ab() { return new Vec(this.ad, this.a(), this.b()); }
    uv() { return new Vec(this.ad, this.u(), this.v()); }
    vu() { return new Vec(this.ad, this.v(), this.u()); }
}
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VectorOp.prototype, "x", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VectorOp.prototype, "y", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VectorOp.prototype, "z", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VectorOp.prototype, "w", null);
exports.VectorOp = VectorOp;
class WithVecDependencies extends VectorOp {
    get vecDependsOn() {
        return this.dependsOn;
    }
    size() {
        return Math.min(...this.vecDependsOn.map((v) => v.size()));
    }
}
exports.WithVecDependencies = WithVecDependencies;
class Vec extends VectorOp {
    size() {
        return this.dependsOn.length;
    }
    initializer() {
        if (this.useTempVar()) {
            return `vec${this.size()} ${this.ref()}=${this.definition()};\n`;
        }
        else {
            return '';
        }
    }
    derivInitializer(param) {
        if (this.useTempVar()) {
            return `vec${this.size()} ${this.derivRef(param)}=${this.derivative(param)};\n`;
        }
        else {
            return '';
        }
    }
    definition() {
        return `vec${this.size()}(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        return `vec${this.size()}(${this.dependsOn.map((op) => op.derivRef(param)).join(',')})`;
    }
    x() { return this.dependsOn[0]; }
    y() { return this.dependsOn[1]; }
    z() { return this.dependsOn[2]; }
    w() { return this.dependsOn[3]; }
}
exports.Vec = Vec;
class VecParam extends VectorOp {
    constructor(ad, name, size) {
        super(ad);
        this.name = name;
        this._size = size;
    }
    size() { return this._size; }
    x() { return new VecParamElementRef(this.ad, 'x', this); }
    y() { return new VecParamElementRef(this.ad, 'y', this); }
    z() { return new VecParamElementRef(this.ad, 'z', this); }
    w() { return new VecParamElementRef(this.ad, 'w', this); }
    getElems() {
        return 'xyzw'
            .split('')
            .slice(0, this.size())
            .map((el) => this.getVecElementRef(el));
    }
    definition() { return this.name; }
    derivative(param) {
        return `vec${this.size()}(${this.getElems().map((el) => el.derivRef(param)).join(',')})`;
    }
    initializer() { return ''; }
    ref() { return this.definition(); }
    derivInitializer(param) {
        if (this.useTempVar()) {
            return `vec${this.size()} ${this.derivRef(param)}=${this.derivative(param)};\n`;
        }
        else {
            return '';
        }
    }
}
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VecParam.prototype, "x", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VecParam.prototype, "y", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VecParam.prototype, "z", null);
__decorate([
    Cache,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", base_1.Op)
], VecParam.prototype, "w", null);
exports.VecParam = VecParam;
function WithVecBase(Base) {
    class AutoDiff extends Base {
        vec2Param(name) {
            return new VecParam(this, name, 2);
        }
        vec3Param(name) {
            return new VecParam(this, name, 3);
        }
        vec4Param(name) {
            return new VecParam(this, name, 4);
        }
        vec2(x, y) {
            return new Vec(this, this.convertVal(x), this.convertVal(y));
        }
        vec3(x, y, z) {
            return new Vec(this, ...this.convertVals([x, y, z]));
        }
        vec4(x, y, z, w) {
            return new Vec(this, ...this.convertVals([x, y, z, w]));
        }
    }
    return AutoDiff;
}
exports.WithVecBase = WithVecBase;


/***/ }),

/***/ "./vecFunctions.ts":
/*!*************************!*\
  !*** ./vecFunctions.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithVecFunctions = exports.Dist = exports.Length = exports.Dot = exports.VecIfElse = exports.VecMax = exports.VecMin = exports.VecClamp = exports.VecMix = void 0;
const base_1 = __webpack_require__(/*! ./base */ "./base.ts");
const vecBase_1 = __webpack_require__(/*! ./vecBase */ "./vecBase.ts");
class VecMix extends vecBase_1.WithVecDependencies {
    definition() {
        return `mix(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const [a, b, mix] = this.dependsOn;
        const aDeriv = `(1.0-${a.ref()})*${mix.derivRef(param)}+(-${a.derivRef(param)})*${mix.ref()}`;
        const bDeriv = `${b.ref()}*${mix.derivRef(param)}+${b.derivRef(param)}*${mix.ref()}`;
        return `${aDeriv}+${bDeriv}`;
    }
}
exports.VecMix = VecMix;
class VecClamp extends vecBase_1.WithVecDependencies {
    definition() {
        return `clamp(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const elemClamp = (v, min, max) => `${v.ref()}<${min.ref()} ? 0.0 : (${v.ref()}>${max.ref()} ? 0.0 : ${v.derivRef(param)})`;
        const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el));
        const [vecC, vecMin, vecMax] = this.vecDependsOn.map(toRefs);
        const innerDef = Array(this.size()).fill(0).map((_, i) => elemClamp(vecC[i], vecMin[i], vecMax[i])).join(',');
        return `vec${this.size()}(${innerDef})`;
    }
}
exports.VecClamp = VecClamp;
class VecMin extends vecBase_1.WithVecDependencies {
    definition() {
        return `min(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const elemMin = (a, b) => `${a.ref()}<${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`;
        const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el));
        const [vecA, vecB] = this.vecDependsOn.map(toRefs);
        const innerDef = Array(this.size()).fill(0).map((_, i) => elemMin(vecA[i], vecB[i])).join(',');
        return `vec${this.size()}(${innerDef})`;
    }
}
exports.VecMin = VecMin;
class VecMax extends vecBase_1.WithVecDependencies {
    definition() {
        return `max(${this.dependsOn.map((op) => op.ref()).join(',')})`;
    }
    derivative(param) {
        const elemMax = (a, b) => `${a.ref()}>${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`;
        const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el));
        const [vecA, vecB] = this.vecDependsOn.map(toRefs);
        const innerDef = Array(this.size()).fill(0).map((_, i) => elemMax(vecA[i], vecB[i])).join(',');
        return `vec${this.size()}(${innerDef})`;
    }
}
exports.VecMax = VecMax;
class VecIfElse extends vecBase_1.WithVecDependencies {
    size() {
        return this.vecDependsOn[1].size();
    }
    definition() {
        const [condition, thenOp, elseOp] = this.dependsOn;
        return `${condition.ref()}?${thenOp.ref()}:${elseOp.ref()}`;
    }
    derivative(param) {
        const [condition, thenOp, elseOp] = this.dependsOn;
        return `${condition.ref()}?${thenOp.derivRef(param)}:${elseOp.derivRef(param)}`;
    }
}
exports.VecIfElse = VecIfElse;
class Dot extends vecBase_1.WithVecDependencies {
    scalar() { return true; }
    definition() {
        return `dot(${this.dependsOn.map((v) => v.ref()).join(',')})`;
    }
    derivative(param) {
        const [f, g] = this.vecDependsOn;
        return 'xyzw'
            .split('')
            .slice(0, this.size())
            .map((el) => `${f.ref()}.${el}*${g.derivRef(param)}.${el}+${g.ref()}.${el}*${f.derivRef(param)}.${el}`)
            .join('+');
    }
}
exports.Dot = Dot;
class Length extends vecBase_1.WithVecDependencies {
    scalar() { return true; }
    definition() { return `length(${this.dependsOn[0].ref()})`; }
    derivative(param) {
        const outerDeriv = `0.5/length(${this.dependsOn[0].ref()})`;
        const innerDeriv = 'xyzw'
            .split('')
            .slice(0, this.size())
            .map((el) => `2.0*${this.dependsOn[0].ref()}.${el}*${this.dependsOn[0].derivRef(param)}.${el}`)
            .join('+');
        return `${outerDeriv}*${innerDeriv}`;
    }
}
exports.Length = Length;
class Dist extends vecBase_1.WithVecDependencies {
    scalar() { return true; }
    definition() { return `distance(${this.dependsOn.map((v) => v.ref()).join(',')})`; }
    derivative(param) {
        const outerDeriv = `0.5/distance(${this.dependsOn.map((v) => v.ref()).join(',')})`;
        const innerDeriv = 'xyzw'
            .split('')
            .slice(0, this.size())
            .map((el) => {
            const diff = this.dependsOn.map((v) => v.ref()).join('-');
            const derivDiff = this.dependsOn.map((v) => v.derivRef(param)).join('-');
            return `2.0*(${diff}).${el}*(${derivDiff}).${el}`;
        })
            .join('+');
        return `${outerDeriv}*${innerDeriv}`;
    }
}
exports.Dist = Dist;
vecBase_1.VectorOp.prototype.mix = function (other, amt) {
    return new VecMix(this.ad, this, other, this.ad.convertVal(amt));
};
vecBase_1.VectorOp.prototype.clamp = function (min, max) {
    return new VecClamp(this.ad, this, min, max);
};
vecBase_1.VectorOp.prototype.min = function (...params) {
    return params.reduce((acc, next) => new VecMin(this.ad, acc, next), this);
};
vecBase_1.VectorOp.prototype.max = function (...params) {
    return params.reduce((acc, next) => new VecMax(this.ad, acc, next), this);
};
vecBase_1.VectorOp.prototype.dot = function (other) {
    return new Dot(this.ad, this, other);
};
vecBase_1.VectorOp.prototype.length = function () {
    return new Length(this.ad, this);
};
vecBase_1.VectorOp.prototype.dist = function (other) {
    return new Dist(this.ad, this, other);
};
base_1.Op.prototype.vecIfElse = function (thenOp, elseOp) {
    return new VecIfElse(this.ad, this, thenOp, elseOp);
};
function WithVecFunctions(Base) {
    class AutoDiff extends Base {
        vecMix(a, b, amt) {
            return a.mix(b, amt);
        }
        vecClamp(val, min, max) {
            return val.clamp(min, max);
        }
        vecMin(...params) {
            if (params.length === 0) {
                throw new Error(`No arguments passed to vecMin()!`);
            }
            else {
                return params.reduce((acc, next) => acc.min(next));
            }
        }
        vecMax(...params) {
            if (params.length === 0) {
                throw new Error(`No arguments passed to vecMax()!`);
            }
            else {
                return params.reduce((acc, next) => acc.max(next));
            }
        }
        dot(a, b) {
            return a.dot(b);
        }
        length(val) {
            return val.length();
        }
        dist(a, b) {
            return a.dist(b);
        }
    }
    return AutoDiff;
}
exports.WithVecFunctions = WithVecFunctions;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9hcml0aG1ldGljLnRzIiwid2VicGFjazovLy8uL2Jhc2UudHMiLCJ3ZWJwYWNrOi8vLy4vZnVuY3Rpb25zLnRzIiwid2VicGFjazovLy8uL2luZGV4LnRzIiwid2VicGFjazovLy8uL3ZlY0FyaXRobWV0aWMudHMiLCJ3ZWJwYWNrOi8vLy4vdmVjQmFzZS50cyIsIndlYnBhY2s6Ly8vLi92ZWNGdW5jdGlvbnMudHMiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovLy93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLDhEQUE0RTtBQUU1RSxNQUFhLEdBQUksU0FBUSxTQUFFO0lBQ3pCLFVBQVU7UUFDUixPQUFPLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtJQUN0QyxDQUFDO0lBQ0QsVUFBVSxDQUFDLEtBQVk7UUFDckIsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0lBQ2hELENBQUM7Q0FDRjtBQVBELGtCQU9DO0FBRUQsTUFBYSxHQUFJLFNBQVEsU0FBRTtJQUN6QixVQUFVO1FBQ1IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUN2RCxDQUFDO0lBQ0QsVUFBVSxDQUFDLEtBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDakUsQ0FBQztDQUNGO0FBUEQsa0JBT0M7QUFF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QUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxJQUFJLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDMUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQzFFLElBQUksS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMxRSxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDL0QsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxHQUFHLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUMvRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUM7SUFDcEQsRUFBRSxLQUFLLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNwRCxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ3BELEVBQUUsS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUks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QVcsRUFBRSxDQUFXO1lBQzNCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEIsQ0FBQztLQUNGO0lBQ0QsT0FBTyxRQUFRO0FBQ2pCLENBQUM7QUFqQ0QsNENBaUNDOzs7Ozs7O1VDbk5EO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYXV0b2RpZmYuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbnB1dCwgT3AsIFBhcmFtLCBBdXRvRGlmZiBhcyBBREJhc2UsIEFEQ29uc3RydWN0b3IgfSBmcm9tICcuL2Jhc2UnXG5cbmV4cG9ydCBjbGFzcyBOZWcgZXh0ZW5kcyBPcCB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIGAtJHt0aGlzLmRlcGVuZHNPblswXS5yZWYoKX1gXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICByZXR1cm4gJy0nICsgdGhpcy5kZXBlbmRzT25bMF0uZGVyaXZSZWYocGFyYW0pXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN1bSBleHRlbmRzIE9wIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJysnKVxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLmRlcml2UmVmKHBhcmFtKSkuam9pbignKycpXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE11bHQgZXh0ZW5kcyBPcCB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcqJylcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIGNvbnN0IFtmLCBnXSA9IHRoaXMuZGVwZW5kc09uXG4gICAgcmV0dXJuIGAke2YucmVmKCl9KiR7Zy5kZXJpdlJlZihwYXJhbSl9KyR7Zy5yZWYoKX0qJHtmLmRlcml2UmVmKHBhcmFtKX1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERpdiBleHRlbmRzIE9wIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJy8nKVxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3QgW2YsIGddID0gdGhpcy5kZXBlbmRzT25cbiAgICByZXR1cm4gYCgke2YuZGVyaXZSZWYocGFyYW0pfSoke2cucmVmKCl9LSR7Zy5kZXJpdlJlZihwYXJhbSl9KiR7Zi5yZWYoKX0pLygke2cucmVmKCl9KiR7Zy5yZWYoKX0pYFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQb3cgZXh0ZW5kcyBPcCB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIGBwb3coJHt0aGlzLmRlcGVuZHNPblswXS5yZWYoKX0sJHt0aGlzLmRlcGVuZHNPblsxXS5yZWYoKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3QgW2EsIGJdID0gdGhpcy5kZXBlbmRzT25cbiAgICBpZiAoYi5pc0NvbnN0KCkpIHtcbiAgICAgIHJldHVybiBgJHtiLnJlZigpfSpwb3coJHthLnJlZigpfSwke2IucmVmKCl9LTEuMClgXG4gICAgfSBlbHNlIGlmIChhLmlzQ29uc3QoKSkge1xuICAgICAgcmV0dXJuIGBwb3coJHthLnJlZigpfSwke2IucmVmKCl9KSpsb2coJHthLnJlZigpfSkqJHtiLmRlcml2UmVmKHBhcmFtKX1gXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGYgPSBhXmJcbiAgICAgIC8vIGxuKGYpID0gbG4oYV5iKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG4oKSBib3RoIHNpZGVzXG4gICAgICAvLyBsbihmKSA9IGIqbG4oYSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2FyaXRobSBydWxlc1xuICAgICAgLy8gZV4obG5mKSA9IGVeKGIqbG4oYSkpICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHAoKSBib3RoIHNpZGVzXG4gICAgICAvLyBmID0gZV4oYipsbihhKSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpbXBsaWZ5XG4gICAgICAvLyBkL2R4IGYgPSBkL2R4IGVeKGIqbG4oYSkpICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZlcmVudGlhdGUgYm90aCBzaWRlc1xuICAgICAgLy8gZC9keCBmID0gZV4oYipsbihhKSkgKiBkL2R4IGIqbG4oYSkgICAgICAgICAgICAgICBkZXJpdmF0aXZlIG9mIGVedVxuICAgICAgLy8gZC9keCBmID0gYV5iICogZC9keCBiKmxuKGEpICAgICAgICAgICAgICAgICAgICAgICBleHBvbmVudGlhbCBydWxlc1xuICAgICAgLy8gZC9keCBmID0gYV5iICogKGIqKDEvYSAqIGRhL2R4KSArIGxuKGEpKihkYi9keCkpICBwcm9kdWN0IHJ1bGVcbiAgICAgIC8vICAgICAgICAgIHQxICAgICAgICAgdDIgICAgICAgICAgICAgICAgIHQzXG4gICAgICBjb25zdCB0MSA9IGBwb3coJHthLnJlZigpfSwke2IucmVmKCl9KWBcbiAgICAgIGNvbnN0IHQyID0gYCR7Yi5yZWYoKX0qKDEuMC8ke2EucmVmKCl9KiR7YS5kZXJpdlJlZihwYXJhbSl9KWBcbiAgICAgIGNvbnN0IHQzID0gYGxvZygke2EucmVmKCl9KSoke2IuZGVyaXZSZWYocGFyYW0pfWBcbiAgICAgIHJldHVybiBgJHt0MX0qKCR7dDJ9KyR7dDN9KWBcbiAgICB9XG4gIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vYmFzZScge1xuICBpbnRlcmZhY2UgT3Age1xuICAgIG5lZygpOiBPcFxuICAgIGFkZCguLi5wYXJhbXM6IElucHV0W10pOiBPcFxuICAgIHN1Yih2YWw6IElucHV0KTogT3BcbiAgICBtdWx0KC4uLnBhcmFtczogSW5wdXRbXSk6IE9wXG4gICAgZGl2KHBhcmFtOiBJbnB1dCk6IE9wXG4gICAgcG93KHBhcmFtOiBJbnB1dCk6IE9wXG4gICAgc3FydCgpOiBPcFxuICB9XG59XG5cbk9wLnByb3RvdHlwZS5uZWcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBOZWcodGhpcy5hZCwgdGhpcylcbn1cbk9wLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiguLi5wYXJhbXM6IElucHV0W10pIHtcbiAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGFkZCgpIGNhbGxlZCB3aXRoIHRvbyBmZXcgYXJndW1lbnRzOiAke3BhcmFtc31gKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgU3VtKHRoaXMuYWQsIHRoaXMsIC4uLnRoaXMuYWQuY29udmVydFZhbHMocGFyYW1zKSlcbiAgfVxufVxuT3AucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHZhbDogSW5wdXQpIHtcbiAgcmV0dXJuIHRoaXMuYWRkKHRoaXMuYWQuY29udmVydFZhbCh2YWwpLm5lZygpKVxufVxuT3AucHJvdG90eXBlLm11bHQgPSBmdW5jdGlvbiguLi5wYXJhbXM6IElucHV0W10pIHtcbiAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYG11bHQoKSBjYWxsZWQgd2l0aCB0b28gZmV3IGFyZ3VtZW50czogJHtwYXJhbXN9YClcbiAgfSBlbHNlIGlmIChwYXJhbXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG5ldyBNdWx0KHRoaXMuYWQsIHRoaXMsIHRoaXMuYWQuY29udmVydFZhbChwYXJhbXNbMF0pKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLm11bHQocGFyYW1zWzBdKS5tdWx0KC4uLnBhcmFtcy5zbGljZSgxKSlcbiAgfVxufVxuT3AucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHBhcmFtOiBJbnB1dCkge1xuICByZXR1cm4gbmV3IERpdih0aGlzLmFkLCB0aGlzLCB0aGlzLmFkLmNvbnZlcnRWYWwocGFyYW0pKVxufVxuT3AucHJvdG90eXBlLnBvdyA9IGZ1bmN0aW9uKHBhcmFtOiBJbnB1dCkge1xuICByZXR1cm4gbmV3IFBvdyh0aGlzLmFkLCB0aGlzLCB0aGlzLmFkLmNvbnZlcnRWYWwocGFyYW0pKVxufVxuT3AucHJvdG90eXBlLnNxcnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucG93KDAuNSkgfVxuXG5leHBvcnQgZnVuY3Rpb24gV2l0aEFyaXRobWV0aWM8VCBleHRlbmRzIEFEQ29uc3RydWN0b3I+KEJhc2U6IFQpIHtcbiAgY2xhc3MgQXV0b0RpZmYgZXh0ZW5kcyBCYXNlIHtcbiAgICBzdW0oLi4ucGFyYW1zOiBJbnB1dFtdKSB7XG4gICAgICBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHN1bSgpIGNhbGxlZCB3aXRoIHRvbyBmZXcgYXJndW1lbnRzOiAke3BhcmFtc31gKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmNvbnZlcnRWYWwocGFyYW1zWzBdKVxuICAgICAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICByZXR1cm4gZmlyc3QuYWRkKC4uLnBhcmFtcy5zbGljZSgxKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmlyc3RcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBwcm9kKC4uLnBhcmFtczogSW5wdXRbXSkge1xuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwcm9kKCkgY2FsbGVkIHdpdGggdG9vIGZldyBhcmd1bWVudHM6ICR7cGFyYW1zfWApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMuY29udmVydFZhbChwYXJhbXNbMF0pXG4gICAgICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHJldHVybiBmaXJzdC5tdWx0KC4uLnBhcmFtcy5zbGljZSgxKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmlyc3RcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBzcXJ0KHBhcmFtOiBJbnB1dCkge1xuICAgICAgcmV0dXJuIHRoaXMuY29udmVydFZhbChwYXJhbSkuc3FydCgpXG4gICAgfVxuICB9XG4gIHJldHVybiBBdXRvRGlmZlxufVxuIiwiZXhwb3J0IHR5cGUgSW5wdXQgPSBPcCB8IG51bWJlclxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dG9EaWZmIHtcbiAgZ2V0TmV4dElEKCk6IG51bWJlclxuICB2YWwobjogbnVtYmVyKTogVmFsdWVcbiAgcmVnaXN0ZXJQYXJhbShwYXJhbTogT3AsIG5hbWU6IHN0cmluZylcbiAgcGFyYW0obmFtZTogc3RyaW5nKTogUGFyYW1cbiAgY29udmVydFZhbChwYXJhbTogSW5wdXQpOiBPcFxuICBjb252ZXJ0VmFscyhwYXJhbXM6IElucHV0W10pOiBPcFtdXG4gIG91dHB1dChuYW1lOiBzdHJpbmcsIG9wOiBPcCk6IEF1dG9EaWZmXG4gIG91dHB1dERlcml2KG5hbWU6IHN0cmluZywgcGFyYW06IFBhcmFtIHwgc3RyaW5nLCBvcDogT3ApOiBBdXRvRGlmZlxufVxuXG5leHBvcnQgdHlwZSBBRENvbnN0cnVjdG9yID0gbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gQXV0b0RpZmZcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9wIHtcbiAgcHJvdGVjdGVkIGFkOiBBdXRvRGlmZlxuICBwdWJsaWMgaWQ6IG51bWJlclxuICBwdWJsaWMgZGVwZW5kc09uOiBPcFtdXG4gIHB1YmxpYyB1c2VkSW46IE9wW10gPSBbXVxuXG4gIGNvbnN0cnVjdG9yKGFkOiBBdXRvRGlmZiwgLi4ucGFyYW1zOiBPcFtdKSB7XG4gICAgdGhpcy5hZCA9IGFkXG4gICAgdGhpcy5pZCA9IGFkLmdldE5leHRJRCgpXG4gICAgdGhpcy5kZXBlbmRzT24gPSBwYXJhbXNcbiAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcykge1xuICAgICAgcGFyYW0udXNlZEluLnB1c2godGhpcylcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc2NhbGFyKCkgeyByZXR1cm4gdHJ1ZSB9XG5cbiAgcHVibGljIHVzZVRlbXBWYXIoKSB7XG4gICAgcmV0dXJuIHRoaXMudXNlZEluLmxlbmd0aCA+IDFcbiAgfVxuXG4gIHB1YmxpYyByZWYoKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy51c2VUZW1wVmFyKCkpIHtcbiAgICAgIHJldHVybiBgX2dsc2xhZF92JHt0aGlzLmlkfWBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGAoJHt0aGlzLmRlZmluaXRpb24oKX0pYFxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBkZXJpdlJlZihwYXJhbTogUGFyYW0pOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLnVzZVRlbXBWYXIoKSkge1xuICAgICAgcmV0dXJuIGBfZ2xzbGFkX2R2JHt0aGlzLmlkfV9kJHtwYXJhbS5uYW1lfWBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGAoJHt0aGlzLmRlcml2YXRpdmUocGFyYW0pfSlgXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGluaXRpYWxpemVyKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMudXNlVGVtcFZhcigpKSB7XG4gICAgICByZXR1cm4gYGZsb2F0ICR7dGhpcy5yZWYoKX09JHt0aGlzLmRlZmluaXRpb24oKX07XFxuYFxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZGVyaXZJbml0aWFsaXplcihwYXJhbTogUGFyYW0pOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLnVzZVRlbXBWYXIoKSkge1xuICAgICAgcmV0dXJuIGBmbG9hdCAke3RoaXMuZGVyaXZSZWYocGFyYW0pfT0ke3RoaXMuZGVyaXZhdGl2ZShwYXJhbSl9O1xcbmBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGlzQ29uc3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLmV2ZXJ5KChvcCkgPT4gb3AuaXNDb25zdCgpKVxuICB9XG5cbiAgcHVibGljIGRlZXBEZXBlbmRlbmNpZXMoKTogU2V0PE9wPiB7XG4gICAgY29uc3QgZGVwcyA9IG5ldyBTZXQ8T3A+KClcbiAgICBmb3IgKGNvbnN0IG9wIG9mIHRoaXMuZGVwZW5kc09uKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcCBvZiBvcC5kZWVwRGVwZW5kZW5jaWVzKCkudmFsdWVzKCkpIHtcbiAgICAgICAgZGVwcy5hZGQoZGVwKVxuICAgICAgfVxuICAgICAgZGVwcy5hZGQob3ApXG4gICAgfVxuICAgIHJldHVybiBkZXBzXG4gIH1cblxuICBwdWJsaWMgb3V0cHV0KG5hbWU6IHN0cmluZykgeyByZXR1cm4gdGhpcy5hZC5vdXRwdXQobmFtZSwgdGhpcykgfVxuICBwdWJsaWMgb3V0cHV0RGVyaXYobmFtZTogc3RyaW5nLCBwYXJhbTogUGFyYW0gfCBzdHJpbmcpIHsgcmV0dXJuIHRoaXMuYWQub3V0cHV0RGVyaXYobmFtZSwgcGFyYW0sIHRoaXMpIH1cblxuICBwdWJsaWMgYWJzdHJhY3QgZGVmaW5pdGlvbigpOiBzdHJpbmdcbiAgcHVibGljIGFic3RyYWN0IGRlcml2YXRpdmUocGFyYW06IFBhcmFtKTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPcExpdGVyYWwgZXh0ZW5kcyBPcCB7XG4gIHB1YmxpYyBvdmVycmlkZSBpbml0aWFsaXplcigpIHsgcmV0dXJuICcnIH1cbiAgcHVibGljIG92ZXJyaWRlIGRlcml2SW5pdGlhbGl6ZXIoKSB7IHJldHVybiAnJyB9XG4gIHB1YmxpYyBvdmVycmlkZSByZWYoKSB7IHJldHVybiB0aGlzLmRlZmluaXRpb24oKSB9XG4gIHB1YmxpYyBvdmVycmlkZSBkZXJpdlJlZihwYXJhbTogUGFyYW0pIHsgcmV0dXJuIHRoaXMuZGVyaXZhdGl2ZShwYXJhbSkgfVxufVxuXG5leHBvcnQgY2xhc3MgVmFsdWUgZXh0ZW5kcyBPcExpdGVyYWwge1xuICBwcml2YXRlIHZhbDogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IoYWQ6IEF1dG9EaWZmLCB2YWw6IG51bWJlcikge1xuICAgIHN1cGVyKGFkKVxuICAgIHRoaXMudmFsID0gdmFsXG4gIH1cblxuICBpc0NvbnN0KCkgeyByZXR1cm4gdHJ1ZSB9XG4gIGRlZmluaXRpb24oKSB7IHJldHVybiBgJHt0aGlzLnZhbC50b0ZpeGVkKDQpfWAgfVxuICBkZXJpdmF0aXZlKCkgeyByZXR1cm4gJzAuMCcgfVxufVxuXG5leHBvcnQgY2xhc3MgUGFyYW0gZXh0ZW5kcyBPcExpdGVyYWwge1xuICBwdWJsaWMgbmFtZTogc3RyaW5nXG5cbiAgY29uc3RydWN0b3IoYWQ6IEF1dG9EaWZmLCBuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihhZClcbiAgICB0aGlzLm5hbWUgPSBuYW1lXG4gICAgdGhpcy5hZC5yZWdpc3RlclBhcmFtKHRoaXMsIG5hbWUpXG4gIH1cblxuICBpc0NvbnN0KCkgeyByZXR1cm4gZmFsc2UgfVxuICBkZWZpbml0aW9uKCkgeyByZXR1cm4gdGhpcy5uYW1lIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBpZiAocGFyYW0gPT09IHRoaXMpIHtcbiAgICAgIHJldHVybiAnMS4wJ1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJzAuMCdcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IElucHV0LCBPcCwgUGFyYW0sIEF1dG9EaWZmIGFzIEFEQmFzZSwgQURDb25zdHJ1Y3RvciB9IGZyb20gJy4vYmFzZSdcblxuZXhwb3J0IGNsYXNzIFNpbiBleHRlbmRzIE9wIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gYHNpbigke3RoaXMuZGVwZW5kc09uWzBdLnJlZigpfSlgXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICByZXR1cm4gYGNvcygke3RoaXMuZGVwZW5kc09uWzBdLnJlZigpfSkqJHt0aGlzLmRlcGVuZHNPblswXS5kZXJpdlJlZihwYXJhbSl9YFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb3MgZXh0ZW5kcyBPcCB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIGBjb3MoJHt0aGlzLmRlcGVuZHNPblswXS5yZWYoKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgcmV0dXJuIGAtc2luKCR7dGhpcy5kZXBlbmRzT25bMF0ucmVmKCl9KSoke3RoaXMuZGVwZW5kc09uWzBdLmRlcml2UmVmKHBhcmFtKX1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1peCBleHRlbmRzIE9wIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gYG1peCgke3RoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcsJyl9KWBcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIGNvbnN0IFthLCBiLCBtaXhdID0gdGhpcy5kZXBlbmRzT25cbiAgICBjb25zdCBhRGVyaXYgPSBgKDEuMC0ke2EucmVmKCl9KSoke21peC5kZXJpdlJlZihwYXJhbSl9KygtJHthLmRlcml2UmVmKHBhcmFtKX0pKiR7bWl4LnJlZigpfWBcbiAgICBjb25zdCBiRGVyaXYgPSBgJHtiLnJlZigpfSoke21peC5kZXJpdlJlZihwYXJhbSl9KyR7Yi5kZXJpdlJlZihwYXJhbSl9KiR7bWl4LnJlZigpfWBcbiAgICByZXR1cm4gYCR7YURlcml2fSske2JEZXJpdn1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENsYW1wIGV4dGVuZHMgT3Age1xuICBkZWZpbml0aW9uKCkge1xuICAgIHJldHVybiBgY2xhbXAoJHt0aGlzLmRlcGVuZHNPbi5tYXAoKG9wKSA9PiBvcC5yZWYoKSkuam9pbignLCcpfSlgXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBjb25zdCBbdiwgbWluLCBtYXhdID0gdGhpcy5kZXBlbmRzT25cbiAgICByZXR1cm4gYCR7di5yZWYoKX08JHttaW4ucmVmKCl9ID8gMC4wIDogKCR7di5yZWYoKX0+JHttYXgucmVmKCl9ID8gMC4wIDogJHt2LmRlcml2UmVmKHBhcmFtKX0pYFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNaW4gZXh0ZW5kcyBPcCB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIGBtaW4oJHt0aGlzLmRlcGVuZHNPbi5tYXAoKG9wKSA9PiBvcC5yZWYoKSkuam9pbignLCcpfSlgXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBjb25zdCBbYSwgYl0gPSB0aGlzLmRlcGVuZHNPblxuICAgIHJldHVybiBgJHthLnJlZigpfTwke2IucmVmKCl9ID8gJHthLmRlcml2UmVmKHBhcmFtKX0gOiAke2IuZGVyaXZSZWYocGFyYW0pfWBcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWF4IGV4dGVuZHMgT3Age1xuICBkZWZpbml0aW9uKCkge1xuICAgIHJldHVybiBgbWF4KCR7dGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJywnKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3QgW2EsIGJdID0gdGhpcy5kZXBlbmRzT25cbiAgICByZXR1cm4gYCR7YS5yZWYoKX0+JHtiLnJlZigpfSA/ICR7YS5kZXJpdlJlZihwYXJhbSl9IDogJHtiLmRlcml2UmVmKHBhcmFtKX1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIElmRWxzZSBleHRlbmRzIE9wIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICBjb25zdCBbY29uZGl0aW9uLCB0aGVuT3AsIGVsc2VPcF0gPSB0aGlzLmRlcGVuZHNPblxuICAgIHJldHVybiBgJHtjb25kaXRpb24ucmVmKCl9PyR7dGhlbk9wLnJlZigpfToke2Vsc2VPcC5yZWYoKX1gXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBjb25zdCBbY29uZGl0aW9uLCB0aGVuT3AsIGVsc2VPcF0gPSB0aGlzLmRlcGVuZHNPblxuICAgIHJldHVybiBgJHtjb25kaXRpb24ucmVmKCl9PyR7dGhlbk9wLmRlcml2UmVmKHBhcmFtKX06JHtlbHNlT3AuZGVyaXZSZWYocGFyYW0pfWBcbiAgfVxufVxuXG5kZWNsYXJlIG1vZHVsZSAnLi9iYXNlJyB7XG4gIGludGVyZmFjZSBPcCB7XG4gICAgc2luKCk6IE9wXG4gICAgY29zKCk6IE9wXG4gICAgdGFuKCk6IE9wXG4gICAgbWl4KGI6IElucHV0LCBhbXQ6IElucHV0KTogT3BcbiAgICBjbGFtcChtaW46IElucHV0LCBtYXg6IElucHV0KTogT3BcbiAgICBtaW4oLi4ucGFyYW1zOiBJbnB1dFtdKTogT3BcbiAgICBtYXgoLi4ucGFyYW1zOiBJbnB1dFtdKTogT3BcbiAgICBpZkVsc2UodGhlbk9wOiBJbnB1dCwgZWxzZU9wOiBJbnB1dCk6IE9wXG4gIH1cbn1cblxuT3AucHJvdG90eXBlLnNpbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNpbih0aGlzLmFkLCB0aGlzKVxufVxuT3AucHJvdG90eXBlLmNvcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IENvcyh0aGlzLmFkLCB0aGlzKVxufVxuT3AucHJvdG90eXBlLnRhbiA9IGZ1bmN0aW9uKCkge1xuICAvLyBUT0RPIG1ha2UgdGhpcyBpdHMgb3duIGNsYXNzIHRvIG9wdGltaXplIGl0XG4gIHJldHVybiB0aGlzLnNpbigpLmRpdih0aGlzLmNvcygpKVxufVxuT3AucHJvdG90eXBlLm1peCA9IGZ1bmN0aW9uKGI6IElucHV0LCBhbXQ6IElucHV0KSB7XG4gIHJldHVybiBuZXcgTWl4KHRoaXMuYWQsIHRoaXMsIHRoaXMuYWQuY29udmVydFZhbChiKSwgdGhpcy5hZC5jb252ZXJ0VmFsKGFtdCkpXG59XG5PcC5wcm90b3R5cGUuY2xhbXAgPSBmdW5jdGlvbihtaW46IElucHV0LCBtYXg6IElucHV0KSB7XG4gIHJldHVybiBuZXcgQ2xhbXAodGhpcy5hZCwgdGhpcywgdGhpcy5hZC5jb252ZXJ0VmFsKG1pbiksIHRoaXMuYWQuY29udmVydFZhbChtYXgpKVxufVxuT3AucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uKC4uLnBhcmFtczogSW5wdXRbXSkge1xuICByZXR1cm4gcGFyYW1zLnJlZHVjZShcbiAgICAoYWNjLCBuZXh0KSA9PiBuZXcgTWluKHRoaXMuYWQsIGFjYywgdGhpcy5hZC5jb252ZXJ0VmFsKG5leHQpKSxcbiAgICB0aGlzLFxuICApXG59XG5PcC5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24oLi4ucGFyYW1zOiBJbnB1dFtdKSB7XG4gIHJldHVybiBwYXJhbXMucmVkdWNlKFxuICAgIChhY2MsIG5leHQpID0+IG5ldyBNYXgodGhpcy5hZCwgYWNjLCB0aGlzLmFkLmNvbnZlcnRWYWwobmV4dCkpLFxuICAgIHRoaXMsXG4gIClcbn1cbk9wLnByb3RvdHlwZS5pZkVsc2UgPSBmdW5jdGlvbih0aGVuT3A6IElucHV0LCBlbHNlT3A6IElucHV0KSB7XG4gIHJldHVybiBuZXcgSWZFbHNlKHRoaXMuYWQsIHRoaXMsIHRoaXMuYWQuY29udmVydFZhbCh0aGVuT3ApLCB0aGlzLmFkLmNvbnZlcnRWYWwoZWxzZU9wKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFdpdGhGdW5jdGlvbnM8VCBleHRlbmRzIEFEQ29uc3RydWN0b3I+KEJhc2U6IFQpIHtcbiAgY2xhc3MgQXV0b0RpZmYgZXh0ZW5kcyBCYXNlIHtcbiAgICBzaW4oaW5wdXQ6IElucHV0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0VmFsKGlucHV0KS5zaW4oKVxuICAgIH1cbiAgICBjb3MoaW5wdXQ6IElucHV0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0VmFsKGlucHV0KS5jb3MoKVxuICAgIH1cbiAgICB0YW4oaW5wdXQ6IElucHV0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0VmFsKGlucHV0KS50YW4oKVxuICAgIH1cbiAgICBtaXgoYTogSW5wdXQsIGI6IElucHV0LCBhbXQ6IElucHV0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0VmFsKGEpLm1peChiLCBhbXQpXG4gICAgfVxuICAgIGNsYW1wKHZhbDogSW5wdXQsIG1pbjogSW5wdXQsIG1heDogSW5wdXQpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnZlcnRWYWwodmFsKS5jbGFtcChtaW4sIG1heClcbiAgICB9XG4gICAgbWluKC4uLnBhcmFtczogSW5wdXRbXSkge1xuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBhcmd1bWVudHMgcGFzc2VkIHRvIG1pbigpIWApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMuY29udmVydFZhbChwYXJhbXNbMF0pXG4gICAgICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHJldHVybiBmaXJzdC5taW4oLi4ucGFyYW1zLnNsaWNlKDEpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmaXJzdFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIG1heCguLi5wYXJhbXM6IElucHV0W10pIHtcbiAgICAgIGlmIChwYXJhbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gYXJndW1lbnRzIHBhc3NlZCB0byBtaW4oKSFgKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmNvbnZlcnRWYWwocGFyYW1zWzBdKVxuICAgICAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICByZXR1cm4gZmlyc3QubWF4KC4uLnBhcmFtcy5zbGljZSgxKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmlyc3RcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZkVsc2UoaWZPcDogSW5wdXQsIHRoZW5PcDogSW5wdXQsIGVsc2VPcDogSW5wdXQpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnZlcnRWYWwoaWZPcCkuaWZFbHNlKHRoZW5PcCwgZWxzZU9wKVxuICAgIH1cbiAgfVxuICByZXR1cm4gQXV0b0RpZmZcbn1cbiIsImltcG9ydCB7IElucHV0LCBQYXJhbSwgT3AsIFZhbHVlLCBBdXRvRGlmZiBhcyBBREJhc2UgfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBXaXRoQXJpdGhtZXRpYyB9IGZyb20gJy4vYXJpdGhtZXRpYydcbmltcG9ydCB7IFdpdGhGdW5jdGlvbnMgfSBmcm9tICcuL2Z1bmN0aW9ucydcbmltcG9ydCB7IFdpdGhWZWNCYXNlIH0gZnJvbSAnLi92ZWNCYXNlJ1xuaW1wb3J0IHsgV2l0aFZlY0FyaXRobWV0aWMgfSBmcm9tICcuL3ZlY0FyaXRobWV0aWMnXG5pbXBvcnQgeyBXaXRoVmVjRnVuY3Rpb25zIH0gZnJvbSAnLi92ZWNGdW5jdGlvbnMnXG5cbkBXaXRoRnVuY3Rpb25zXG5AV2l0aEFyaXRobWV0aWNcbkBXaXRoVmVjQmFzZVxuQFdpdGhWZWNBcml0aG1ldGljXG5AV2l0aFZlY0Z1bmN0aW9uc1xuY2xhc3MgQXV0b0RpZmYgaW1wbGVtZW50cyBBREJhc2Uge1xuICBwcm90ZWN0ZWQgbmV4dElEID0gMFxuICBwdWJsaWMgZ2V0TmV4dElEKCk6IG51bWJlciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRJRFxuICAgIHRoaXMubmV4dElEKytcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJhbXM6IHsgW2tleTogc3RyaW5nXTogUGFyYW0gfSA9IHt9XG4gIHByb3RlY3RlZCBvdXRwdXRzOiB7IFtrZXk6IHN0cmluZ106IE9wIH0gPSB7fVxuICBwcm90ZWN0ZWQgZGVyaXZPdXRwdXRzOiB7IFtwYXJhbTogc3RyaW5nXTogeyBba2V5OiBzdHJpbmddOiBPcCB9IH0gPSB7fVxuXG4gIHB1YmxpYyB2YWwobjogbnVtYmVyKSB7IHJldHVybiBuZXcgVmFsdWUodGhpcywgbikgfVxuICBwdWJsaWMgcmVnaXN0ZXJQYXJhbShwYXJhbSwgbmFtZSkge1xuICAgIHRoaXMucGFyYW1zW25hbWVdID0gcGFyYW1cbiAgfVxuICBwdWJsaWMgcGFyYW0obmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBQYXJhbSh0aGlzLCBuYW1lKVxuICB9XG5cbiAgcHVibGljIGNvbnZlcnRWYWwocGFyYW06IElucHV0KTogT3Age1xuICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIE9wKSB7XG4gICAgICByZXR1cm4gcGFyYW1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudmFsKHBhcmFtKVxuICAgIH1cbiAgfVxuICBwdWJsaWMgY29udmVydFZhbHMocGFyYW1zOiBJbnB1dFtdKTogT3BbXSB7XG4gICAgcmV0dXJuIHBhcmFtcy5tYXAoKHBhcmFtKSA9PiB0aGlzLmNvbnZlcnRWYWwocGFyYW0pKVxuICB9XG5cbiAgcHVibGljIG91dHB1dChuYW1lOiBzdHJpbmcsIG9wOiBPcCkge1xuICAgIHRoaXMub3V0cHV0c1tuYW1lXSA9IG9wXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHB1YmxpYyBvdXRwdXREZXJpdihuYW1lOiBzdHJpbmcsIHBhcmFtOiBQYXJhbSB8IHN0cmluZywgb3A6IE9wKSB7XG4gICAgY29uc3QgcGFyYW1OYW1lID0gdHlwZW9mIHBhcmFtID09PSAnc3RyaW5nJyA/IHBhcmFtIDogcGFyYW0ubmFtZVxuICAgIHRoaXMuZGVyaXZPdXRwdXRzW3BhcmFtTmFtZV0gPSB0aGlzLmRlcml2T3V0cHV0c1twYXJhbU5hbWVdIHx8IHt9XG4gICAgdGhpcy5kZXJpdk91dHB1dHNbcGFyYW1OYW1lXVtuYW1lXSA9IG9wXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHB1YmxpYyBnZW4oKTogc3RyaW5nIHtcbiAgICBsZXQgY29kZSA9ICcnXG5cbiAgICAvLyBBZGQgaW5pdGlhbGl6ZXJzIGZvciBvdXRwdXRzXG4gICAgY29uc3QgZGVwcyA9IG5ldyBTZXQ8T3A+KClcbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4gdGhpcy5vdXRwdXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcCBvZiB0aGlzLm91dHB1dHNbbmFtZV0uZGVlcERlcGVuZGVuY2llcygpLnZhbHVlcygpKSB7XG4gICAgICAgIGRlcHMuYWRkKGRlcClcbiAgICAgIH1cbiAgICAgIGRlcHMuYWRkKHRoaXMub3V0cHV0c1tuYW1lXSlcbiAgICB9XG4gICAgZm9yIChjb25zdCBwYXJhbSBpbiB0aGlzLmRlcml2T3V0cHV0cykge1xuICAgICAgZm9yIChjb25zdCBuYW1lIGluIHRoaXMuZGVyaXZPdXRwdXRzW3BhcmFtXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBvZiB0aGlzLmRlcml2T3V0cHV0c1twYXJhbV1bbmFtZV0uZGVlcERlcGVuZGVuY2llcygpLnZhbHVlcygpKSB7XG4gICAgICAgICAgZGVwcy5hZGQoZGVwKVxuICAgICAgICB9XG4gICAgICAgIGRlcHMuYWRkKHRoaXMuZGVyaXZPdXRwdXRzW3BhcmFtXVtuYW1lXSlcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBkZXAgb2YgZGVwcy52YWx1ZXMoKSkge1xuICAgICAgY29kZSArPSBkZXAuaW5pdGlhbGl6ZXIoKVxuICAgIH1cblxuICAgIC8vIEFkZCBvdXRwdXRzXG4gICAgZm9yIChjb25zdCBuYW1lIGluIHRoaXMub3V0cHV0cykge1xuICAgICAgY29kZSArPSBgZmxvYXQgJHtuYW1lfT0ke3RoaXMub3V0cHV0c1tuYW1lXS5yZWYoKX07XFxuYFxuICAgIH1cblxuICAgIGZvciAoY29uc3QgcGFyYW0gaW4gdGhpcy5kZXJpdk91dHB1dHMpIHtcbiAgICAgIGNvbnN0IHBhcmFtT3AgPSB0aGlzLnBhcmFtc1twYXJhbV1cblxuICAgICAgLy8gQWRkIGluaXRpYWxpemVycyBmb3IgZGVyaXZhdGl2ZSBvdXRwdXRzXG4gICAgICBjb25zdCBkZXJpdkRlcHMgPSBuZXcgU2V0PE9wPigpXG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gdGhpcy5kZXJpdk91dHB1dHNbcGFyYW1dKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwIG9mIHRoaXMuZGVyaXZPdXRwdXRzW3BhcmFtXVtuYW1lXS5kZWVwRGVwZW5kZW5jaWVzKCkudmFsdWVzKCkpIHtcbiAgICAgICAgICBkZXJpdkRlcHMuYWRkKGRlcClcbiAgICAgICAgfVxuICAgICAgICBkZXJpdkRlcHMuYWRkKHRoaXMuZGVyaXZPdXRwdXRzW3BhcmFtXVtuYW1lXSlcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZGVwIG9mIGRlcml2RGVwcy52YWx1ZXMoKSkge1xuICAgICAgICBjb2RlICs9IGRlcC5kZXJpdkluaXRpYWxpemVyKHBhcmFtT3ApXG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBkZXJpdmF0aXZlIG91dHB1dHNcbiAgICAgIGZvciAoY29uc3QgbmFtZSBpbiB0aGlzLmRlcml2T3V0cHV0c1twYXJhbV0pIHtcbiAgICAgICAgY29kZSArPSBgZmxvYXQgJHtuYW1lfT0ke3RoaXMuZGVyaXZPdXRwdXRzW3BhcmFtXVtuYW1lXS5kZXJpdlJlZihwYXJhbU9wKX07XFxuYFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb2RlXG4gIH1cbn1cblxuY29uc3QgQXV0b0RpZmZHZW5lcmF0b3IgPSB7XG4gIGdlbihjYjogKGFkOiBBdXRvRGlmZikgPT4gT3ApOiBzdHJpbmcge1xuICAgIGNvbnN0IGFkID0gbmV3IEF1dG9EaWZmKClcbiAgICBjYihhZClcbiAgICByZXR1cm4gYWQuZ2VuKClcbiAgfVxufVxuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cgeyBBdXRvRGlmZjogdHlwZW9mIEF1dG9EaWZmR2VuZXJhdG9yIH1cbn1cbndpbmRvdy5BdXRvRGlmZiA9IHdpbmRvdy5BdXRvRGlmZiB8fCBBdXRvRGlmZkdlbmVyYXRvclxuIiwiaW1wb3J0IHsgSW5wdXQsIFBhcmFtLCBBdXRvRGlmZiBhcyBBREJhc2UsIEFEQ29uc3RydWN0b3IgfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBWZWN0b3JPcCwgV2l0aFZlY0RlcGVuZGVuY2llcyB9IGZyb20gJy4vdmVjQmFzZSdcblxuZXhwb3J0IGNsYXNzIFZlY05lZyBleHRlbmRzIFdpdGhWZWNEZXBlbmRlbmNpZXMge1xuICBkZWZpbml0aW9uKCkge1xuICAgIHJldHVybiBgLSR7dGhpcy5kZXBlbmRzT25bMF0ucmVmKCl9YFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgcmV0dXJuICctJyArIHRoaXMuZGVwZW5kc09uWzBdLmRlcml2UmVmKHBhcmFtKVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWZWNTdW0gZXh0ZW5kcyBXaXRoVmVjRGVwZW5kZW5jaWVzIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJysnKVxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLmRlcml2UmVmKHBhcmFtKSkuam9pbignKycpXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZlY1NjYWxlIGV4dGVuZHMgV2l0aFZlY0RlcGVuZGVuY2llcyB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcqJylcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIC8vIE11bHRpcGx5aW5nIHR3byB2ZWN0b3JzIGluIGdsc2wgZG9lcyBlbGVtZW50d2lzZSBtdWx0aXBsaWNhdGlvblxuICAgIHJldHVybiB0aGlzLmRlcGVuZHNPbi5tYXAoKG9wKSA9PiBvcC5kZXJpdlJlZihwYXJhbSkpLmpvaW4oJyonKVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWZWNNdWx0IGV4dGVuZHMgV2l0aFZlY0RlcGVuZGVuY2llcyB7XG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcqJylcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIGNvbnN0IFtmLCBnXSA9IHRoaXMuZGVwZW5kc09uXG4gICAgcmV0dXJuIGAke2YucmVmKCl9KiR7Zy5kZXJpdlJlZihwYXJhbSl9KyR7Zy5yZWYoKX0qJHtmLmRlcml2UmVmKHBhcmFtKX1gXG4gIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vdmVjQmFzZScge1xuICBpbnRlcmZhY2UgVmVjdG9yT3Age1xuICAgIG5lZygpOiBWZWN0b3JPcFxuICAgIGFkZCguLi5wYXJhbXM6IFZlY3Rvck9wW10pOiBWZWN0b3JPcFxuICAgIHNjYWxlKGs6IElucHV0KTogVmVjdG9yT3BcbiAgICBtdWx0KC4uLnBhcmFtczogVmVjdG9yT3BbXSk6IFZlY3Rvck9wXG4gIH1cbn1cblZlY3Rvck9wLnByb3RvdHlwZS5uZWcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBWZWNOZWcodGhpcy5hZCwgdGhpcylcbn1cblZlY3Rvck9wLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiguLi5wYXJhbXM6IFZlY3Rvck9wW10pIHtcbiAgcmV0dXJuIG5ldyBWZWNTdW0odGhpcy5hZCwgLi4ucGFyYW1zKVxufVxuVmVjdG9yT3AucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oazogSW5wdXQpIHtcbiAgcmV0dXJuIG5ldyBWZWNTY2FsZSh0aGlzLmFkLCB0aGlzLCB0aGlzLmFkLmNvbnZlcnRWYWwoaykpXG59XG5WZWN0b3JPcC5wcm90b3R5cGUubXVsdCA9IGZ1bmN0aW9uKC4uLnBhcmFtczogVmVjdG9yT3BbXSkge1xuICBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgbXVsdCgpIGNhbGxlZCB3aXRoIHRvbyBmZXcgYXJndW1lbnRzOiAke3BhcmFtc31gKVxuICB9IGVsc2UgaWYgKHBhcmFtcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbmV3IFZlY011bHQodGhpcy5hZCwgdGhpcywgcGFyYW1zWzBdKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLm11bHQocGFyYW1zWzBdKS5tdWx0KC4uLnBhcmFtcy5zbGljZSgxKSlcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gV2l0aFZlY0FyaXRobWV0aWM8VCBleHRlbmRzIEFEQ29uc3RydWN0b3I+KEJhc2U6IFQpIHtcbiAgY2xhc3MgQXV0b0RpZmYgZXh0ZW5kcyBCYXNlIHtcbiAgICB2ZWNTdW0oLi4ucGFyYW1zOiBWZWN0b3JPcFtdKSB7XG4gICAgICBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGFyZ3VtZW50cyBwYXNzZWQgdG8gdmVjU3VtKCkhJylcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gcGFyYW1zWzBdXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGFyYW1zWzBdLmFkZCguLi5wYXJhbXMuc2xpY2UoMSkpXG4gICAgICB9XG4gICAgfVxuICAgIHZlY1Byb2QoLi4ucGFyYW1zOiBWZWN0b3JPcFtdKSB7XG4gICAgICByZXR1cm4gcGFyYW1zLnJlZHVjZSgoYWNjLCBuZXh0KSA9PiBhY2MubXVsdChuZXh0KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEF1dG9EaWZmXG59XG4iLCJpbXBvcnQgeyBPcCwgT3BMaXRlcmFsLCBBdXRvRGlmZiBhcyBBREJhc2UsIFBhcmFtLCBJbnB1dCwgQURDb25zdHJ1Y3RvciB9IGZyb20gJy4vYmFzZSdcblxuZXhwb3J0IGludGVyZmFjZSBWZWNPcCBleHRlbmRzIE9wIHtcbiAgeCgpOiBPcFxuICB5KCk6IE9wXG4gIHooKTogT3BcbiAgdygpOiBPcFxuICBkZWZpbml0aW9uKCk6IHN0cmluZ1xuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSk6IHN0cmluZ1xuICBzaXplKCk6IG51bWJlclxufVxuXG5leHBvcnQgY2xhc3MgVmVjRWxlbWVudFJlZiBleHRlbmRzIE9wIHtcbiAgcHVibGljIHByb3A6IHN0cmluZ1xuXG4gIGNvbnN0cnVjdG9yKGFkOiBBREJhc2UsIHByb3A6IHN0cmluZywgdmVjOiBWZWNPcCkge1xuICAgIHN1cGVyKGFkLCB2ZWMpXG4gICAgdGhpcy5wcm9wID0gcHJvcFxuICB9XG5cbiAgZGVmaW5pdGlvbigpIHsgcmV0dXJuIGAke3RoaXMuZGVwZW5kc09uWzBdLnJlZigpfS4ke3RoaXMucHJvcH1gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHsgcmV0dXJuIGAke3RoaXMuZGVwZW5kc09uWzBdLmRlcml2UmVmKHBhcmFtKX0uJHt0aGlzLnByb3B9YCB9XG59XG5cbmV4cG9ydCBjbGFzcyBWZWNQYXJhbUVsZW1lbnRSZWYgZXh0ZW5kcyBPcExpdGVyYWwge1xuICBwdWJsaWMgcHJvcDogc3RyaW5nXG4gIHB1YmxpYyBuYW1lOiBzdHJpbmdcblxuICBjb25zdHJ1Y3RvcihhZDogQURCYXNlLCBwcm9wOiBzdHJpbmcsIHZlYzogVmVjT3ApIHtcbiAgICBzdXBlcihhZCwgdmVjKVxuICAgIHRoaXMucHJvcCA9IHByb3BcbiAgICB0aGlzLm5hbWUgPSBgX2dsc2xhZF9yJHt2ZWMuaWR9XyR7cHJvcH1gXG4gICAgdGhpcy5hZC5yZWdpc3RlclBhcmFtKHRoaXMsIHRoaXMubmFtZSlcbiAgfVxuXG4gIGRlZmluaXRpb24oKSB7IHJldHVybiBgJHt0aGlzLmRlcGVuZHNPblswXS5yZWYoKX0uJHt0aGlzLnByb3B9YCB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgaWYgKHBhcmFtID09PSB0aGlzKSB7XG4gICAgICByZXR1cm4gJzEuMCdcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcwLjAnXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDYWNoZSh0YXJnZXQ6IE9iamVjdCwgcHJvcGVydHlLZXk6IHN0cmluZywgZGVzY3JpcHRvcjogUHJvcGVydHlEZXNjcmlwdG9yKSB7XG4gIGNvbnN0IG9yaWdpbmFsTWV0aG9kID0gZGVzY3JpcHRvci52YWx1ZVxuICBsZXQgY3JlYXRlZCA9IGZhbHNlXG4gIGxldCBjYWNoZWQ6IGFueSA9IHVuZGVmaW5lZFxuICBkZXNjcmlwdG9yLnZhbHVlID0gZnVuY3Rpb24oLi4uYXJnczogYW55W10pIHtcbiAgICBpZiAoIWNyZWF0ZWQpIHtcbiAgICAgIGNhY2hlZCA9IG9yaWdpbmFsTWV0aG9kLmFwcGx5KHRoaXMsIC4uLmFyZ3MpXG4gICAgICBjcmVhdGVkID0gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gY2FjaGVkXG4gIH1cbiAgcmV0dXJuIGRlc2NyaXB0b3Jcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZlY3Rvck9wIGV4dGVuZHMgT3AgaW1wbGVtZW50cyBWZWNPcCB7XG4gIHNjYWxhcigpIHsgcmV0dXJuIGZhbHNlIH1cblxuICBhYnN0cmFjdCBzaXplKCk6IG51bWJlclxuXG4gIEBDYWNoZVxuICBwdWJsaWMgeCgpOiBPcCB7IHJldHVybiBuZXcgVmVjRWxlbWVudFJlZih0aGlzLmFkLCAneCcsIHRoaXMpIH1cblxuICBAQ2FjaGVcbiAgcHVibGljIHkoKTogT3AgeyByZXR1cm4gbmV3IFZlY0VsZW1lbnRSZWYodGhpcy5hZCwgJ3knLCB0aGlzKSB9XG5cbiAgQENhY2hlXG4gIHB1YmxpYyB6KCk6IE9wIHsgcmV0dXJuIG5ldyBWZWNFbGVtZW50UmVmKHRoaXMuYWQsICd6JywgdGhpcykgfVxuXG4gIEBDYWNoZVxuICBwdWJsaWMgdygpOiBPcCB7IHJldHVybiBuZXcgVmVjRWxlbWVudFJlZih0aGlzLmFkLCAndycsIHRoaXMpIH1cblxuICBwdWJsaWMgZ2V0VmVjRWxlbWVudFJlZihlbDogc3RyaW5nKSB7XG4gICAgaWYgKGVsID09PSAneCcpIHtcbiAgICAgIHJldHVybiB0aGlzLngoKVxuICAgIH0gZWxzZSBpZiAoZWwgPT09ICd5Jykge1xuICAgICAgcmV0dXJuIHRoaXMueSgpXG4gICAgfSBlbHNlIGlmIChlbCA9PT0gJ3onKSB7XG4gICAgICByZXR1cm4gdGhpcy56KClcbiAgICB9IGVsc2UgaWYgKGVsID09PSAndycpIHtcbiAgICAgIHJldHVybiB0aGlzLncoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdldCBlbGVtZW50IHJlZiAke2VsfWApXG4gICAgfVxuICB9XG5cbiAgcHVibGljIHUoKSB7IHJldHVybiB0aGlzLngoKSB9XG4gIHB1YmxpYyB2KCkgeyByZXR1cm4gdGhpcy55KCkgfVxuICBwdWJsaWMgcigpIHsgcmV0dXJuIHRoaXMueCgpIH1cbiAgcHVibGljIGcoKSB7IHJldHVybiB0aGlzLnkoKSB9XG4gIHB1YmxpYyBiKCkgeyByZXR1cm4gdGhpcy56KCkgfVxuICBwdWJsaWMgYSgpIHsgcmV0dXJuIHRoaXMudygpIH1cbiAgLy8gSSByZWFsbHkgd2lzaCBJIGNvdWxkIGp1c3QgZG8gYSBsb29wIGJ1dCBJIGFsc28gd2FudCBUUyB0byBzdGF0aWNhbGx5IHR5cGUgdGhpcyxcbiAgLy8gc28gaW5zdGVhZCBJIGp1c3QgZm91bmQgcGVybXV0YXRpb25zIG9mIGFsbCBjb21iaW5hdGlvbnMgYW5kIGdlbmVyYXRlZCBjb2RlIHRvXG4gIC8vIHBhc3RlIGluLlxuICAvLyBUT0RPIG1ha2UgdGhlc2UgcmVmcyBpbnN0ZWFkIG9mIG5ldyB2ZWN0b3JzXG4gIHh5encoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnkoKSwgdGhpcy56KCksIHRoaXMudygpKSB9XG4gIHh5d3ooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnkoKSwgdGhpcy53KCksIHRoaXMueigpKSB9XG4gIHh6eXcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnooKSwgdGhpcy55KCksIHRoaXMudygpKSB9XG4gIHh6d3koKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnooKSwgdGhpcy53KCksIHRoaXMueSgpKSB9XG4gIHh3eXooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLncoKSwgdGhpcy55KCksIHRoaXMueigpKSB9XG4gIHh3enkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLncoKSwgdGhpcy56KCksIHRoaXMueSgpKSB9XG4gIHl4encoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLngoKSwgdGhpcy56KCksIHRoaXMudygpKSB9XG4gIHl4d3ooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLngoKSwgdGhpcy53KCksIHRoaXMueigpKSB9XG4gIHl6eHcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLnooKSwgdGhpcy54KCksIHRoaXMudygpKSB9XG4gIHl6d3goKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLnooKSwgdGhpcy53KCksIHRoaXMueCgpKSB9XG4gIHl3eHooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLncoKSwgdGhpcy54KCksIHRoaXMueigpKSB9XG4gIHl3engoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLncoKSwgdGhpcy56KCksIHRoaXMueCgpKSB9XG4gIHp4eXcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLngoKSwgdGhpcy55KCksIHRoaXMudygpKSB9XG4gIHp4d3koKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLngoKSwgdGhpcy53KCksIHRoaXMueSgpKSB9XG4gIHp5eHcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLnkoKSwgdGhpcy54KCksIHRoaXMudygpKSB9XG4gIHp5d3goKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLnkoKSwgdGhpcy53KCksIHRoaXMueCgpKSB9XG4gIHp3eHkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLncoKSwgdGhpcy54KCksIHRoaXMueSgpKSB9XG4gIHp3eXgoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLncoKSwgdGhpcy55KCksIHRoaXMueCgpKSB9XG4gIHd4eXooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLngoKSwgdGhpcy55KCksIHRoaXMueigpKSB9XG4gIHd4enkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLngoKSwgdGhpcy56KCksIHRoaXMueSgpKSB9XG4gIHd5eHooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLnkoKSwgdGhpcy54KCksIHRoaXMueigpKSB9XG4gIHd5engoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLnkoKSwgdGhpcy56KCksIHRoaXMueCgpKSB9XG4gIHd6eHkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLnooKSwgdGhpcy54KCksIHRoaXMueSgpKSB9XG4gIHd6eXgoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLnooKSwgdGhpcy55KCksIHRoaXMueCgpKSB9XG4gIHh5eigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy54KCksIHRoaXMueSgpLCB0aGlzLnooKSkgfVxuICB4enkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnooKSwgdGhpcy55KCkpIH1cbiAgeXh6KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnkoKSwgdGhpcy54KCksIHRoaXMueigpKSB9XG4gIHl6eCgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy55KCksIHRoaXMueigpLCB0aGlzLngoKSkgfVxuICB6eHkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLngoKSwgdGhpcy55KCkpIH1cbiAgenl4KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnooKSwgdGhpcy55KCksIHRoaXMueCgpKSB9XG4gIHh5dygpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy54KCksIHRoaXMueSgpLCB0aGlzLncoKSkgfVxuICB4d3koKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLncoKSwgdGhpcy55KCkpIH1cbiAgeXh3KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnkoKSwgdGhpcy54KCksIHRoaXMudygpKSB9XG4gIHl3eCgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy55KCksIHRoaXMudygpLCB0aGlzLngoKSkgfVxuICB3eHkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLngoKSwgdGhpcy55KCkpIH1cbiAgd3l4KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLncoKSwgdGhpcy55KCksIHRoaXMueCgpKSB9XG4gIHh5KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLngoKSwgdGhpcy55KCkpIH1cbiAgeXgoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLngoKSkgfVxuICB4encoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLnooKSwgdGhpcy53KCkpIH1cbiAgeHd6KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLngoKSwgdGhpcy53KCksIHRoaXMueigpKSB9XG4gIHp4dygpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy56KCksIHRoaXMueCgpLCB0aGlzLncoKSkgfVxuICB6d3goKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLncoKSwgdGhpcy54KCkpIH1cbiAgd3h6KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLncoKSwgdGhpcy54KCksIHRoaXMueigpKSB9XG4gIHd6eCgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy53KCksIHRoaXMueigpLCB0aGlzLngoKSkgfVxuICB4eigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy54KCksIHRoaXMueigpKSB9XG4gIHp4KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnooKSwgdGhpcy54KCkpIH1cbiAgeHcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueCgpLCB0aGlzLncoKSkgfVxuICB3eCgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy53KCksIHRoaXMueCgpKSB9XG4gIHl6dygpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy55KCksIHRoaXMueigpLCB0aGlzLncoKSkgfVxuICB5d3ooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueSgpLCB0aGlzLncoKSwgdGhpcy56KCkpIH1cbiAgenl3KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnooKSwgdGhpcy55KCksIHRoaXMudygpKSB9XG4gIHp3eSgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy56KCksIHRoaXMudygpLCB0aGlzLnkoKSkgfVxuICB3eXooKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudygpLCB0aGlzLnkoKSwgdGhpcy56KCkpIH1cbiAgd3p5KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLncoKSwgdGhpcy56KCksIHRoaXMueSgpKSB9XG4gIHl6KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnkoKSwgdGhpcy56KCkpIH1cbiAgenkoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLnkoKSkgfVxuICB5dygpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy55KCksIHRoaXMudygpKSB9XG4gIHd5KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLncoKSwgdGhpcy55KCkpIH1cbiAgencoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMueigpLCB0aGlzLncoKSkgfVxuICB3eigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy53KCksIHRoaXMueigpKSB9XG4gIHJnYmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmcoKSwgdGhpcy5iKCksIHRoaXMuYSgpKSB9XG4gIHJnYWIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmcoKSwgdGhpcy5hKCksIHRoaXMuYigpKSB9XG4gIHJiZ2EoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmIoKSwgdGhpcy5nKCksIHRoaXMuYSgpKSB9XG4gIHJiYWcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmIoKSwgdGhpcy5hKCksIHRoaXMuZygpKSB9XG4gIHJhZ2IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmEoKSwgdGhpcy5nKCksIHRoaXMuYigpKSB9XG4gIHJhYmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmEoKSwgdGhpcy5iKCksIHRoaXMuZygpKSB9XG4gIGdyYmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLnIoKSwgdGhpcy5iKCksIHRoaXMuYSgpKSB9XG4gIGdyYWIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLnIoKSwgdGhpcy5hKCksIHRoaXMuYigpKSB9XG4gIGdicmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLmIoKSwgdGhpcy5yKCksIHRoaXMuYSgpKSB9XG4gIGdiYXIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLmIoKSwgdGhpcy5hKCksIHRoaXMucigpKSB9XG4gIGdhcmIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLmEoKSwgdGhpcy5yKCksIHRoaXMuYigpKSB9XG4gIGdhYnIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLmEoKSwgdGhpcy5iKCksIHRoaXMucigpKSB9XG4gIGJyZ2EoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLnIoKSwgdGhpcy5nKCksIHRoaXMuYSgpKSB9XG4gIGJyYWcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLnIoKSwgdGhpcy5hKCksIHRoaXMuZygpKSB9XG4gIGJncmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmcoKSwgdGhpcy5yKCksIHRoaXMuYSgpKSB9XG4gIGJnYXIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmcoKSwgdGhpcy5hKCksIHRoaXMucigpKSB9XG4gIGJhcmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmEoKSwgdGhpcy5yKCksIHRoaXMuZygpKSB9XG4gIGJhZ3IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmEoKSwgdGhpcy5nKCksIHRoaXMucigpKSB9XG4gIGFyZ2IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLnIoKSwgdGhpcy5nKCksIHRoaXMuYigpKSB9XG4gIGFyYmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLnIoKSwgdGhpcy5iKCksIHRoaXMuZygpKSB9XG4gIGFncmIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLmcoKSwgdGhpcy5yKCksIHRoaXMuYigpKSB9XG4gIGFnYnIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLmcoKSwgdGhpcy5iKCksIHRoaXMucigpKSB9XG4gIGFicmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLmIoKSwgdGhpcy5yKCksIHRoaXMuZygpKSB9XG4gIGFiZ3IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLmIoKSwgdGhpcy5nKCksIHRoaXMucigpKSB9XG4gIHJnYigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5yKCksIHRoaXMuZygpLCB0aGlzLmIoKSkgfVxuICByYmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmIoKSwgdGhpcy5nKCkpIH1cbiAgZ3JiKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmcoKSwgdGhpcy5yKCksIHRoaXMuYigpKSB9XG4gIGdicigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5nKCksIHRoaXMuYigpLCB0aGlzLnIoKSkgfVxuICBicmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLnIoKSwgdGhpcy5nKCkpIH1cbiAgYmdyKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmIoKSwgdGhpcy5nKCksIHRoaXMucigpKSB9XG4gIHJnYSgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5yKCksIHRoaXMuZygpLCB0aGlzLmEoKSkgfVxuICByYWcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmEoKSwgdGhpcy5nKCkpIH1cbiAgZ3JhKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmcoKSwgdGhpcy5yKCksIHRoaXMuYSgpKSB9XG4gIGdhcigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5nKCksIHRoaXMuYSgpLCB0aGlzLnIoKSkgfVxuICBhcmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLnIoKSwgdGhpcy5nKCkpIH1cbiAgYWdyKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmEoKSwgdGhpcy5nKCksIHRoaXMucigpKSB9XG4gIHJnKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnIoKSwgdGhpcy5nKCkpIH1cbiAgZ3IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLnIoKSkgfVxuICByYmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmIoKSwgdGhpcy5hKCkpIH1cbiAgcmFiKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnIoKSwgdGhpcy5hKCksIHRoaXMuYigpKSB9XG4gIGJyYSgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5iKCksIHRoaXMucigpLCB0aGlzLmEoKSkgfVxuICBiYXIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmEoKSwgdGhpcy5yKCkpIH1cbiAgYXJiKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmEoKSwgdGhpcy5yKCksIHRoaXMuYigpKSB9XG4gIGFicigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5hKCksIHRoaXMuYigpLCB0aGlzLnIoKSkgfVxuICByYigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5yKCksIHRoaXMuYigpKSB9XG4gIGJyKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmIoKSwgdGhpcy5yKCkpIH1cbiAgcmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMucigpLCB0aGlzLmEoKSkgfVxuICBhcigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5hKCksIHRoaXMucigpKSB9XG4gIGdiYSgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5nKCksIHRoaXMuYigpLCB0aGlzLmEoKSkgfVxuICBnYWIoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuZygpLCB0aGlzLmEoKSwgdGhpcy5iKCkpIH1cbiAgYmdhKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmIoKSwgdGhpcy5nKCksIHRoaXMuYSgpKSB9XG4gIGJhZygpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5iKCksIHRoaXMuYSgpLCB0aGlzLmcoKSkgfVxuICBhZ2IoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYSgpLCB0aGlzLmcoKSwgdGhpcy5iKCkpIH1cbiAgYWJnKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmEoKSwgdGhpcy5iKCksIHRoaXMuZygpKSB9XG4gIGdiKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmcoKSwgdGhpcy5iKCkpIH1cbiAgYmcoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmcoKSkgfVxuICBnYSgpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5nKCksIHRoaXMuYSgpKSB9XG4gIGFnKCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLmEoKSwgdGhpcy5nKCkpIH1cbiAgYmEoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMuYigpLCB0aGlzLmEoKSkgfVxuICBhYigpIHsgcmV0dXJuIG5ldyBWZWModGhpcy5hZCwgdGhpcy5hKCksIHRoaXMuYigpKSB9XG4gIHV2KCkgeyByZXR1cm4gbmV3IFZlYyh0aGlzLmFkLCB0aGlzLnUoKSwgdGhpcy52KCkpIH1cbiAgdnUoKSB7IHJldHVybiBuZXcgVmVjKHRoaXMuYWQsIHRoaXMudigpLCB0aGlzLnUoKSkgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgV2l0aFZlY0RlcGVuZGVuY2llcyBleHRlbmRzIFZlY3Rvck9wIHtcbiAgcHVibGljIGdldCB2ZWNEZXBlbmRzT24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kc09uIGFzIFZlY09wW11cbiAgfVxuXG4gIHB1YmxpYyBzaXplKCkge1xuICAgIHJldHVybiBNYXRoLm1pbiguLi50aGlzLnZlY0RlcGVuZHNPbi5tYXAoKHYpID0+IHYuc2l6ZSgpKSlcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmVjIGV4dGVuZHMgVmVjdG9yT3Age1xuICBwdWJsaWMgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmRlcGVuZHNPbi5sZW5ndGhcbiAgfVxuXG4gIHB1YmxpYyBvdmVycmlkZSBpbml0aWFsaXplcigpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLnVzZVRlbXBWYXIoKSkge1xuICAgICAgcmV0dXJuIGB2ZWMke3RoaXMuc2l6ZSgpfSAke3RoaXMucmVmKCl9PSR7dGhpcy5kZWZpbml0aW9uKCl9O1xcbmBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGRlcml2SW5pdGlhbGl6ZXIocGFyYW06IFBhcmFtKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy51c2VUZW1wVmFyKCkpIHtcbiAgICAgIHJldHVybiBgdmVjJHt0aGlzLnNpemUoKX0gJHt0aGlzLmRlcml2UmVmKHBhcmFtKX09JHt0aGlzLmRlcml2YXRpdmUocGFyYW0pfTtcXG5gXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJ1xuICAgIH1cbiAgfVxuXG4gIGRlZmluaXRpb24oKSB7XG4gICAgcmV0dXJuIGB2ZWMke3RoaXMuc2l6ZSgpfSgke3RoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcsJyl9KWBcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIHJldHVybiBgdmVjJHt0aGlzLnNpemUoKX0oJHt0aGlzLmRlcGVuZHNPbi5tYXAoKG9wKSA9PiBvcC5kZXJpdlJlZihwYXJhbSkpLmpvaW4oJywnKX0pYFxuICB9XG5cbiAgcHVibGljIHgoKSB7IHJldHVybiB0aGlzLmRlcGVuZHNPblswXSB9XG4gIHB1YmxpYyB5KCkgeyByZXR1cm4gdGhpcy5kZXBlbmRzT25bMV0gfVxuICBwdWJsaWMgeigpIHsgcmV0dXJuIHRoaXMuZGVwZW5kc09uWzJdIH1cbiAgcHVibGljIHcoKSB7IHJldHVybiB0aGlzLmRlcGVuZHNPblszXSB9XG59XG5cbmV4cG9ydCBjbGFzcyBWZWNQYXJhbSBleHRlbmRzIFZlY3Rvck9wIHtcbiAgcHJpdmF0ZSBuYW1lOiBzdHJpbmdcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyXG4gIHB1YmxpYyBzaXplKCkgeyByZXR1cm4gdGhpcy5fc2l6ZSB9XG5cbiAgY29uc3RydWN0b3IoYWQ6IEFEQmFzZSwgbmFtZTogc3RyaW5nLCBzaXplOiBudW1iZXIpIHtcbiAgICBzdXBlcihhZClcbiAgICB0aGlzLm5hbWUgPSBuYW1lXG4gICAgdGhpcy5fc2l6ZSA9IHNpemVcbiAgfVxuXG4gIEBDYWNoZVxuICBwdWJsaWMgeCgpOiBPcCB7IHJldHVybiBuZXcgVmVjUGFyYW1FbGVtZW50UmVmKHRoaXMuYWQsICd4JywgdGhpcykgfVxuXG4gIEBDYWNoZVxuICBwdWJsaWMgeSgpOiBPcCB7IHJldHVybiBuZXcgVmVjUGFyYW1FbGVtZW50UmVmKHRoaXMuYWQsICd5JywgdGhpcykgfVxuXG4gIEBDYWNoZVxuICBwdWJsaWMgeigpOiBPcCB7IHJldHVybiBuZXcgVmVjUGFyYW1FbGVtZW50UmVmKHRoaXMuYWQsICd6JywgdGhpcykgfVxuXG4gIEBDYWNoZVxuICBwdWJsaWMgdygpOiBPcCB7IHJldHVybiBuZXcgVmVjUGFyYW1FbGVtZW50UmVmKHRoaXMuYWQsICd3JywgdGhpcykgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbXMoKSB7XG4gICAgcmV0dXJuICd4eXp3J1xuICAgICAgLnNwbGl0KCcnKVxuICAgICAgLnNsaWNlKDAsIHRoaXMuc2l6ZSgpKVxuICAgICAgLm1hcCgoZWwpID0+IHRoaXMuZ2V0VmVjRWxlbWVudFJlZihlbCkpXG4gIH1cblxuICBkZWZpbml0aW9uKCkgeyByZXR1cm4gdGhpcy5uYW1lIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICByZXR1cm4gYHZlYyR7dGhpcy5zaXplKCl9KCR7dGhpcy5nZXRFbGVtcygpLm1hcCgoZWwpID0+IGVsLmRlcml2UmVmKHBhcmFtKSkuam9pbignLCcpfSlgXG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgaW5pdGlhbGl6ZXIoKSB7IHJldHVybiAnJyB9XG4gIHB1YmxpYyBvdmVycmlkZSByZWYoKSB7IHJldHVybiB0aGlzLmRlZmluaXRpb24oKSB9XG4gIHB1YmxpYyBvdmVycmlkZSBkZXJpdkluaXRpYWxpemVyKHBhcmFtOiBQYXJhbSkge1xuICAgIGlmICh0aGlzLnVzZVRlbXBWYXIoKSkge1xuICAgICAgcmV0dXJuIGB2ZWMke3RoaXMuc2l6ZSgpfSAke3RoaXMuZGVyaXZSZWYocGFyYW0pfT0ke3RoaXMuZGVyaXZhdGl2ZShwYXJhbSl9O1xcbmBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBXaXRoVmVjQmFzZTxUIGV4dGVuZHMgQURDb25zdHJ1Y3Rvcj4oQmFzZTogVCkge1xuICBjbGFzcyBBdXRvRGlmZiBleHRlbmRzIEJhc2Uge1xuICAgIHZlYzJQYXJhbShuYW1lOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjUGFyYW0odGhpcywgbmFtZSwgMilcbiAgICB9XG4gICAgdmVjM1BhcmFtKG5hbWU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIG5ldyBWZWNQYXJhbSh0aGlzLCBuYW1lLCAzKVxuICAgIH1cbiAgICB2ZWM0UGFyYW0obmFtZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gbmV3IFZlY1BhcmFtKHRoaXMsIG5hbWUsIDQpXG4gICAgfVxuICAgIHZlYzIoeDogSW5wdXQsIHk6IElucHV0KSB7XG4gICAgICByZXR1cm4gbmV3IFZlYyh0aGlzLCB0aGlzLmNvbnZlcnRWYWwoeCksIHRoaXMuY29udmVydFZhbCh5KSlcbiAgICB9XG4gICAgdmVjMyh4OiBJbnB1dCwgeTogSW5wdXQsIHo6IElucHV0KSB7XG4gICAgICByZXR1cm4gbmV3IFZlYyh0aGlzLCAuLi50aGlzLmNvbnZlcnRWYWxzKFt4LCB5LCB6XSkpXG4gICAgfVxuICAgIHZlYzQoeDogSW5wdXQsIHk6IElucHV0LCB6OiBJbnB1dCwgdzogSW5wdXQpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjKHRoaXMsIC4uLnRoaXMuY29udmVydFZhbHMoW3gsIHksIHosIHddKSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEF1dG9EaWZmXG59XG4iLCJpbXBvcnQgeyBJbnB1dCwgT3AsIFBhcmFtLCBBdXRvRGlmZiBhcyBBREJhc2UsIEFEQ29uc3RydWN0b3IgfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBWZWN0b3JPcCwgV2l0aFZlY0RlcGVuZGVuY2llcyB9IGZyb20gJy4vdmVjQmFzZSdcblxuZXhwb3J0IGNsYXNzIFZlY01peCBleHRlbmRzIFdpdGhWZWNEZXBlbmRlbmNpZXMge1xuICBkZWZpbml0aW9uKCkge1xuICAgIHJldHVybiBgbWl4KCR7dGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJywnKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3QgW2EsIGIsIG1peF0gPSB0aGlzLmRlcGVuZHNPblxuICAgIGNvbnN0IGFEZXJpdiA9IGAoMS4wLSR7YS5yZWYoKX0pKiR7bWl4LmRlcml2UmVmKHBhcmFtKX0rKC0ke2EuZGVyaXZSZWYocGFyYW0pfSkqJHttaXgucmVmKCl9YFxuICAgIGNvbnN0IGJEZXJpdiA9IGAke2IucmVmKCl9KiR7bWl4LmRlcml2UmVmKHBhcmFtKX0rJHtiLmRlcml2UmVmKHBhcmFtKX0qJHttaXgucmVmKCl9YFxuICAgIHJldHVybiBgJHthRGVyaXZ9KyR7YkRlcml2fWBcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmVjQ2xhbXAgZXh0ZW5kcyBXaXRoVmVjRGVwZW5kZW5jaWVzIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gYGNsYW1wKCR7dGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJywnKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgLy8gR2V0IGFuIGV4cHJlc3Npb24gZm9yIHRoZSBkZXJpdmF0aXZlIG9mIGp1c3Qgb25lIGVsZW1lbnQgaW4gdGhlIHZlY3RvclxuICAgIGNvbnN0IGVsZW1DbGFtcCA9ICh2LCBtaW4sIG1heCkgPT4gYCR7di5yZWYoKX08JHttaW4ucmVmKCl9ID8gMC4wIDogKCR7di5yZWYoKX0+JHttYXgucmVmKCl9ID8gMC4wIDogJHt2LmRlcml2UmVmKHBhcmFtKX0pYFxuXG4gICAgLy8gR2V0IHJlZnMgZm9yIGVhY2ggZWxlbWVudCBvZiBlYWNoIHBhcmFtZXRlclxuICAgIGNvbnN0IHRvUmVmcyA9ICh2ZWMpID0+ICd4eXp3Jy5zcGxpdCgnJykuc2xpY2UoMCwgdmVjLnNpemUoKSkubWFwKChlbCkgPT4gdmVjLmdldFZlY0VsZW1lbnRSZWYoZWwpKVxuICAgIGNvbnN0IFt2ZWNDLCB2ZWNNaW4sIHZlY01heF0gPSB0aGlzLnZlY0RlcGVuZHNPbi5tYXAodG9SZWZzKVxuXG4gICAgLy8gQ29uc3RydWN0IGEgdmVjdG9yIG91dCBvZiB0aGUgZWxlbWVudHdpc2UgZGVyaXZhdGl2ZXNcbiAgICBjb25zdCBpbm5lckRlZiA9IEFycmF5KHRoaXMuc2l6ZSgpKS5maWxsKDApLm1hcCgoXywgaSkgPT4gZWxlbUNsYW1wKHZlY0NbaV0sIHZlY01pbltpXSwgdmVjTWF4W2ldKSkuam9pbignLCcpXG4gICAgcmV0dXJuIGB2ZWMke3RoaXMuc2l6ZSgpfSgke2lubmVyRGVmfSlgXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZlY01pbiBleHRlbmRzIFdpdGhWZWNEZXBlbmRlbmNpZXMge1xuICBkZWZpbml0aW9uKCkge1xuICAgIHJldHVybiBgbWluKCR7dGhpcy5kZXBlbmRzT24ubWFwKChvcCkgPT4gb3AucmVmKCkpLmpvaW4oJywnKX0pYFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgLy8gR2V0IGFuIGV4cHJlc3Npb24gZm9yIHRoZSBkZXJpdmF0aXZlIG9mIGp1c3Qgb25lIGVsZW1lbnQgaW4gdGhlIHZlY3RvclxuICAgIGNvbnN0IGVsZW1NaW4gPSAoYSwgYikgPT4gYCR7YS5yZWYoKX08JHtiLnJlZigpfSA/ICR7YS5kZXJpdlJlZihwYXJhbSl9IDogJHtiLmRlcml2UmVmKHBhcmFtKX1gXG5cbiAgICAvLyBHZXQgcmVmcyBmb3IgZWFjaCBlbGVtZW50IG9mIGVhY2ggcGFyYW1ldGVyXG4gICAgY29uc3QgdG9SZWZzID0gKHZlYykgPT4gJ3h5encnLnNwbGl0KCcnKS5zbGljZSgwLCB2ZWMuc2l6ZSgpKS5tYXAoKGVsKSA9PiB2ZWMuZ2V0VmVjRWxlbWVudFJlZihlbCkpXG4gICAgY29uc3QgW3ZlY0EsIHZlY0JdID0gdGhpcy52ZWNEZXBlbmRzT24ubWFwKHRvUmVmcylcblxuICAgIC8vIENvbnN0cnVjdCBhIHZlY3RvciBvdXQgb2YgdGhlIGVsZW1lbnR3aXNlIGRlcml2YXRpdmVzXG4gICAgY29uc3QgaW5uZXJEZWYgPSBBcnJheSh0aGlzLnNpemUoKSkuZmlsbCgwKS5tYXAoKF8sIGkpID0+IGVsZW1NaW4odmVjQVtpXSwgdmVjQltpXSkpLmpvaW4oJywnKVxuICAgIHJldHVybiBgdmVjJHt0aGlzLnNpemUoKX0oJHtpbm5lckRlZn0pYFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWZWNNYXggZXh0ZW5kcyBXaXRoVmVjRGVwZW5kZW5jaWVzIHtcbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gYG1heCgke3RoaXMuZGVwZW5kc09uLm1hcCgob3ApID0+IG9wLnJlZigpKS5qb2luKCcsJyl9KWBcbiAgfVxuICBkZXJpdmF0aXZlKHBhcmFtOiBQYXJhbSkge1xuICAgIC8vIEdldCBhbiBleHByZXNzaW9uIGZvciB0aGUgZGVyaXZhdGl2ZSBvZiBqdXN0IG9uZSBlbGVtZW50IGluIHRoZSB2ZWN0b3JcbiAgICBjb25zdCBlbGVtTWF4ID0gKGEsIGIpID0+IGAke2EucmVmKCl9PiR7Yi5yZWYoKX0gPyAke2EuZGVyaXZSZWYocGFyYW0pfSA6ICR7Yi5kZXJpdlJlZihwYXJhbSl9YFxuXG4gICAgLy8gR2V0IHJlZnMgZm9yIGVhY2ggZWxlbWVudCBvZiBlYWNoIHBhcmFtZXRlclxuICAgIGNvbnN0IHRvUmVmcyA9ICh2ZWMpID0+ICd4eXp3Jy5zcGxpdCgnJykuc2xpY2UoMCwgdmVjLnNpemUoKSkubWFwKChlbCkgPT4gdmVjLmdldFZlY0VsZW1lbnRSZWYoZWwpKVxuICAgIGNvbnN0IFt2ZWNBLCB2ZWNCXSA9IHRoaXMudmVjRGVwZW5kc09uLm1hcCh0b1JlZnMpXG5cbiAgICAvLyBDb25zdHJ1Y3QgYSB2ZWN0b3Igb3V0IG9mIHRoZSBlbGVtZW50d2lzZSBkZXJpdmF0aXZlc1xuICAgIGNvbnN0IGlubmVyRGVmID0gQXJyYXkodGhpcy5zaXplKCkpLmZpbGwoMCkubWFwKChfLCBpKSA9PiBlbGVtTWF4KHZlY0FbaV0sIHZlY0JbaV0pKS5qb2luKCcsJylcbiAgICByZXR1cm4gYHZlYyR7dGhpcy5zaXplKCl9KCR7aW5uZXJEZWZ9KWBcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmVjSWZFbHNlIGV4dGVuZHMgV2l0aFZlY0RlcGVuZGVuY2llcyB7XG4gIG92ZXJyaWRlIHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMudmVjRGVwZW5kc09uWzFdLnNpemUoKVxuICB9XG4gIGRlZmluaXRpb24oKSB7XG4gICAgY29uc3QgW2NvbmRpdGlvbiwgdGhlbk9wLCBlbHNlT3BdID0gdGhpcy5kZXBlbmRzT25cbiAgICByZXR1cm4gYCR7Y29uZGl0aW9uLnJlZigpfT8ke3RoZW5PcC5yZWYoKX06JHtlbHNlT3AucmVmKCl9YFxuICB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3QgW2NvbmRpdGlvbiwgdGhlbk9wLCBlbHNlT3BdID0gdGhpcy5kZXBlbmRzT25cbiAgICByZXR1cm4gYCR7Y29uZGl0aW9uLnJlZigpfT8ke3RoZW5PcC5kZXJpdlJlZihwYXJhbSl9OiR7ZWxzZU9wLmRlcml2UmVmKHBhcmFtKX1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERvdCBleHRlbmRzIFdpdGhWZWNEZXBlbmRlbmNpZXMge1xuICBvdmVycmlkZSBzY2FsYXIoKSB7IHJldHVybiB0cnVlIH1cbiAgZGVmaW5pdGlvbigpIHtcbiAgICByZXR1cm4gYGRvdCgke3RoaXMuZGVwZW5kc09uLm1hcCgodikgPT4gdi5yZWYoKSkuam9pbignLCcpfSlgXG4gIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBjb25zdCBbZiwgZ10gPSB0aGlzLnZlY0RlcGVuZHNPblxuICAgIHJldHVybiAneHl6dydcbiAgICAgIC5zcGxpdCgnJylcbiAgICAgIC5zbGljZSgwLCB0aGlzLnNpemUoKSlcbiAgICAgIC5tYXAoKGVsKSA9PiBgJHtmLnJlZigpfS4ke2VsfSoke2cuZGVyaXZSZWYocGFyYW0pfS4ke2VsfSske2cucmVmKCl9LiR7ZWx9KiR7Zi5kZXJpdlJlZihwYXJhbSl9LiR7ZWx9YClcbiAgICAgIC5qb2luKCcrJylcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTGVuZ3RoIGV4dGVuZHMgV2l0aFZlY0RlcGVuZGVuY2llcyB7XG4gIG92ZXJyaWRlIHNjYWxhcigpIHsgcmV0dXJuIHRydWUgfVxuICBkZWZpbml0aW9uKCkgeyByZXR1cm4gYGxlbmd0aCgke3RoaXMuZGVwZW5kc09uWzBdLnJlZigpfSlgIH1cbiAgZGVyaXZhdGl2ZShwYXJhbTogUGFyYW0pIHtcbiAgICBjb25zdCBvdXRlckRlcml2ID0gYDAuNS9sZW5ndGgoJHt0aGlzLmRlcGVuZHNPblswXS5yZWYoKX0pYFxuICAgIGNvbnN0IGlubmVyRGVyaXYgPSAneHl6dydcbiAgICAgIC5zcGxpdCgnJylcbiAgICAgIC5zbGljZSgwLCB0aGlzLnNpemUoKSlcbiAgICAgIC5tYXAoKGVsKSA9PiBgMi4wKiR7dGhpcy5kZXBlbmRzT25bMF0ucmVmKCl9LiR7ZWx9KiR7dGhpcy5kZXBlbmRzT25bMF0uZGVyaXZSZWYocGFyYW0pfS4ke2VsfWApXG4gICAgICAuam9pbignKycpXG4gICAgcmV0dXJuIGAke291dGVyRGVyaXZ9KiR7aW5uZXJEZXJpdn1gXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERpc3QgZXh0ZW5kcyBXaXRoVmVjRGVwZW5kZW5jaWVzIHtcbiAgb3ZlcnJpZGUgc2NhbGFyKCkgeyByZXR1cm4gdHJ1ZSB9XG4gIGRlZmluaXRpb24oKSB7IHJldHVybiBgZGlzdGFuY2UoJHt0aGlzLmRlcGVuZHNPbi5tYXAoKHYpID0+IHYucmVmKCkpLmpvaW4oJywnKX0pYCB9XG4gIGRlcml2YXRpdmUocGFyYW06IFBhcmFtKSB7XG4gICAgY29uc3Qgb3V0ZXJEZXJpdiA9IGAwLjUvZGlzdGFuY2UoJHt0aGlzLmRlcGVuZHNPbi5tYXAoKHYpID0+IHYucmVmKCkpLmpvaW4oJywnKX0pYFxuICAgIGNvbnN0IGlubmVyRGVyaXYgPSAneHl6dydcbiAgICAgIC5zcGxpdCgnJylcbiAgICAgIC5zbGljZSgwLCB0aGlzLnNpemUoKSlcbiAgICAgIC5tYXAoKGVsKSA9PiB7XG4gICAgICAgIGNvbnN0IGRpZmYgPSB0aGlzLmRlcGVuZHNPbi5tYXAoKHYpID0+IHYucmVmKCkpLmpvaW4oJy0nKVxuICAgICAgICBjb25zdCBkZXJpdkRpZmYgPSB0aGlzLmRlcGVuZHNPbi5tYXAoKHYpID0+IHYuZGVyaXZSZWYocGFyYW0pKS5qb2luKCctJylcbiAgICAgICAgcmV0dXJuIGAyLjAqKCR7ZGlmZn0pLiR7ZWx9Kigke2Rlcml2RGlmZn0pLiR7ZWx9YFxuICAgICAgfSlcbiAgICAgIC5qb2luKCcrJylcbiAgICByZXR1cm4gYCR7b3V0ZXJEZXJpdn0qJHtpbm5lckRlcml2fWBcbiAgfVxufVxuXG5kZWNsYXJlIG1vZHVsZSAnLi92ZWNCYXNlJyB7XG4gIGludGVyZmFjZSBWZWN0b3JPcCB7XG4gICAgbWl4KG90aGVyOiBWZWN0b3JPcCwgYW10OiBJbnB1dCk6IFZlY3Rvck9wXG4gICAgY2xhbXAobWluOiBWZWN0b3JPcCwgbWF4OiBWZWN0b3JPcCk6IFZlY3Rvck9wXG4gICAgbWluKC4uLnBhcmFtczogVmVjdG9yT3BbXSk6IFZlY3Rvck9wXG4gICAgbWF4KC4uLnBhcmFtczogVmVjdG9yT3BbXSk6IFZlY3Rvck9wXG4gICAgZG90KG90aGVyOiBWZWN0b3JPcCk6IE9wXG4gICAgbGVuZ3RoKCk6IE9wXG4gICAgZGlzdChvdGhlcjogVmVjdG9yT3ApOiBPcFxuICB9XG59XG5kZWNsYXJlIG1vZHVsZSAnLi9iYXNlJyB7XG4gIGludGVyZmFjZSBPcCB7XG4gICAgdmVjSWZFbHNlKHRoZW5PcDogVmVjdG9yT3AsIGVsc2VPcDogVmVjdG9yT3ApOiBWZWN0b3JPcFxuICB9XG59XG5cblZlY3Rvck9wLnByb3RvdHlwZS5taXggPSBmdW5jdGlvbihvdGhlcjogVmVjdG9yT3AsIGFtdDogSW5wdXQpIHtcbiAgcmV0dXJuIG5ldyBWZWNNaXgodGhpcy5hZCwgdGhpcywgb3RoZXIsIHRoaXMuYWQuY29udmVydFZhbChhbXQpKVxufVxuVmVjdG9yT3AucHJvdG90eXBlLmNsYW1wID0gZnVuY3Rpb24obWluOiBWZWN0b3JPcCwgbWF4OiBWZWN0b3JPcCkge1xuICByZXR1cm4gbmV3IFZlY0NsYW1wKHRoaXMuYWQsIHRoaXMsIG1pbiwgbWF4KVxufVxuVmVjdG9yT3AucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uKC4uLnBhcmFtczogVmVjdG9yT3BbXSkge1xuICByZXR1cm4gcGFyYW1zLnJlZHVjZShcbiAgICAoYWNjLCBuZXh0KSA9PiBuZXcgVmVjTWluKHRoaXMuYWQsIGFjYywgbmV4dCksXG4gICAgdGhpcyxcbiAgKVxufVxuVmVjdG9yT3AucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uKC4uLnBhcmFtczogVmVjdG9yT3BbXSkge1xuICByZXR1cm4gcGFyYW1zLnJlZHVjZShcbiAgICAoYWNjLCBuZXh0KSA9PiBuZXcgVmVjTWF4KHRoaXMuYWQsIGFjYywgbmV4dCksXG4gICAgdGhpcyxcbiAgKVxufVxuVmVjdG9yT3AucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKG90aGVyOiBWZWN0b3JPcCkge1xuICByZXR1cm4gbmV3IERvdCh0aGlzLmFkLCB0aGlzLCBvdGhlcilcbn1cblZlY3Rvck9wLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBMZW5ndGgodGhpcy5hZCwgdGhpcylcbn1cblZlY3Rvck9wLnByb3RvdHlwZS5kaXN0ID0gZnVuY3Rpb24ob3RoZXI6IFZlY3Rvck9wKSB7XG4gIHJldHVybiBuZXcgRGlzdCh0aGlzLmFkLCB0aGlzLCBvdGhlcilcbn1cbk9wLnByb3RvdHlwZS52ZWNJZkVsc2UgPSBmdW5jdGlvbih0aGVuT3A6IFZlY3Rvck9wLCBlbHNlT3A6IFZlY3Rvck9wKSB7XG4gIHJldHVybiBuZXcgVmVjSWZFbHNlKHRoaXMuYWQsIHRoaXMsIHRoZW5PcCwgZWxzZU9wKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gV2l0aFZlY0Z1bmN0aW9uczxUIGV4dGVuZHMgQURDb25zdHJ1Y3Rvcj4oQmFzZTogVCkge1xuICBjbGFzcyBBdXRvRGlmZiBleHRlbmRzIEJhc2Uge1xuICAgIHZlY01peChhOiBWZWN0b3JPcCwgYjogVmVjdG9yT3AsIGFtdDogSW5wdXQpIHtcbiAgICAgIHJldHVybiBhLm1peChiLCBhbXQpXG4gICAgfVxuICAgIHZlY0NsYW1wKHZhbDogVmVjdG9yT3AsIG1pbjogVmVjdG9yT3AsIG1heDogVmVjdG9yT3ApIHtcbiAgICAgIHJldHVybiB2YWwuY2xhbXAobWluLCBtYXgpXG4gICAgfVxuICAgIHZlY01pbiguLi5wYXJhbXM6IFZlY3Rvck9wW10pIHtcbiAgICAgIGlmIChwYXJhbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gYXJndW1lbnRzIHBhc3NlZCB0byB2ZWNNaW4oKSFgKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhcmFtcy5yZWR1Y2UoKGFjYywgbmV4dCkgPT4gYWNjLm1pbihuZXh0KSlcbiAgICAgIH1cbiAgICB9XG4gICAgdmVjTWF4KC4uLnBhcmFtczogVmVjdG9yT3BbXSkge1xuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBhcmd1bWVudHMgcGFzc2VkIHRvIHZlY01heCgpIWApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGFyYW1zLnJlZHVjZSgoYWNjLCBuZXh0KSA9PiBhY2MubWF4KG5leHQpKVxuICAgICAgfVxuICAgIH1cbiAgICBkb3QoYTogVmVjdG9yT3AsIGI6IFZlY3Rvck9wKSB7XG4gICAgICByZXR1cm4gYS5kb3QoYilcbiAgICB9XG4gICAgbGVuZ3RoKHZhbDogVmVjdG9yT3ApIHtcbiAgICAgIHJldHVybiB2YWwubGVuZ3RoKClcbiAgICB9XG4gICAgZGlzdChhOiBWZWN0b3JPcCwgYjogVmVjdG9yT3ApIHtcbiAgICAgIHJldHVybiBhLmRpc3QoYilcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEF1dG9EaWZmXG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9pbmRleC50c1wiKTtcbiJdLCJzb3VyY2VSb290IjoiIn0=