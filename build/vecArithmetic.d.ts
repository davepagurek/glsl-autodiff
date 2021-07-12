import { Input, Param, ADBase, ADConstructor } from './base';
import { VectorOp, WithVecDependencies } from './vecBase';
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
declare module './vecBase' {
    interface VectorOp {
        neg(): VectorOp;
        add(...params: VectorOp[]): VectorOp;
        scale(k: Input): VectorOp;
        mult(...params: VectorOp[]): VectorOp;
    }
}
export declare function WithVecArithmetic<T extends ADConstructor>(Base: T): {
    new (...args: any[]): {
        vecSum(...params: VectorOp[]): VectorOp;
        vecProd(...params: VectorOp[]): VectorOp;
        getNextID(): number;
        val(n: number): import("./base").Value;
        registerParam(param: import("./base").Op, name: string): any;
        param(name: string): Param;
        convertVal(param: Input): import("./base").Op;
        convertVals(params: Input[]): import("./base").Op[];
        output(name: string, op: import("./base").Op): ADBase;
        outputDeriv(name: string, param: string | Param, op: import("./base").Op): ADBase;
    };
} & T;
