export type Input = Op | number

export interface ADBase {
  getNextID(): number
  val(n: number): Value
  registerParam(param: Op, name: string)
  param(name: string): Param
  convertVal(param: Input): Op
  convertVals(params: Input[]): Op[]
  output(name: string, op: Op): ADBase
  outputDeriv(name: string, param: Param | string, op: Op): ADBase
  settings: ADSettings
}

export type ADSettings = {
  maxDepthPerVariable: number
  debug: boolean
}

export type ADConstructor = new (...args: any[]) => ADBase

// https://stackoverflow.com/a/27074218
export const getStack = () => {
  const e = new Error()
  if (!e.stack) try {
    // IE requires the Error to actually be throw or else the Error's 'stack'
    // property is undefined.
    throw e
  } catch (e) {
    if (!e.stack) {
      return [] // IE < 10, likely
    }
  }
  const frameRE = /:(\d+):(?:\d+)[^\d]*$/
  const stack = e.stack?.toString().split(/\r\n|\n/).filter((line) => line.match(frameRE)) ?? []
  return stack
}

// If we know a function will be called directly by the user, wrap it with
// this so we can add extra debug info
export function UserInput<T extends (...args: any[]) => Op>(fn: T): T {
  return function(...args: any[]) {
    const op = fn.apply(this, args)

    if (op.ad.settings.debug) {
      const stack = getStack()
      op.srcLine = stack[2] ?? ''
    }
    return op
  } as T
}

export abstract class Op {
  public ad: ADBase
  public id: number
  public dependsOn: Op[]
  public usedIn: Op[] = []
  public srcLine: string = ''
  public internalDerivatives: { op: Op, param: Param }[] = []

  constructor(ad: ADBase, ...params: Op[]) {
    this.ad = ad
    this.id = ad.getNextID()
    this.dependsOn = params
    for (const param of params) {
      param.usedIn.push(this)
    }
  }

  public scalar() { return true }

  public size() { return 1 }

  public glslType() {
    if (this.scalar()) {
      return 'float'
    } else {
      return `vec${this.size()}`
    }
  }

  public depth() {
    // Force usage of a temp variable if used in multiple spots
    if (this.usedIn.length > 1) return 1

    const depDepth = Math.max(0, ...this.dependsOn.map((op) => op.depth()))
    const depth = depDepth + 1

    if (depth > this.ad.settings.maxDepthPerVariable) {
      return 1
    } else {
      return depth
    }
  }

  public useTempVar() {
    return this.depth() === 1
  }

  public ref(): string {
    if (this.useTempVar()) {
      return `_glslad_v${this.id}`
    } else {
      return `(${this.definition()})`
    }
  }

  public zeroDerivative() {
    return '0.0'
  }

  public derivRef(param: Param): string {
    if (this.isConst(param)) {
      return this.zeroDerivative()
    } else if (this.useTempVar()) {
      return `_glslad_dv${this.id}_d${param.safeName()}`
    } else {
      return `(${this.derivative(param)})`
    }
  }

  public initializer(): string {
    if (this.useTempVar()) {
      let line = `${this.glslType()} ${this.ref()}=${this.definition()};`
      if (this.ad.settings.debug && this.srcLine) {
        line = `\n// From ${this.srcLine}\n` + line
      }
      line += '\n'
      return line
    } else {
      return ''
    }
  }

  public derivInitializer(param: Param): string {
    if (this.isConst(param) || !this.useTempVar()) {
      return ''
    } else {
      return `${this.glslType()} ${this.derivRef(param)}=${this.derivative(param)};\n`
    }
  }

  public isConst(param?: Param): boolean {
    return this.dependsOn.every((op) => op.isConst(param))
  }

  public outputDependencies({ deps, derivDeps }: { deps: Set<Op>; derivDeps: Map<Param, Set<Op>> }): string {
    let code = ''
    for (const op of this.dependsOn) {
      if (!deps.has(op)) {
        deps.add(op)
        code += op.outputDependencies({ deps, derivDeps })
        code += op.initializer()
      }
    }

    for (const { param, op } of this.internalDerivatives) {
      if (!derivDeps.get(param)?.has(op)) {
        const paramDerivDeps = derivDeps.get(param) ?? new Set<Op>()
        paramDerivDeps.add(op)
        derivDeps.set(param, paramDerivDeps)
        code += op.outputDerivDependencies(param, { deps, derivDeps })
        code += op.derivInitializer(param)
      }
    }
    
    return code
  }

