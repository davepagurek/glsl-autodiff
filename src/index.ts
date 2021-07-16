import { ADSettings, Input, Param, Op, Value, ADBase, UserInput } from './base'
import { WithArithmetic } from './arithmetic'
import { WithFunctions } from './functions'
import { WithVecBase } from './vecBase'
import { WithVecArithmetic } from './vecArithmetic'
import { WithVecFunctions } from './vecFunctions'

class AutoDiffImpl implements ADBase {
  protected nextID = 0
  public getNextID(): number {
    const id = this.nextID
    this.nextID++
    return id
  }

  public settings: ADSettings = {
    maxDepthPerVariable: 8,
    debug: false,
  }

  protected params: { [key: string]: Param } = {}
  protected outputs: { [key: string]: Op } = {}
  protected derivOutputs: { [param: string]: { [key: string]: Op } } = {}

  public val = UserInput(function(n: number) { return new Value(this, n) })
  public registerParam(param, name) {
    this.params[name] = param
  }
  public param = UserInput(function(name: string) {
    return new Param(this, name)
  })

  public convertVal(param: Input): Op {
    if (param instanceof Op) {
      return param
    } else {
      return this.val(param)
    }
  }
  public convertVals(params: Input[]): Op[] {
    return params.map((param) => this.convertVal(param))
  }

  public output(name: string, op: Op) {
    this.outputs[name] = op
    return this
  }

  public outputDeriv(name: string, param: Param | string, op: Op) {
    const paramName = typeof param === 'string' ? param : param.name
    this.derivOutputs[paramName] = this.derivOutputs[paramName] || {}
    this.derivOutputs[paramName][name] = op
    return this
  }

  public gen(): string {
    let code = ''

    // Add initializers for outputs
    const deps = new Set<Op>()
    for (const name in this.outputs) {
      for (const dep of this.outputs[name].deepDependencies().values()) {
        deps.add(dep)
      }
      deps.add(this.outputs[name])
    }
    for (const param in this.derivOutputs) {
      for (const name in this.derivOutputs[param]) {
        for (const dep of this.derivOutputs[param][name].deepDependencies().values()) {
          deps.add(dep)
        }
        deps.add(this.derivOutputs[param][name])
      }
    }
    for (const dep of deps.values()) {
      code += dep.initializer()
    }

    // Add outputs
    for (const name in this.outputs) {
      code += `${this.outputs[name].glslType()} ${name}=${this.outputs[name].ref()};\n`
    }

    for (const param in this.derivOutputs) {
      const paramOp = this.params[param]

      // Add initializers for derivative outputs
      const derivDeps = new Set<Op>()
      for (const name in this.derivOutputs[param]) {
        for (const dep of this.derivOutputs[param][name].deepDependencies().values()) {
          derivDeps.add(dep)
        }
        derivDeps.add(this.derivOutputs[param][name])
      }
      for (const dep of derivDeps.values()) {
        code += dep.derivInitializer(paramOp)
      }

      // Add derivative outputs
      for (const name in this.derivOutputs[param]) {
        code += `${this.derivOutputs[param][name].glslType()} ${name}=${this.derivOutputs[param][name].derivRef(paramOp)};\n`
      }
    }

    return code
  }
}

// TODO figure out a better way of writing this that Typescript can still infer the type of
const ExtendedAD = WithVecFunctions(WithVecArithmetic(WithVecBase(WithFunctions(WithArithmetic(AutoDiffImpl)))))
type GetType<T> = T extends new (...args: any[]) => infer V ? V : never
type AD = GetType<typeof ExtendedAD>

export const gen = (cb: (ad: AD) => void, settings: Partial<ADSettings> = {}): string => {
  const ad = new ExtendedAD()
  for (const setting in settings) {
    ad.settings[setting] = settings[setting]
  }
  cb(ad)
  return ad.gen()
}
