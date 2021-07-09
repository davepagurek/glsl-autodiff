import { Input, Op, Param, AutoDiff as ADBase, ADConstructor } from './base'

export class Neg extends Op {
  definition() {
    return `-${this.dependsOn[0].ref()}`
  }
  derivative(param: Param) {
    return '-' + this.dependsOn[0].derivRef(param)
  }
}

export class Sum extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('+')
  }
  derivative(param: Param) {
    return this.dependsOn.map((op) => op.derivRef(param)).join('+')
  }
}

export class Mult extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('*')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`
  }
}

export class Div extends Op {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('/')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    return `(${f.derivRef(param)}*${g.ref()}-${g.derivRef(param)}*${f.ref()})/(${g.ref()}*${g.ref()})`
  }
}

export class Pow extends Op {
  definition() {
    return `pow(${this.dependsOn[0].ref()},${this.dependsOn[1].ref()})`
  }
  derivative(param: Param) {
    const [a, b] = this.dependsOn
    if (b.isConst()) {
      return `${b.ref()}*pow(${a.ref()},${b.ref()}-1.0)`
    } else if (a.isConst()) {
      return `pow(${a.ref()},${b.ref()})*log(${a.ref()})*${b.derivRef(param)}`
    } else {
      // f = a^b
      // ln(f) = ln(a^b)                                   ln() both sides
      // ln(f) = b*ln(a)                                   logarithm rules
      // e^(lnf) = e^(b*ln(a))                             exp() both sides
      // f = e^(b*ln(a))                                   simplify
      // d/dx f = d/dx e^(b*ln(a))                         differentiate both sides
      // d/dx f = e^(b*ln(a)) * d/dx b*ln(a)               derivative of e^u
      // d/dx f = a^b * d/dx b*ln(a)                       exponential rules
      // d/dx f = a^b * (b*(1/a * da/dx) + ln(a)*(db/dx))  product rule
      //          t1         t2                 t3
      const t1 = `pow(${a.ref()},${b.ref()})`
      const t2 = `${b.ref()}*(1.0/${a.ref()}*${a.derivRef(param)})`
      const t3 = `log(${a.ref()})*${b.derivRef(param)}`
      return `${t1}*(${t2}+${t3})`
    }
  }
}

declare module './base' {
  interface Op {
    neg(): Op
    add(...params: Input[]): Op
    sub(val: Input): Op
    mult(...params: Input[]): Op
    div(param: Input): Op
    pow(param: Input): Op
    sqrt(): Op
  }
}

Op.prototype.neg = function() {
  return new Neg(this.ad, this)
}
Op.prototype.add = function(...params: Input[]) {
  if (params.length === 0) {
    throw new Error(`add() called with too few arguments: ${params}`)
  } else {
    return new Sum(this.ad, this, ...this.ad.convertVals(params))
  }
}
Op.prototype.sub = function(val: Input) {
  return this.add(this.ad.convertVal(val).neg())
}
Op.prototype.mult = function(...params: Input[]) {
  if (params.length === 0) {
    throw new Error(`mult() called with too few arguments: ${params}`)
  } else if (params.length === 1) {
    return new Mult(this.ad, this, this.ad.convertVal(params[0]))
  } else {
    return this.mult(params[0]).mult(...params.slice(1))
  }
}
Op.prototype.div = function(param: Input) {
  return new Div(this.ad, this, this.ad.convertVal(param))
}
Op.prototype.pow = function(param: Input) {
  return new Pow(this.ad, this, this.ad.convertVal(param))
}
Op.prototype.sqrt = function() { return this.pow(0.5) }

export function WithArithmetic<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    sum(...params: Input[]) {
      if (params.length === 0) {
        throw new Error(`sum() called with too few arguments: ${params}`)
      } else {
        const first = this.convertVal(params[0])
        if (params.length > 1) {
          return first.add(...params.slice(1))
        } else {
          return first
        }
      }
    }
    prod(...params: Input[]) {
      if (params.length === 0) {
        throw new Error(`prod() called with too few arguments: ${params}`)
      } else {
        const first = this.convertVal(params[0])
        if (params.length > 1) {
          return first.mult(...params.slice(1))
        } else {
          return first
        }
      }
    }
    sqrt(param: Input) {
      return this.convertVal(param).sqrt()
    }
  }
  return AutoDiff
}
