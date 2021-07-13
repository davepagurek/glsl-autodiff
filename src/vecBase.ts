import { Op, OpLiteral, ADBase, Param, Input, ADConstructor } from './base'

export interface VecOp extends Op {
  x(): Op
  y(): Op
  z(): Op
  w(): Op
  definition(): string
  derivative(param: Param): string
  size(): number
}

export class VecElementRef extends Op {
  public prop: string

  constructor(ad: ADBase, prop: string, vec: VecOp) {
    super(ad, vec)
    this.prop = prop
  }

  definition() { return `${this.dependsOn[0].ref()}.${this.prop}` }
  derivative(param: Param) { return `${this.dependsOn[0].derivRef(param)}.${this.prop}` }
}

export class VecParamElementRef extends OpLiteral {
  public prop: string
  public name: string

  constructor(ad: ADBase, prop: string, vec: VecOp) {
    super(ad, vec)
    this.prop = prop
    this.name = `_glslad_r${vec.id}_${prop}`
    this.ad.registerParam(this, this.name)
  }

  definition() { return `${this.dependsOn[0].ref()}.${this.prop}` }
  derivative(param: Param) {
    if (param === this) {
      return '1.0'
    } else {
      return '0.0'
    }
  }
}

export function Cache(target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value
  let created = false
  const cache = new Map<any, any>()
  descriptor.value = function(...args: any[]) {
    let cached = cache.get(this)
    if (!cached) {
      cached = originalMethod.apply(this, ...args)
      cache.set(this, cached)
    }
    return cached
  }
  return descriptor
}

export abstract class VectorOp extends Op {
  scalar() { return false }

  abstract size(): number

  @Cache
  public x(): Op { return new VecElementRef(this.ad, 'x', this) }

  @Cache
  public y(): Op { return new VecElementRef(this.ad, 'y', this) }

  @Cache
  public z(): Op { return new VecElementRef(this.ad, 'z', this) }

  @Cache
  public w(): Op { return new VecElementRef(this.ad, 'w', this) }

  public getVecElementRef(el: string) {
    if (el === 'x') {
      return this.x()
    } else if (el === 'y') {
      return this.y()
    } else if (el === 'z') {
      return this.z()
    } else if (el === 'w') {
      return this.w()
    } else {
      throw new Error(`Can't get element ref ${el}`)
    }
  }

