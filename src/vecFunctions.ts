import { Input, Op, Param, ADBase, ADConstructor } from './base'
import { VectorOp, WithVecDependencies, ScalarWithVecDependencies } from './vecBase'

export class VecMix extends WithVecDependencies {
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

export class VecClamp extends WithVecDependencies {
  definition() {
    return `clamp(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    // Get an expression for the derivative of just one element in the vector
    const elemClamp = (v, min, max) => `${v.ref()}<${min.ref()} ? 0.0 : (${v.ref()}>${max.ref()} ? 0.0 : ${v.derivRef(param)})`

    // Get refs for each element of each parameter
    const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el))
    const [vecC, vecMin, vecMax] = this.vecDependsOn.map(toRefs)

    // Construct a vector out of the elementwise derivatives
    const innerDef = Array(this.size()).fill(0).map((_, i) => elemClamp(vecC[i], vecMin[i], vecMax[i])).join(',')
    return `vec${this.size()}(${innerDef})`
  }
}

export class VecMin extends WithVecDependencies {
  definition() {
    return `min(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    // Get an expression for the derivative of just one element in the vector
    const elemMin = (a, b) => `${a.ref()}<${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`

    // Get refs for each element of each parameter
    const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el))
    const [vecA, vecB] = this.vecDependsOn.map(toRefs)

    // Construct a vector out of the elementwise derivatives
    const innerDef = Array(this.size()).fill(0).map((_, i) => elemMin(vecA[i], vecB[i])).join(',')
    return `vec${this.size()}(${innerDef})`
  }
}

export class VecMax extends WithVecDependencies {
  definition() {
    return `max(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    // Get an expression for the derivative of just one element in the vector
    const elemMax = (a, b) => `${a.ref()}>${b.ref()} ? ${a.derivRef(param)} : ${b.derivRef(param)}`

    // Get refs for each element of each parameter
    const toRefs = (vec) => 'xyzw'.split('').slice(0, vec.size()).map((el) => vec.getVecElementRef(el))
    const [vecA, vecB] = this.vecDependsOn.map(toRefs)

    // Construct a vector out of the elementwise derivatives
    const innerDef = Array(this.size()).fill(0).map((_, i) => elemMax(vecA[i], vecB[i])).join(',')
    return `vec${this.size()}(${innerDef})`
  }
}

export class VecIfElse extends WithVecDependencies {
  override size() {
    return this.vecDependsOn[1].size()
  }
  definition() {
    const [condition, thenOp, elseOp] = this.dependsOn
    return `${condition.ref()}?${thenOp.ref()}:${elseOp.ref()}`
  }
  derivative(param: Param) {
    const [condition, thenOp, elseOp] = this.dependsOn
    return `${condition.ref()}?${thenOp.derivRef(param)}:${elseOp.derivRef(param)}`
  }
}

export class Dot extends ScalarWithVecDependencies {
  definition() {
    return `dot(${this.dependsOn.map((v) => v.ref()).join(',')})`
  }
  derivative(param: Param) {
    const [f, g] = this.vecDependsOn
    return 'xyzw'
      .split('')
      .slice(0, this.size())
      .map((el) => `${f.ref()}.${el}*${g.derivRef(param)}.${el}+${g.ref()}.${el}*${f.derivRef(param)}.${el}`)
      .join('+')
  }
}

export class Length extends ScalarWithVecDependencies {
  override scalar() { return true }
  definition() { return `length(${this.dependsOn[0].ref()})` }
  derivative(param: Param) {
    const outerDeriv = `0.5/length(${this.dependsOn[0].ref()})`
    const innerDeriv = 'xyzw'
      .split('')
      .slice(0, this.size())
      .map((el) => `2.0*${this.dependsOn[0].ref()}.${el}*${this.dependsOn[0].derivRef(param)}.${el}`)
      .join('+')
    return `${outerDeriv}*${innerDeriv}`
  }
}

export class Dist extends ScalarWithVecDependencies {
  definition() { return `distance(${this.dependsOn.map((v) => v.ref()).join(',')})` }
  derivative(param: Param) {
    const outerDeriv = `0.5/distance(${this.dependsOn.map((v) => v.ref()).join(',')})`
    const innerDeriv = 'xyzw'
      .split('')
      .slice(0, this.size())
      .map((el) => {
        const diff = this.dependsOn.map((v) => v.ref()).join('-')
        const derivDiff = this.dependsOn.map((v) => v.derivRef(param)).join('-')
        return `2.0*(${diff}).${el}*(${derivDiff}).${el}`
      })
      .join('+')
    return `${outerDeriv}*${innerDeriv}`
  }
}

declare module './vecBase' {
  interface VectorOp {
    mix(other: VectorOp, amt: Input): VectorOp
    clamp(min: VectorOp, max: VectorOp): VectorOp
    min(...params: VectorOp[]): VectorOp
    max(...params: VectorOp[]): VectorOp
    dot(other: VectorOp): Op
    length(): Op
    dist(other: VectorOp): Op
  }
}
declare module './base' {
  interface Op {
    vecIfElse(thenOp: VectorOp, elseOp: VectorOp): VectorOp
  }
}

VectorOp.prototype.mix = function(other: VectorOp, amt: Input) {
  return new VecMix(this.ad, this, other, this.ad.convertVal(amt))
}
VectorOp.prototype.clamp = function(min: VectorOp, max: VectorOp) {
  return new VecClamp(this.ad, this, min, max)
}
VectorOp.prototype.min = function(...params: VectorOp[]) {
  return params.reduce(
    (acc, next) => new VecMin(this.ad, acc, next),
    this,
  )
}
VectorOp.prototype.max = function(...params: VectorOp[]) {
  return params.reduce(
    (acc, next) => new VecMax(this.ad, acc, next),
    this,
  )
}
VectorOp.prototype.dot = function(other: VectorOp) {
  return new Dot(this.ad, this, other)
}
VectorOp.prototype.length = function() {
  return new Length(this.ad, this)
}
VectorOp.prototype.dist = function(other: VectorOp) {
  return new Dist(this.ad, this, other)
}
Op.prototype.vecIfElse = function(thenOp: VectorOp, elseOp: VectorOp) {
  return new VecIfElse(this.ad, this, thenOp, elseOp)
}

export function WithVecFunctions<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    vecMix(a: VectorOp, b: VectorOp, amt: Input) {
      return a.mix(b, amt)
    }
    vecClamp(val: VectorOp, min: VectorOp, max: VectorOp) {
      return val.clamp(min, max)
    }
    vecMin(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to vecMin()!`)
      } else {
        return params.reduce((acc, next) => acc.min(next))
      }
    }
    vecMax(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to vecMax()!`)
      } else {
        return params.reduce((acc, next) => acc.max(next))
      }
    }
    dot(a: VectorOp, b: VectorOp) {
      return a.dot(b)
    }
    length(val: VectorOp) {
      return val.length()
    }
    dist(a: VectorOp, b: VectorOp) {
      return a.dist(b)
    }
  }
  return AutoDiff
}
