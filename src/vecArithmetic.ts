import { Input, Param, ADBase, ADConstructor } from './base'
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
    // Multiplying two vectors in glsl does elementwise multiplication
    return this.dependsOn.map((op) => op.derivRef(param)).join('*')
  }
}

export class VecMult extends WithVecDependencies {
  definition() {
    return this.dependsOn.map((op) => op.ref()).join('*')
  }
  derivative(param: Param) {
    const [f, g] = this.dependsOn
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
VectorOp.prototype.neg = function() {
  return new VecNeg(this.ad, this)
}
VectorOp.prototype.add = function(...params: VectorOp[]) {
  return new VecSum(this.ad, ...params)
}
VectorOp.prototype.scale = function(k: Input) {
  return new VecScale(this.ad, this, this.ad.convertVal(k))
}
VectorOp.prototype.mult = function(...params: VectorOp[]) {
  if (params.length === 0) {
    throw new Error(`mult() called with too few arguments: ${params}`)
  } else if (params.length === 1) {
    return new VecMult(this.ad, this, params[0])
  } else {
    return this.mult(params[0]).mult(...params.slice(1))
  }
}

export function WithVecArithmetic<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    vecSum(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error('No arguments passed to vecSum()!')
      } else if (params.length === 1) {
        return params[0]
      } else {
        return params[0].add(...params.slice(1))
      }
    }
    vecProd(...params: VectorOp[]) {
      return params.reduce((acc, next) => acc.mult(next))
    }
  }
  return AutoDiff
}