  public u() { return this.x() }
  public v() { return this.y() }
  public r() { return this.x() }
  public g() { return this.y() }
  public b() { return this.z() }
  public a() { return this.w() }
  // I really wish I could just do a loop but I also want TS to statically type this,
  // so instead I just found permutations of all combinations and generated code to
  // paste in.
  // TODO make these refs instead of new vectors
  xyzw() { return new Vec(this.ad, this.x(), this.y(), this.z(), this.w()) }
  xywz() { return new Vec(this.ad, this.x(), this.y(), this.w(), this.z()) }
  xzyw() { return new Vec(this.ad, this.x(), this.z(), this.y(), this.w()) }
  xzwy() { return new Vec(this.ad, this.x(), this.z(), this.w(), this.y()) }
  xwyz() { return new Vec(this.ad, this.x(), this.w(), this.y(), this.z()) }
  xwzy() { return new Vec(this.ad, this.x(), this.w(), this.z(), this.y()) }
  yxzw() { return new Vec(this.ad, this.y(), this.x(), this.z(), this.w()) }
  yxwz() { return new Vec(this.ad, this.y(), this.x(), this.w(), this.z()) }
  yzxw() { return new Vec(this.ad, this.y(), this.z(), this.x(), this.w()) }
  yzwx() { return new Vec(this.ad, this.y(), this.z(), this.w(), this.x()) }
  ywxz() { return new Vec(this.ad, this.y(), this.w(), this.x(), this.z()) }
  ywzx() { return new Vec(this.ad, this.y(), this.w(), this.z(), this.x()) }
  zxyw() { return new Vec(this.ad, this.z(), this.x(), this.y(), this.w()) }
  zxwy() { return new Vec(this.ad, this.z(), this.x(), this.w(), this.y()) }
  zyxw() { return new Vec(this.ad, this.z(), this.y(), this.x(), this.w()) }
  zywx() { return new Vec(this.ad, this.z(), this.y(), this.w(), this.x()) }
  zwxy() { return new Vec(this.ad, this.z(), this.w(), this.x(), this.y()) }
  zwyx() { return new Vec(this.ad, this.z(), this.w(), this.y(), this.x()) }
  wxyz() { return new Vec(this.ad, this.w(), this.x(), this.y(), this.z()) }
  wxzy() { return new Vec(this.ad, this.w(), this.x(), this.z(), this.y()) }
  wyxz() { return new Vec(this.ad, this.w(), this.y(), this.x(), this.z()) }
  wyzx() { return new Vec(this.ad, this.w(), this.y(), this.z(), this.x()) }
  wzxy() { return new Vec(this.ad, this.w(), this.z(), this.x(), this.y()) }
  wzyx() { return new Vec(this.ad, this.w(), this.z(), this.y(), this.x()) }
  xyz() { return new Vec(this.ad, this.x(), this.y(), this.z()) }
  xzy() { return new Vec(this.ad, this.x(), this.z(), this.y()) }
  yxz() { return new Vec(this.ad, this.y(), this.x(), this.z()) }
  yzx() { return new Vec(this.ad, this.y(), this.z(), this.x()) }
  zxy() { return new Vec(this.ad, this.z(), this.x(), this.y()) }
  zyx() { return new Vec(this.ad, this.z(), this.y(), this.x()) }
  xyw() { return new Vec(this.ad, this.x(), this.y(), this.w()) }
  xwy() { return new Vec(this.ad, this.x(), this.w(), this.y()) }
  yxw() { return new Vec(this.ad, this.y(), this.x(), this.w()) }
  ywx() { return new Vec(this.ad, this.y(), this.w(), this.x()) }
  wxy() { return new Vec(this.ad, this.w(), this.x(), this.y()) }
  wyx() { return new Vec(this.ad, this.w(), this.y(), this.x()) }
  xy() { return new Vec(this.ad, this.x(), this.y()) }
  yx() { return new Vec(this.ad, this.y(), this.x()) }
  xzw() { return new Vec(this.ad, this.x(), this.z(), this.w()) }
  xwz() { return new Vec(this.ad, this.x(), this.w(), this.z()) }
  zxw() { return new Vec(this.ad, this.z(), this.x(), this.w()) }
  zwx() { return new Vec(this.ad, this.z(), this.w(), this.x()) }
  wxz() { return new Vec(this.ad, this.w(), this.x(), this.z()) }
  wzx() { return new Vec(this.ad, this.w(), this.z(), this.x()) }
  xz() { return new Vec(this.ad, this.x(), this.z()) }
  zx() { return new Vec(this.ad, this.z(), this.x()) }
  xw() { return new Vec(this.ad, this.x(), this.w()) }
  wx() { return new Vec(this.ad, this.w(), this.x()) }
  yzw() { return new Vec(this.ad, this.y(), this.z(), this.w()) }
  ywz() { return new Vec(this.ad, this.y(), this.w(), this.z()) }
  zyw() { return new Vec(this.ad, this.z(), this.y(), this.w()) }
  zwy() { return new Vec(this.ad, this.z(), this.w(), this.y()) }
  wyz() { return new Vec(this.ad, this.w(), this.y(), this.z()) }
  wzy() { return new Vec(this.ad, this.w(), this.z(), this.y()) }
  yz() { return new Vec(this.ad, this.y(), this.z()) }
  zy() { return new Vec(this.ad, this.z(), this.y()) }
  yw() { return new Vec(this.ad, this.y(), this.w()) }
  wy() { return new Vec(this.ad, this.w(), this.y()) }
  zw() { return new Vec(this.ad, this.z(), this.w()) }
  wz() { return new Vec(this.ad, this.w(), this.z()) }
  rgba() { return new Vec(this.ad, this.r(), this.g(), this.b(), this.a()) }
  rgab() { return new Vec(this.ad, this.r(), this.g(), this.a(), this.b()) }
  rbga() { return new Vec(this.ad, this.r(), this.b(), this.g(), this.a()) }
  rbag() { return new Vec(this.ad, this.r(), this.b(), this.a(), this.g()) }
  ragb() { return new Vec(this.ad, this.r(), this.a(), this.g(), this.b()) }
  rabg() { return new Vec(this.ad, this.r(), this.a(), this.b(), this.g()) }
  grba() { return new Vec(this.ad, this.g(), this.r(), this.b(), this.a()) }
  grab() { return new Vec(this.ad, this.g(), this.r(), this.a(), this.b()) }
  gbra() { return new Vec(this.ad, this.g(), this.b(), this.r(), this.a()) }
  gbar() { return new Vec(this.ad, this.g(), this.b(), this.a(), this.r()) }
  garb() { return new Vec(this.ad, this.g(), this.a(), this.r(), this.b()) }
  gabr() { return new Vec(this.ad, this.g(), this.a(), this.b(), this.r()) }
  brga() { return new Vec(this.ad, this.b(), this.r(), this.g(), this.a()) }
  brag() { return new Vec(this.ad, this.b(), this.r(), this.a(), this.g()) }
  bgra() { return new Vec(this.ad, this.b(), this.g(), this.r(), this.a()) }
  bgar() { return new Vec(this.ad, this.b(), this.g(), this.a(), this.r()) }
  barg() { return new Vec(this.ad, this.b(), this.a(), this.r(), this.g()) }
  bagr() { return new Vec(this.ad, this.b(), this.a(), this.g(), this.r()) }
  argb() { return new Vec(this.ad, this.a(), this.r(), this.g(), this.b()) }
  arbg() { return new Vec(this.ad, this.a(), this.r(), this.b(), this.g()) }
  agrb() { return new Vec(this.ad, this.a(), this.g(), this.r(), this.b()) }
  agbr() { return new Vec(this.ad, this.a(), this.g(), this.b(), this.r()) }
  abrg() { return new Vec(this.ad, this.a(), this.b(), this.r(), this.g()) }
  abgr() { return new Vec(this.ad, this.a(), this.b(), this.g(), this.r()) }
  rgb() { return new Vec(this.ad, this.r(), this.g(), this.b()) }
  rbg() { return new Vec(this.ad, this.r(), this.b(), this.g()) }
  grb() { return new Vec(this.ad, this.g(), this.r(), this.b()) }
  gbr() { return new Vec(this.ad, this.g(), this.b(), this.r()) }
  brg() { return new Vec(this.ad, this.b(), this.r(), this.g()) }
  bgr() { return new Vec(this.ad, this.b(), this.g(), this.r()) }
  rga() { return new Vec(this.ad, this.r(), this.g(), this.a()) }
  rag() { return new Vec(this.ad, this.r(), this.a(), this.g()) }
  gra() { return new Vec(this.ad, this.g(), this.r(), this.a()) }
  gar() { return new Vec(this.ad, this.g(), this.a(), this.r()) }
  arg() { return new Vec(this.ad, this.a(), this.r(), this.g()) }
  agr() { return new Vec(this.ad, this.a(), this.g(), this.r()) }
  rg() { return new Vec(this.ad, this.r(), this.g()) }
  gr() { return new Vec(this.ad, this.g(), this.r()) }
  rba() { return new Vec(this.ad, this.r(), this.b(), this.a()) }
  rab() { return new Vec(this.ad, this.r(), this.a(), this.b()) }
  bra() { return new Vec(this.ad, this.b(), this.r(), this.a()) }
  bar() { return new Vec(this.ad, this.b(), this.a(), this.r()) }
  arb() { return new Vec(this.ad, this.a(), this.r(), this.b()) }
  abr() { return new Vec(this.ad, this.a(), this.b(), this.r()) }
  rb() { return new Vec(this.ad, this.r(), this.b()) }
  br() { return new Vec(this.ad, this.b(), this.r()) }
  ra() { return new Vec(this.ad, this.r(), this.a()) }
  ar() { return new Vec(this.ad, this.a(), this.r()) }
  gba() { return new Vec(this.ad, this.g(), this.b(), this.a()) }
  gab() { return new Vec(this.ad, this.g(), this.a(), this.b()) }
  bga() { return new Vec(this.ad, this.b(), this.g(), this.a()) }
  bag() { return new Vec(this.ad, this.b(), this.a(), this.g()) }
  agb() { return new Vec(this.ad, this.a(), this.g(), this.b()) }
  abg() { return new Vec(this.ad, this.a(), this.b(), this.g()) }
  gb() { return new Vec(this.ad, this.g(), this.b()) }
  bg() { return new Vec(this.ad, this.b(), this.g()) }
  ga() { return new Vec(this.ad, this.g(), this.a()) }
  ag() { return new Vec(this.ad, this.a(), this.g()) }
  ba() { return new Vec(this.ad, this.b(), this.a()) }
  ab() { return new Vec(this.ad, this.a(), this.b()) }
  uv() { return new Vec(this.ad, this.u(), this.v()) }
  vu() { return new Vec(this.ad, this.v(), this.u()) }
}

