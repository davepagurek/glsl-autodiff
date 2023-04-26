import { Input, Op, Param, ADBase, ADConstructor, UserInput, EqOp, AndOp, Value, LtOp } from './base'
import { Vec, VecParam, VectorOp, WithVecDependencies, ScalarWithVecDependencies, OffsetJacobian } from './vecBase'
import { VecMult, VecSum } from './vecArithmetic'
import { Abs } from './functions'
import { Mult } from './arithmetic'

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

export class VecNormalize extends WithVecDependencies {
  override size() {
    return this.vecDependsOn[0].size()
  }
  definition() {
    const [input] = this.dependsOn
    return `normalize(${input.ref()})`
  }
  derivative(param: Param): string {
    throw new Error('unimplemented')
  }
}

export class VecAbs extends WithVecDependencies {
  override size() {
    return this.vecDependsOn[0].size()
  }
  definition() {
    const [input] = this.dependsOn
    return `abs(${input.ref()})}`
  }
  derivative(param: Param): string {
    return '0.0'
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

export class Cross extends WithVecDependencies {
  override size() {
    return this.vecDependsOn[0].size()
  }
  definition() {
    const [a, b] = this.dependsOn
    return `cross(${a.ref()},${b.ref()})`
  }
  derivative(param: Param): string {
    throw new Error('unimplemented')
  }
}

export class Normalize extends WithVecDependencies {
  override size() {
    return this.vecDependsOn[0].size()
  }
  definition() {
    const [a, b] = this.dependsOn
    return `normalize(${a.ref()}})`
  }
  derivative(param: Param): string {
    throw new Error('unimplemented')
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
    adjustNormal(normal: VecParam, position: VecParam): VectorOp
  }
}
declare module './base' {
  interface Op {
    vecIfElse(thenOp: VectorOp, elseOp: VectorOp): VectorOp
  }
}

VectorOp.prototype.mix = UserInput(function(other: VectorOp, amt: Input) {
  return new VecMix(this.ad, this, other, this.ad.convertVal(amt))
})
VectorOp.prototype.clamp = UserInput(function(min: VectorOp, max: VectorOp) {
  return new VecClamp(this.ad, this, min, max)
})
VectorOp.prototype.min = UserInput(function(...params: VectorOp[]) {
  return params.reduce(
    (acc, next) => new VecMin(this.ad, acc, next),
    this,
  )
})
VectorOp.prototype.max = UserInput(function(...params: VectorOp[]) {
  return params.reduce(
    (acc, next) => new VecMax(this.ad, acc, next),
    this,
  )
})
VectorOp.prototype.dot = UserInput(function(other: VectorOp) {
  return new Dot(this.ad, this, other)
})
VectorOp.prototype.length = UserInput(function() {
  return new Length(this.ad, this)
})
VectorOp.prototype.dist = UserInput(function(other: VectorOp) {
  return new Dist(this.ad, this, other)
})
Op.prototype.vecIfElse = UserInput(function(thenOp: VectorOp, elseOp: VectorOp) {
  return new VecIfElse(this.ad, this, thenOp, elseOp)
})
VectorOp.prototype.adjustNormal = function(normal: VecParam, position: VecParam) {
  const x = new Vec(this.ad, ...this.ad.convertVals([1, 0, 0]))
  const y = new Vec(this.ad, ...this.ad.convertVals([0, 1, 0]))
  const yEq0 = new EqOp(this.ad, normal.y(), new Value(this.ad, 0))
  const zEq0 = new EqOp(this.ad, normal.z(), new Value(this.ad, 0))
  const normalIsX = new AndOp(this.ad, yEq0, zEq0)
  const other = normalIsX.vecIfElse(y, x)
  /*const yEq0 = new LtOp(this.ad, new Abs(this.ad, normal.y()), new Value(this.ad, 0.2))
  const zEq0 = new LtOp(this.ad, new Abs(this.ad, normal.z()), new Value(this.ad, 0.2))
  const normalIsX = new AndOp(this.ad, yEq0, zEq0)
  const other = normalIsX.vecIfElse(y, x)*/
  /*const normalDotX = new Abs(this.ad, new Dot(this.ad, normal, x))
  const normalDotY = new Abs(this.ad, new Dot(this.ad, normal, y))
  const other = new VecNormalize(
    this.ad,
    new VecMix(
      this.ad,
      y,
      x,
      new Mult(
        this.ad,
        normalDotX,
        normalDotY
      ),
    ),
  )*/
  //const v = new Cross(this.ad, other, normal)
  //const u = new Cross(this.ad, v, normal)
  const v = new VecNormalize(this.ad, new Cross(this.ad, other, normal))
  const u = new VecNormalize(this.ad, new Cross(this.ad, v, normal))
  const jacobian = new OffsetJacobian(this.ad, position, this)
  const dodu = new VecMult(this.ad, jacobian, u)
  const dodv = new VecMult(this.ad, jacobian, v)
  return new Cross(
    this.ad,
    new VecSum(this.ad, u, dodu),
    new VecSum(this.ad, v, dodv),
  )
}

export function WithVecFunctions<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    vecMix = UserInput(function(a: VectorOp, b: VectorOp, amt: Input) {
      return a.mix(b, amt)
    })
    vecClamp = UserInput(function(val: VectorOp, min: VectorOp, max: VectorOp) {
      return val.clamp(min, max)
    })
    vecMin = UserInput(function(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to vecMin()!`)
      } else {
        return params.reduce((acc, next) => acc.min(next))
      }
    })
    vecMax = UserInput(function(...params: VectorOp[]) {
      if (params.length === 0) {
        throw new Error(`No arguments passed to vecMax()!`)
      } else {
        return params.reduce((acc, next) => acc.max(next))
      }
    })
    dot = UserInput(function(a: VectorOp, b: VectorOp) {
      return a.dot(b)
    })
    length = UserInput(function(val: VectorOp) {
      return val.length()
    })
    dist = UserInput(function(a: VectorOp, b: VectorOp) {
      return a.dist(b)
    })
  }
  return AutoDiff
}
