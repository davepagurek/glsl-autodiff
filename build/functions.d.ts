import { Input, Op, Param, ADBase, ADConstructor } from './base';
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
declare module './base' {
    interface Op {
        sin(): Op;
        cos(): Op;
        tan(): Op;
        mix(b: Input, amt: Input): Op;
        clamp(min: Input, max: Input): Op;
        min(...params: Input[]): Op;
        max(...params: Input[]): Op;
        ifElse(thenOp: Input, elseOp: Input): Op;
    }
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
        val(n: number): import("./base").Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;