export abstract class WithVecDependencies extends VectorOp {
  public get vecDependsOn() {
    return this.dependsOn as VecOp[]
  }

  public size() {
    return this.vecDependsOn[0].size()
  }
}

export abstract class ScalarWithVecDependencies extends Op {
  public get vecDependsOn() {
    return this.dependsOn as VecOp[]
  }

  public size() {
    return this.vecDependsOn[0].size()
  }
}

export class Vec extends VectorOp {
  public size(): number {
    return this.dependsOn.length
  }

  definition() {
    return `vec${this.size()}(${this.dependsOn.map((op) => op.ref()).join(',')})`
  }
  derivative(param: Param) {
    return `vec${this.size()}(${this.dependsOn.map((op) => op.derivRef(param)).join(',')})`
  }

  public x() { return this.dependsOn[0] }
  public y() { return this.dependsOn[1] }
  public z() { return this.dependsOn[2] }
  public w() { return this.dependsOn[3] }
}

export class VecParam extends VectorOp {
  private name: string
  private _size: number
  public size() { return this._size }

  constructor(ad: ADBase, name: string, size: number) {
    super(ad)
    this.name = name
    this._size = size
  }

  @Cache
  public x(): Op { return new VecParamElementRef(this.ad, 'x', this) }

  @Cache
  public y(): Op { return new VecParamElementRef(this.ad, 'y', this) }

