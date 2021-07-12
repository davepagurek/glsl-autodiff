import { Input, Op, Param, ADBase, ADConstructor } from './base'

export class Sin extends Op {
  definition() {
    return `sin(${this.dependsOn[0].ref()})`
  }
  derivative(param: Param) {
    return `cos(${this.dependsOn[0].ref()})*${this.dependsOn[0].derivRef(param)}`
  }
}

export class Cos extends Op {
  definition() {
    return `cos(${this.dependsOn[0].ref()})`
  }
  derivative(param: Param) {
    return `-sin(${this.dependsOn[0].ref()})*${this.dependsOn[0].derivRef(param)}`
  }
}

export class Mix extends Op {
  definition() {
    return `mix(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    const [a, b, mix] = this.dependsOn
    const aDeriv = `(1.0-${a.ref()})*${mix.derivRef(param)}+(-${a.derivRef(param)})*${mix.ref()}`
    const bDeriv = `${b.ref()}*${mix.derivRef(param)}+${b.derivRef(param)}*${mix.ref()}`
    return `${aDeriv}+${bDeriv}`
  }
}

export class Clamp extends Op {
  definition() {
    return `clamp(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    const [v, min, max] = this.dependsOn
    return `${v.ref()}<${min.ref()} ? 0.0 : (${v.ref()}>${max.ref()} ? 0.0 : ${v.derivRef(param)})`
  }
}

export class Min extends Op {
  definition() {
    return `min(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    const [a, b] = this.dependsOn
    return `${a.ref()}<${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`
  }
}

export class Max extends Op {
  definition() {
    return `max(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    const [a, b] = this.dependsOn
    return `${a.ref()}>${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`
  }
}

export class IfElse extends Op {
  definition() {
    const [condition, thenOp, elseOp] = this.dependsOn
    return `${condition.ref()}?${thenOp.ref()}:${elseOp.ref()}`
  }
  derivative(param: Param) {
    const [condition, thenOp, elseOp] = this.dependsOn
    return `${condition.ref()}?${thenOp.derivRef(param)}:${elseOp.derivRef(param)}`
  }
}

declare module './base' {
  interface Op {
    sin(): Op
    cos(): Op
    tan(): Op
    mix(b: Input, amt: Input): Op
    clamp(min: Input, max: Input): Op
    min(...params: Input[]): Op
    max(...params: Input[]): Op
    ifElse(thenOp: Input, elseOp: Input): Op
  }
}

Op.prototype.sin = function() {
  return new Sin(this.ad, this)
}
Op.prototype.cos = function() {
  return new Cos(this.ad, this)
}
Op.prototype.tan = function() {
  // TODO make this its own class to optimize it
  return this.sin().div(this.cos())
}
Op.prototype.mix = function(b: Input, amt: Input) {
  return new Mix(this.ad, this, this.ad.convertVal(b), this.ad.convertVal(amt))
}
Op.prototype.clamp = function(min: Input, max: Input) {
  return new Clamp(this.ad, this, this.ad.convertVal(min), this.ad.convertVal(max))
}
Op.prototype.min = function(...params: Input[]) {
  return params.reduce(
    (acc, next) => new Min(this.ad, acc, this.ad.convertVal(next)),
    this,
  )
}
Op.prototype.max = function(...params: Input[]) {
  return params.reduce(
    (acc, next) => new Max(this.ad, acc, this.ad.convertVal(next)),
    this,
  )
}
Op.prototype.ifElse = function(thenOp: Input, elseOp: Input) {
  return new IfElse(this.ad, this, this.ad.convertVal(thenOp), this.ad.convertVal(elseOp))
}

export function WithFunctions<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    sin(input: Input) {
      return this.convertVal(input).sin()
    }
    cos(input: Input) {
      return this.convertVal(input).cos()
    }
    tan(input: Input) {
      return this.convertVal(input).tan()
    }
    mix(a: Input, b: Input, amt: Input) {
      return this.convertVal(a).mix(b, amt)
    }
    clamp(val: Input, min: Input, max: Input) {
      return this.convertVal(val).clamp(min, max)
    }
    min(...params: Input[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to min()!`)
      } else {
        const first = this.convertVal(params[0])
        if (params.length > 1) {
          return first.min(...params.slice(1))
        } else {
          return first
        }
      }
    }
    max(...params: Input[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to min()!`)
      } else {
        const first = this.convertVal(params[0])
        if (params.length > 1) {
          return first.max(...params.slice(1))
        } else {
          return first
        }
      }
    }
    ifElse(ifOp: Input, thenOp: Input, elseOp: Input) {
      return this.convertVal(ifOp).ifElse(thenOp, elseOp)
    }
  }
  return AutoDiff
}
