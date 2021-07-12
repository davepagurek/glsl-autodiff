import { Input, Op, Param, ADBase, ADConstructor } from './base';
import { VectorOp, WithVecDependencies } from './vecBase';
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
declare module './vecBase' {
    interface VectorOp {
        mix(other: VectorOp, amt: Input): VectorOp;
        clamp(min: VectorOp, max: VectorOp): VectorOp;
        min(...params: VectorOp[]): VectorOp;
        max(...params: VectorOp[]): VectorOp;
        dot(other: VectorOp): Op;
        length(): Op;
        dist(other: VectorOp): Op;
    }
}
declare module './base' {
    interface Op {
        vecIfElse(thenOp: VectorOp, elseOp: VectorOp): VectorOp;
    }
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
        val(n: number): import("./base").Value;
        registerParam(param: Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): Op;
        convertVals(params: Input[]): Op[];
        output(name: string, op: Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: Op): ADBase;
    };
} & T;