  public outputDerivDependencies(param: Param, { deps, derivDeps }: { deps: Set<Op>; derivDeps: Map<Param, Set<Op>> }): string {
    if (this.isConst()) return ''
    let code = ''
    for (const op of this.dependsOn) {
      if (!deps.has(op)) {
        deps.add(op)
        code += op.outputDependencies({ deps, derivDeps })
        code += op.initializer()
      }

      if (!derivDeps.get(param)?.has(op) && !op.isConst(param)) {
        const paramDerivDeps = derivDeps.get(param) ?? new Set<Op>()
        paramDerivDeps.add(op)
        derivDeps.set(param, paramDerivDeps)
        code += op.outputDerivDependencies(param, { deps, derivDeps })
        code += op.derivInitializer(param)
      }
    }

    for (const { param, op } of this.internalDerivatives) {
      if (!derivDeps.get(param)?.has(op)) {
        const paramDerivDeps = derivDeps.get(param) ?? new Set<Op>()
        paramDerivDeps.add(op)
        derivDeps.set(param, paramDerivDeps)
        code += op.outputDependencies({ deps, derivDeps })
        code += op.derivInitializer(param)
      }
    }
    
    return code
  }

  public output(name: string) { return this.ad.output(name, this) }
  public outputDeriv(name: string, param: Param | string) { return this.ad.outputDeriv(name, param, this) }

  public abstract definition(): string
  public abstract derivative(param: Param): string
}

export abstract class BooleanOp extends Op {
  abstract operator(): string
  definition() {
    return this.dependsOn.map((op) => op.ref()).join(this.operator())
  }
  derivative(): string {
    throw new Error('unimplemented')
  }
  isConst() {
    // They might not actually be constant, but we don't have derivatives
    // for these so we just treat them like they are
    return true;
  }
  glslType() {
    return 'bool'
  }
}

export class EqOp extends BooleanOp {
  operator() {
    return '=='
  }
}

export class NeOp extends BooleanOp {
  operator() {
    return '!='
  }
}

export class LtOp extends BooleanOp {
  operator() {
    return '<'
  }
}

export class LeOp extends BooleanOp {
  operator() {
    return '<='
  }
}

export class GtOp extends BooleanOp {
  operator() {
    return '>'
  }
}

export class GeOp extends BooleanOp {
  operator() {
    return '>='
  }
}

export class NotOp extends BooleanOp {
  operator() {
    return '!'
  }
  definition() {
    return this.operator() + this.dependsOn[0].ref()
  }
}

export class AndOp extends BooleanOp {
  operator() {
    return '&&'
  }
}

export class OrOp extends BooleanOp {
  operator() {
    return '||'
  }
}

export abstract class OpLiteral extends Op {
  public override initializer() { return '' }
  public override derivInitializer() { return '' }
  public override ref() { return this.definition() }
  public override derivRef(param: Param) { return this.derivative(param) }
}

export class Value extends OpLiteral {
  private val: number

  constructor(ad: ADBase, val: number) {
    super(ad)
    this.val = val
  }

  isConst() { return true }
  definition() { 
    const str = `${this.val.toFixed(4)}`
    return this.val < 0 ? `(${str})` : str
  }
  derivative() { return '0.0' }
}

export class Param extends OpLiteral {
  public name: string

  constructor(ad: ADBase, name: string, ...dependsOn: Op[]) {
    super(ad, ...dependsOn)
    this.name = name
    this.ad.registerParam(this, name)
  }

  safeName() {
    // A version of the name that can be used in temp variable
    // names
    return this.name.split('').map((c) => {
      if (c.match(/[\w\d]/)) {
        return c
      } else {
        return '_'
      }
    }).join('') + this.id // Add id to ensure uniqueness
  }

  isConst(param?: Param) {
    if (param) {
      return param !== this
    } else {
      return false
    }
  }
  definition() { return this.name }
  derivative(param: Param) {
    if (param === this) {
      return '1.0'
    } else {
      return '0.0'
    }
  }
}
