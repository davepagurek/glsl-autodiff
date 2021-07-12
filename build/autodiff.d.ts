
export declare class Neg extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Sum extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Mult extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Div extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Pow extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export     interface Op {
        neg(): Op;
        add(...params: Input[]): Op;
        sub(val: Input): Op;
        mult(...params: Input[]): Op;
        div(param: Input): Op;
        pow(param: Input): Op;
        sqrt(): Op;
    
}
export declare function WithArithmetic<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        sum(...params: Input[]): Op;
        prod(...params: Input[]): Op;
        sqrt(param: Input): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;
export declare type Input = Op | number;
export interface ADBase {
    getNextID(): number;
    val(n: number): Value;
    registerParam(param: Op, name: string): any;
    param(name: string): Param;
    convertVal(param: Input): Op;
    convertVals(params: Input[]): Op[];
    output(name: string, op: Op): ADBase;
    outputDeriv(name: string, param: Param | string, op: Op): ADBase;
}
export declare type ADConstructor = new (...args: any[]) => ADBase;
export declare const lineNumber: () => string;
export declare function RecordLine<T extends (...args: any[]) => Op>(fn: T): T;
export declare abstract class Op {
    protected ad: ADBase;
    id: number;
    dependsOn: Op[];
    usedIn: Op[];
    srcLine: string;
    constructor(ad: ADBase, ...params: Op[]);
    scalar(): boolean;
    useTempVar(): boolean;
    ref(): string;
    derivRef(param: Param): string;
    initializer(): string;
    derivInitializer(param: Param): string;
    isConst(): boolean;
    deepDependencies(): Set<Op>;
    output(name: string): ADBase;
    outputDeriv(name: string, param: Param | string): ADBase;
    abstract definition(): string;
    abstract derivative(param: Param): string;
}
export declare abstract class OpLiteral extends Op {
    initializer(): string;
    derivInitializer(): string;
    ref(): string;
    derivRef(param: Param): string;
}
export declare class Value extends OpLiteral {
    private val;
    constructor(ad: ADBase, val: number);
    isConst(): boolean;
    definition(): string;
    derivative(): string;
}
export declare class Param extends OpLiteral {
    name: string;
    constructor(ad: ADBase, name: string);
    isConst(): boolean;
    definition(): string;
    derivative(param: Param): "0.0" | "1.0";
}

export declare class Sin extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Cos extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Mix extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Clamp extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Min extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class Max extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export declare class IfElse extends Op {
    definition(): string;
    derivative(param: Param): string;
}
export     interface Op {
        sin(): Op;
        cos(): Op;
        tan(): Op;
        mix(b: Input, amt: Input): Op;
        clamp(min: Input, max: Input): Op;
        min(...params: Input[]): Op;
        max(...params: Input[]): Op;
        ifElse(thenOp: Input, elseOp: Input): Op;
    
}
export declare function WithFunctions<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        sin(input: Input): Op;
        cos(input: Input): Op;
        tan(input: Input): Op;
        mix(a: Input, b: Input, amt: Input): Op;
        clamp(val: Input, min: Input, max: Input): Op;
        min(...params: Input[]): Op;
        max(...params: Input[]): Op;
        ifElse(ifOp: Input, thenOp: Input, elseOp: Input): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;