  @Cache
  public z(): Op { return new VecParamElementRef(this.ad, 'z', this) }

  @Cache
  public w(): Op { return new VecParamElementRef(this.ad, 'w', this) }

  private getElems() {
    return 'xyzw'
      .split('')
      .slice(0, this.size())
      .map((el) => this.getVecElementRef(el))
  }

  definition() { return this.name }
  derivative(param: Param) {
    return `vec${this.size()}(${this.getElems().map((el) => el.derivRef(param)).join(',')})`
  }

  public override initializer() { return '' }
  public override ref() { return this.definition() }
  public override derivInitializer(param: Param) {
    if (this.useTempVar()) {
      return `vec${this.size()} ${this.derivRef(param)}=${this.derivative(param)};\n`
    } else {
      return ''
    }
  }
}

export function WithVecBase<T extends ADConstructor>(Base: T) {
  class AutoDiff extends Base {
    vec2Param(name: string) {
      return new VecParam(this, name, 2)
    }
    vec3Param(name: string) {
      return new VecParam(this, name, 3)
    }
    vec4Param(name: string) {
      return new VecParam(this, name, 4)
    }
    vec2(x: Input, y: Input) {
      return new Vec(this, this.convertVal(x), this.convertVal(y))
    }
    vec3(x: Input, y: Input, z: Input) {
      return new Vec(this, ...this.convertVals([x, y, z]))
    }
    vec4(x: Input, y: Input, z: Input, w: Input) {
      return new Vec(this, ...this.convertVals([x, y, z, w]))
    }
  }
  return AutoDiff
}
