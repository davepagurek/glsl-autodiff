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
