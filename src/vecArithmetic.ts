import { Input, Param, ADBase, ADConstructor, UserInput } from './base'
import { VectorOp, WithVecDependencies } from './vecBase'

export class VecNeg extends WithVecDependencies {
  definition() {
    return `-${this.dependsOn[0].ref()}`
  }
  derivative(param: Param) {
    return '-' + this.dependsOn[0].derivRef(param)
  }
}

export class VecSum extends WithVecDependencies {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('+')
  }
  derivative(param: Param) {
    return this.dependsOn.map((op) => op.derivRef(param)).join('+')
  }
}

export class VecScale extends WithVecDependencies {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('*')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`
  }
}

export class VecMult extends WithVecDependencies {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('*')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
    // Multiplying two vectors in glsl does elementwise multiplication
    return `${f.ref()}*${g.derivRef(param)}+${g.ref()}*${f.derivRef(param)}`
  }
}

declare module './vecBase' {
  interface VectorOp {
    neg(): VectorOp
    add(...params: VectorOp[]): VectorOp
    scale(k: Input): VectorOp
    mult(...params: VectorOp[]): VectorOp
  }
}
VectorOp.prototype.neg = UserInput(function() {
  return new VecNeg(this.ad, this)
})
VectorOp.prototype.add = UserInput(function(...params: VectorOp[]) {
  return new VecSum(this.ad, this, ...params)
})
VectorOp.prototype.scale = UserInput(function(k: Input) {
  return new VecScale(this.ad, this, this.ad.convertVal(k))
})
VectorOp.prototype.mult = UserInput(function(...params: VectorOp[]) {
  if (params.length === 0) {
    throw new Error(`mult() called with too few arguments: ${params}`)
  } else if (params.length === 1) {
    return new VecMult(this.ad, this, params[0])
  } else {
    return this.mult(params[0]).mult(...params.slice(1))
  }
})

export function WithVecArithmetic<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    vecSum = UserInput(function(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error('No arguments passed to vecSum()!')
      } else if (params.length === 1) {
        return params[0]
      } else {
        return params[0].add(...params.slice(1))
      }
    })
    vecProd = UserInput(function(...params: VectorOp[]) {
      return params.reduce((acc, next) => acc.mult(next))
    })
  }
  return AutoDiff
}