declare class AutoDiffImpl implements ADBase {
    protected nextID: number;
    getNextID(): number;
    protected params: {
        [key: string]: Param;
    };
    protected outputs: {
        [key: string]: Op;
    };
    protected derivOutputs: {
        [param: string]: {
            [key: string]: Op;
        };
    };
    val(n: number): any;
    registerParam(param: any, name: any): void;
    param(name: string): Param;
    convertVal(param: Input): Op;
    convertVals(params: Input[]): Op[];
    output(name: string, op: Op): this;
    outputDeriv(name: string, param: Param | string, op: Op): this;
    gen(): string;
}
declare const ExtendedAD: {
    new (...args: any[]): {
        vecMix(a: VectorOp, b: VectorOp, amt: Input): VectorOp;
        vecClamp(val: VectorOp, min: VectorOp, max: VectorOp): VectorOp;
        vecMin(...params: VectorOp[]): VectorOp;
        vecMax(...params: VectorOp[]): VectorOp;
        dot(a: VectorOp, b: VectorOp): Op;
        length(val: VectorOp): Op;
        dist(a: VectorOp, b: VectorOp): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & {
    new (...args: any[]): {
        vecSum(...params: VectorOp[]): VectorOp;
        vecProd(...params: VectorOp[]): VectorOp;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & {
    new (...args: any[]): {
        vec2Param(name: string): VecParam;
        vec3Param(name: string): VecParam;
        vec4Param(name: string): VecParam;
        vec2(x: Input, y: Input): Vec;
        vec3(x: Input, y: Input, z: Input): Vec;
        vec4(x: Input, y: Input, z: Input, w: Input): Vec;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & {
    new (...args: any[]): {
        sin(input: Input): Op;
        cos(input: Input): Op;
        tan(input: Input): Op;
        mix(a: Input, b: Input, amt: Input): Op;
        clamp(val: Input, min: Input, max: Input): Op;
        min(...params: Input[]): Op;
        max(...params: Input[]): Op;
        ifElse(ifOp: Input, thenOp: Input, elseOp: Input): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & {
    new (...args: any[]): {
        sum(...params: Input[]): Op;
        prod(...params: Input[]): Op;
        sqrt(param: Input): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & typeof AutoDiffImpl;
declare type GetType<T> = T extends new (...args: any[]) => infer V ? V : never;
declare type AD = GetType<typeof ExtendedAD>;
export declare const gen: (cb: (ad: AD) => void) => string;
export {};


export declare class VecNeg extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecSum extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecScale extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecMult extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export     interface VectorOp {
        neg(): VectorOp;
        add(...params: VectorOp[]): VectorOp;
        scale(k: Input): VectorOp;
        mult(...params: VectorOp[]): VectorOp;
    
}
export declare function WithVecArithmetic<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        vecSum(...params: VectorOp[]): VectorOp;
        vecProd(...params: VectorOp[]): VectorOp;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;

export interface VecOp extends Op {
    x(): Op;
    y(): Op;
    z(): Op;
    w(): Op;
    definition(): string;
    derivative(param: Param): string;
    size(): number;
}
export declare class VecElementRef extends Op {
    prop: string;
    constructor(ad: ADBase, prop: string, vec: VecOp);
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecParamElementRef extends OpLiteral {
    prop: string;
    name: string;
    constructor(ad: ADBase, prop: string, vec: VecOp);
    definition(): string;
    derivative(param: Param): "0.0" | "1.0";
}
export declare function Cache(target: Object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare abstract class VectorOp extends Op {
    scalar(): boolean;
    abstract size(): number;
    initializer(): string;
    derivInitializer(param: Param): string;
    x(): Op;
    y(): Op;
    z(): Op;
    w(): Op;
    getVecElementRef(el: string): Op;
    u(): Op;
    v(): Op;
    r(): Op;
    g(): Op;
    b(): Op;
    a(): Op;
    xyzw(): Vec;
    xywz(): Vec;
    xzyw(): Vec;
    xzwy(): Vec;
    xwyz(): Vec;
    xwzy(): Vec;
    yxzw(): Vec;
    yxwz(): Vec;
    yzxw(): Vec;
    yzwx(): Vec;
    ywxz(): Vec;
    ywzx(): Vec;
    zxyw(): Vec;
    zxwy(): Vec;
    zyxw(): Vec;
    zywx(): Vec;
    zwxy(): Vec;
    zwyx(): Vec;
    wxyz(): Vec;
    wxzy(): Vec;
    wyxz(): Vec;
    wyzx(): Vec;
    wzxy(): Vec;
    wzyx(): Vec;
    xyz(): Vec;
    xzy(): Vec;
    yxz(): Vec;
    yzx(): Vec;
    zxy(): Vec;
    zyx(): Vec;
    xyw(): Vec;
    xwy(): Vec;
    yxw(): Vec;
    ywx(): Vec;
    wxy(): Vec;
    wyx(): Vec;
    xy(): Vec;
    yx(): Vec;
    xzw(): Vec;
    xwz(): Vec;
    zxw(): Vec;
    zwx(): Vec;
    wxz(): Vec;
    wzx(): Vec;
    xz(): Vec;
    zx(): Vec;
    xw(): Vec;
    wx(): Vec;
    yzw(): Vec;
    ywz(): Vec;
    zyw(): Vec;
    zwy(): Vec;
    wyz(): Vec;
    wzy(): Vec;
    yz(): Vec;
    zy(): Vec;
    yw(): Vec;
    wy(): Vec;
    zw(): Vec;
    wz(): Vec;
    rgba(): Vec;
    rgab(): Vec;
    rbga(): Vec;
    rbag(): Vec;
    ragb(): Vec;
    rabg(): Vec;
    grba(): Vec;
    grab(): Vec;
    gbra(): Vec;
    gbar(): Vec;
    garb(): Vec;
    gabr(): Vec;
    brga(): Vec;
    brag(): Vec;
    bgra(): Vec;
    bgar(): Vec;
    barg(): Vec;
    bagr(): Vec;
    argb(): Vec;
    arbg(): Vec;
    agrb(): Vec;
    agbr(): Vec;
    abrg(): Vec;
    abgr(): Vec;
    rgb(): Vec;
    rbg(): Vec;
    grb(): Vec;
    gbr(): Vec;
    brg(): Vec;
    bgr(): Vec;
    rga(): Vec;
    rag(): Vec;
    gra(): Vec;
    gar(): Vec;
    arg(): Vec;
    agr(): Vec;
    rg(): Vec;
    gr(): Vec;
    rba(): Vec;
    rab(): Vec;
    bra(): Vec;
    bar(): Vec;
    arb(): Vec;
    abr(): Vec;
    rb(): Vec;
    br(): Vec;
    ra(): Vec;
    ar(): Vec;
    gba(): Vec;
    gab(): Vec;
    bga(): Vec;
    bag(): Vec;
    agb(): Vec;
    abg(): Vec;
    gb(): Vec;
    bg(): Vec;
    ga(): Vec;
    ag(): Vec;
    ba(): Vec;
    ab(): Vec;
    uv(): Vec;
    vu(): Vec;
}
export declare abstract class WithVecDependencies extends VectorOp {
    get vecDependsOn(): VecOp[];
    size(): number;
}
export declare class Vec extends VectorOp {
    size(): number;
    definition(): string;
    derivative(param: Param): string;
    x(): Op;
    y(): Op;
    z(): Op;
    w(): Op;
}
export declare class VecParam extends VectorOp {
    private name;
    private _size;
    size(): number;
    constructor(ad: ADBase, name: string, size: number);
    x(): Op;
    y(): Op;
    z(): Op;
    w(): Op;
    private getElems;
    definition(): string;
    derivative(param: Param): string;
    initializer(): string;
    ref(): string;
    derivInitializer(param: Param): string;
}
export declare function WithVecBase<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        vec2Param(name: string): VecParam;
        vec3Param(name: string): VecParam;
        vec4Param(name: string): VecParam;
        vec2(x: Input, y: Input): Vec;
        vec3(x: Input, y: Input, z: Input): Vec;
        vec4(x: Input, y: Input, z: Input, w: Input): Vec;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;


export declare class VecMix extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecClamp extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecMin extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecMax extends WithVecDependencies {
    definition(): string;
    derivative(param: Param): string;
}
export declare class VecIfElse extends WithVecDependencies {
    size(): number;
    definition(): string;
    derivative(param: Param): string;
}
export declare class Dot extends WithVecDependencies {
    scalar(): boolean;
    definition(): string;
    derivative(param: Param): string;
}
export declare class Length extends WithVecDependencies {
    scalar(): boolean;
    definition(): string;
    derivative(param: Param): string;
}
export declare class Dist extends WithVecDependencies {
    scalar(): boolean;
    definition(): string;
    derivative(param: Param): string;
}
export     interface VectorOp {
        mix(other: VectorOp, amt: Input): VectorOp;
        clamp(min: VectorOp, max: VectorOp): VectorOp;
        min(...params: VectorOp[]): VectorOp;
        max(...params: VectorOp[]): VectorOp;
        dot(other: VectorOp): Op;
        length(): Op;
        dist(other: VectorOp): Op;
    
}
export     interface Op {
        vecIfElse(thenOp: VectorOp, elseOp: VectorOp): VectorOp;
    
}
export declare function WithVecFunctions<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        vecMix(a: VectorOp, b: VectorOp, amt: Input): VectorOp;
        vecClamp(val: VectorOp, min: VectorOp, max: VectorOp): VectorOp;
        vecMin(...params: VectorOp[]): VectorOp;
        vecMax(...params: VectorOp[]): VectorOp;
        dot(a: VectorOp, b: VectorOp): Op;
        length(val: VectorOp): Op;
        dist(a: VectorOp, b: VectorOp): Op;
        getNextID(): number;
        val(n: number): Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;
