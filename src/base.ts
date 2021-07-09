export type Input = Op | number

export interface AutoDiff {
  getNextID(): number
  val(n: number): Value
  registerParam(param: Param, name: string)
  param(name: string): Param
  convertVal(param: Input): Op
  convertVals(params: Input[]): Op[]
  output(name: string, op: Op): AutoDiff
  outputDeriv(name: string, param: Param | string, op: Op): AutoDiff
}

export type ADConstructor = new (...args: any[]) => AutoDiff

export abstract class Op {
  protected ad: AutoDiff
  public id: number
  public dependsOn: Op[]
  public usedIn: Op[] = []

  constructor(ad: AutoDiff, ...params: Op[]) {
    this.ad = ad
    this.id = ad.getNextID()
    this.dependsOn = params
    for (const param of params) {
      param.usedIn.push(this)
    }
  }

  public scalar() { return true }

  public ref(): string {
    if (this.usedIn.length > 1) {
      return `_glslad_v${this.id}`
    } else {
      return `(${this.definition()})`
    }
  }

  public derivRef(param: Param): string {
    if (this.usedIn.length > 1) {
      return `_glslad_dv${this.id}_d${param.name}`
    } else {
      return `(${this.derivative(param)})`
    }
  }

  public initializer(): string {
    if (this.usedIn.length > 1) {
      return `float ${this.ref()}=${this.definition()};\n`
    } else {
      return ''
    }
  }

  public derivInitializer(param: Param): string {
    if (this.usedIn.length > 1) {
      return `float ${this.derivRef(param)}=${this.derivative(param)};\n`
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

  constructor(ad: AutoDiff, val: number) {
    super(ad)
    this.val = val
  }

  isConst() { return true }
  definition() { return `${this.val.toFixed(4)}` }
  derivative() { return '0.0' }
}

export class Param extends OpLiteral {
  public name: string

  constructor(ad: AutoDiff, name: string) {
    super(ad)
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
