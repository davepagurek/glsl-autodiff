import { Input, Op, Param, ADBase, ADConstructor } from './base';
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
declare module './base' {
    interface Op {
        neg(): Op;
        add(...params: Input[]): Op;
        sub(val: Input): Op;
        mult(...params: Input[]): Op;
        div(param: Input): Op;
        pow(param: Input): Op;
        sqrt(): Op;
    }
}
export declare function WithArithmetic<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        sum(...params: Input[]): Op;
        prod(...params: Input[]): Op;
        sqrt(param: Input): Op;
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
