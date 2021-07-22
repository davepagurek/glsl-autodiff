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

  public derivRef(param: Param): string {
    if (this.useTempVar()) {
      return `_glslad_dv${this.id}_d${param.name}`
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
    if (this.useTempVar()) {
      return `${this.glslType()} ${this.derivRef(param)}=${this.derivative(param)};\n`
    } else {
      return ''
    }
  }

  public isConst(): boolean {
    return this.dependsOn.every((op) => op.isConst())
  }

  public deepDependencies(): Set<Op> {
    const deps = new Set<Op>()
    for (const op of this.dependsOn) {
      for (const dep of op.deepDependencies().values()) {
        deps.add(dep)
      }
      deps.add(op)
    }
    return deps
  }

  public output(name: string) { return this.ad.output(name, this) }
  public outputDeriv(name: string, param: Param | string) { return this.ad.outputDeriv(name, param, this) }

  public abstract definition(): string
  public abstract derivative(param: Param): string
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

  isConst() { return false }
  definition() { return this.name }
  derivative(param: Param) {
    if (param === this) {
      return '1.0'
    } else {
      return '0.0'
    }
  }
}
