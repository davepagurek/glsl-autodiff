import { round } from 'lodash'

abstract class Op {
  protected ad: AutoDiff
  public id: number
  public dependsOn: Op[]
  public usesdIn: Op[]
  public static key: string

  constructor(ad: AutoDiff, ...params: Op[]) {
    this.id = ad.getNextID()
    this.dependsOn = params
    for (const param of params) {
      param.usesdIn.push(this)
    }
  }

  public ref(): string {
    return `v${this.id}`
  }

  public derivRef(param: Param): string {
    return `dv${this.id}_d${param.name}`
  }

  public isConst(): boolean {
    return this.dependsOn.every((op) => op.isConst())
  }

  public abstract definition(): string
  public abstract derivative(param: Param): string
}

class Param extends Op {
  public name: string

  constructor(ad: AutoDiff, name: string) {
    super(ad)
    this.name = name
  }

  isConst() { return false }
  definition() { return '' } // unused
  derivative(param: Param) {
    if (param === this) {
      return '1'
    } else {
      return '0'
    }
  }
}

class Value extends Op {
  private val: number

  constructor(ad: AutoDiff, val: number) {
    super(ad)
    this.val = val
  }

  isConst() { return true }
  definition() { return `${round(this.val, 4)}` }
  derivative() { return '0' }
}

class Neg extends Op {
  definition() {
    return `-${this.dependsOn[0].ref()}`
  }
  derivative(param: Param) {
    return '-' + this.dependsOn[0].derivRef(param)
  }
}

class Sum extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('+')
  }
  derivative(param: Param) {
    return this.dependsOn.map((op) => op.derivRef(param)).join('+')
  }
}

class Mult extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('*')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`
  }
}

class Div extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('/')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    return `(${f.derivRef(param)}*${g.ref()}-${g.derivRef(param)}*${f.ref()})/(${g.ref()}*${g.ref()})`
  }
}

class Pow extends Op {
  definition() {
    return `pow(${this.dependsOn[0].ref()},${this.dependsOn[1].ref()})`
  }
  derivative(param: Param) {
    const [a, b] = this.dependsOn
    if (this.isConst()) {
      return `${b.ref()}*pow(${a.ref()},${b.ref()}-1)`
    } else {
      return `pow(${a.ref()},${b.ref()})*log(${a.ref()})*${b.derivRef(param)}`
    }
  }
}

class Sin extends Op {
  definition() {
    return `sin(${this.dependsOn[0].ref()})`
  }
  derivative(param: Param) {
    return `cos(${this.dependsOn[0].ref()})*${this.dependsOn[0].derivRef(param)}`
  }
}

type Input = Op | number
class AutoDiff {
  private nextID = 0
  public getNextID(): number {
    const id = this.nextID
    this.nextID++
    return id
  }

  private convertVals(params: Input[]): Op[] {
    return params.map((param) => {
      if (param instanceof Op) {
        return param
      } else {
        return this.val(param)
      }
    })
  }

  public val(n: number) { return new Value(this, n) }
  public sum(...params: Input[]) { return new Sum(this, ...this.convertVals(params)) }
  public sub(a: Input, b: Input) {
    const [opA, opB] = this.convertVals([a, b])
    return this.sum(opA, this.neg(opB))
  }
  public neg(v: Input) { return new Neg(this, this.convertVals([v])[0]) }
  public mult(...params: Input[]) {
    if (params.length === 2) {
      return new Mult(this, ...this.convertVals(params))
    } else if (params.length > 2) {
      return new Mult(this, this.convertVals(params.slice(0, 1))[0], this.mult(...params.slice(1)))
    } else {
      throw new Error(`mult() called with too few arguments: ${params}`)
    }
  }
  public div(a: Input, b: Input) {
    const [opA, opB] = this.convertVals([a, b])
    return new Div(this, opA, opB)
  }
  public pow(a: Input, b: Input) {
    const [opA, opB] = this.convertVals([a, b])
    return new Pow(this, opA, opB)
  }
  public sqrt(v: Input) { return new Pow(this, this.convertVals([v])[0], this.val(0.5)) }
  public e() { return this.val(Math.E) }
  public pi() { return this.val(Math.PI) }

  constructor() {}
}
