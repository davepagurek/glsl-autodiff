import { Input, Param, Op, Value, ADBase } from './base';
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
        vecMix(a: import("./vecBase").VectorOp, b: import("./vecBase").VectorOp, amt: Input): import("./vecBase").VectorOp;
        vecClamp(val: import("./vecBase").VectorOp, min: import("./vecBase").VectorOp, max: import("./vecBase").VectorOp): import("./vecBase").VectorOp;
        vecMin(...params: import("./vecBase").VectorOp[]): import("./vecBase").VectorOp;
        vecMax(...params: import("./vecBase").VectorOp[]): import("./vecBase").VectorOp;
        dot(a: import("./vecBase").VectorOp, b: import("./vecBase").VectorOp): Op;
        length(val: import("./vecBase").VectorOp): Op;
        dist(a: import("./vecBase").VectorOp, b: import("./vecBase").VectorOp): Op;
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
        vecSum(...params: import("./vecBase").VectorOp[]): import("./vecBase").VectorOp;
        vecProd(...params: import("./vecBase").VectorOp[]): import("./vecBase").VectorOp;
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
        vec2Param(name: string): import("./vecBase").VecParam;
        vec3Param(name: string): import("./vecBase").VecParam;
        vec4Param(name: string): import("./vecBase").VecParam;
        vec2(x: Input, y: Input): import("./vecBase").Vec;
        vec3(x: Input, y: Input, z: Input): import("./vecBase").Vec;
        vec4(x: Input, y: Input, z: Input, w: Input): import("./vecBase").Vec;
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
