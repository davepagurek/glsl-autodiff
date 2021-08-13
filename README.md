# glsl-autodiff
Tired of doing math to get normals in your vertex shader? Same. Use this library to write your function once and generate derivatives automatically!

- <a href="#demo">Demo</a>
  - <a href="#starter-code">Starter Code</a>
- <a href="#why">Why?</a>
- <a href="#api-usage">API Usage</a>
  - <a href="#inputs-and-outputs">Inputs and Outputs</a>
  - <a href="#operations">Operations</a>
  - <a href="#additional-settings">Additional Settings</a>
  - <a href="#importing-in-jsts-builds">Importing in JS/TS Builds</a>
  - <a href="#importing-in-the-browser">Importing in the Browser</a>
- <a href="#contributing">Contributing</a>

## Demo
![airplane-small](https://user-images.githubusercontent.com/5315059/129101559-4f394a4c-ea3d-489f-9796-cff224aa277d.gif)

<a href="https://editor.p5js.org/davepagurek/sketches/sQZGnfyKt">Live version in the p5 editor</a>

### Starter Code

<table>
  <tr>
    <th>Autodiff + Sphere mapped lighting</th>
    <th>Autodiff + Sphere mapped lighting + bump mapping</th>
  </tr>
  <tr>
    <td><a href="https://editor.p5js.org/davepagurek/sketches/PN4MnpC15">P5 Editor template</a></td>
    <td><a href="https://editor.p5js.org/davepagurek/sketches/hJEHTTXUN">P5 Editor template</a></td>
  </tr>
  <tr>
    <td><a href="https://codepen.io/pen/?template=BaRbezz">CodePen template</a></td>
    <td><a href="https://codepen.io/pen/?template=poPYmda">CodePen template</a></td>
  </tr>
</table>

## Why?

Sometimes, I want to displace mesh vertices in a vertex shader. After doing this, the normals of a surface should change:

![image](https://user-images.githubusercontent.com/5315059/129100445-7f48da08-df0f-4fd8-a5c5-16e169197ce4.png)

However, per-vertex normals don't automatically update! Manual updating of vertex normals requires you to take the derivative of your displacement function. This library automates that process so that it takes less time and is less prone to user error. If you're interested, read <a href="https://www.davepagurek.com/blog/realtime-deformation/">a more in-depth blog post</a> on why this is necessary and how it works.

## API Usage

This exposes a `gen` function that generates GLSL that you can splice into your shader code. Inside a call to `gen()`, you provide a callback that takes in `ad`, the AutoDiff engine, and uses it to build shader code. We build shaders by essentially creating a graph of operations that we pass inputs through to arrive at an output. Every function call creates an object representing such an operation. Once we have a graph, we can automatically compute derivatives using it!

The AutoDiff engine's methods are designed to look similar to how you would normally write a shader, but using method chaining instead of operator symbols, similar to how <a href="https://p5js.org/reference/#/p5.Vector">p5's Vector class works.</a> It looks something like this in action:
```js
import { gen } from `@davepagurek/glsl-autodiff'

const vert = `
void main(void) {
  vec4 objSpacePosition = vec4(aPosition, 1.0);

  float x = objSpacePosition.x;
  float y = objSpacePosition.y;
  ${gen((ad) => {
    const x = ad.param('x')
    const y = ad.param('y')
    const time = ad.param('time')
    const speedX = 1.5
    const speedY = 2.8

    let offset = ad.val(0)
    for (let i = 0; i < 3; i++) {
      offset = offset.add(ad.sin(
        ad.sum(
          offset.mult(0.5).add(x.mult(speedX)).add(y.mult(speedY)),
          time.mult(0.002),
        )
      ))
    }
    offset = offset.mult(0.1)
    offset.output('z')
    offset.outputDeriv('dzdx', x)
    offset.outputDeriv('dzdy', y)
  })}
  objSpacePosition.z = z;
  vec3 slopeX = vec3(1.0, 0.0, dzdx);
  vec3 slopeY = vec3(0.0, 1.0, dzdy);
  vNormal = uNormalMatrix * normalize(cross(slopeX, slopeY));

  vec4 worldSpacePosition = uModelViewMatrix * objSpacePosition;
  gl_Position = uProjectionMatrix * worldSpacePosition;
}
`
```

### Inputs and Outputs

**Parameters** are variables that you create outside of AutoDiff but that you want to reference inside AutoDiff. Depending on their variable type, use one of the following methods to create them:

```typescript
interface AutoDiff {
  param(name: string): Param
  vec2Param: (name: string) => VecParam
  vec3Param: (name: string) => VecParam
  vec4Param: (name: string) => VecParam
}
```

**Outputs** are used to store computation results from within AutoDiff into names that are accessible outside AutoDiff. You can also output the derivative of a computation with respect to an input parameter.

```typescript
interface Op {
  output(name: string);
  outputDeriv(name: string, param: Param);
}
```

As an example, we can use `param` to reference a uniform, do some math with it, and output the result:
```js
const vert = `
// A uniform we want to reference
uniform vec3 position;

void main(void) {
  ${AutoDiff.gen((ad) => {
    // Get a computation graph node representing the uniform
    const position = ad.vec3Param('position')
    
    // Do stuff with it
    const offset = ad.sum(position.x(), position.y(), position.z())
    
    // Output it so the rest of the shader can reference it
    offset.output('offset')
  })}
  vec3 worldSpacePosition = position;
  worldSpacePosition.z += offset; // Use offset, an output, outside of AutoDiff
  gl_Position = uProjectionMatrix * vec4(worldSpacePosition, 1.0);
}
`
```

### Operations

Given any scalar graph node (`Op`), use any of the following methods to generate a new node corresponding to the GLSL operation of the same name:
```typescript
interface Op {
  neg(): Op; // Multiply by -1
  add(...params: Input[]): Op;
  sub(val: Input): Op;
  mult(...params: Input[]): Op;
  div(param: Input): Op;
  pow(param: Input): Op;
  sqrt(): Op;
  sin(): Op;
  cos(): Op;
  tan(): Op;
  mix(b: Input, amt: Input): Op;
  clamp(min: Input, max: Input): Op;
  min(...params: Input[]): Op;
  max(...params: Input[]): Op;
  ifElse(thenOp: Input, elseOp: Input): Op; // Ternary with the receiving Op being the condition
  vecIfElse(thenOp: VectorOp, elseOp: VectorOp): VectorOp; // Ternary but where the if/else values are vectors
}
```

Note that an `Input` is either another node, or a number literal.

Given a vector graph node (`VectorOp`, which extends `Op`), use any of the following methods to again generate a new node with the computation result:
```typescript
interface VectorOp {
  neg(): VectorOp;
  add(...params: VectorOp[]): VectorOp;
  scale(k: Input): VectorOp; // When multiplying by a scalar
  mult(...params: VectorOp[]): VectorOp; // When multiplying by another vector
  mix(other: VectorOp, amt: Input): VectorOp;
  clamp(min: VectorOp, max: VectorOp): VectorOp;
  min(...params: VectorOp[]): VectorOp;
  max(...params: VectorOp[]): VectorOp;
  dot(other: VectorOp): Op;
  length(): Op;
  dist(other: VectorOp): Op;
}
```

You can also construct nodes directly from the AutoDiff engine passed to you in the `gen` callback:
```typescript
interface AutoDiff {
  // Create new values
  val: (n: number) => Op;
  vec2: (x: Input, y: Input) => Vec;
  vec3: (x: Input, y: Input, z: Input) => Vec;
  vec4: (x: Input, y: Input, z: Input, w: Input) => Vec;

  // Create a new operation with scalar inputs
  sum: (...params: Input[]) => any;
  prod: (...params: Input[]) => any;
  sqrt: (param: Input) => any;
  sin: (input: Input) => any;
  cos: (input: Input) => any;
  tan: (input: Input) => any;
  mix: (a: Input, b: Input, amt: Input) => any;
  clamp: (val: Input, min: Input, max: Input) => any;
  min: (...params: Input[]) => any;
  max: (...params: Input[]) => any;
  ifElse: (ifOp: Input, thenOp: Input, elseOp: Input) => any;
  
  // Create a new operation with vector inputs
  vecSum: (...params: VectorOp[]) => VectorOp;
  vecProd: (...params: VectorOp[]) => VectorOp;
  vecMix: (a: VectorOp, b: VectorOp, amt: Input) => VectorOp;
  vecClamp: (val: VectorOp, min: VectorOp, max: VectorOp) => VectorOp;
  vecMin: (...params: VectorOp[]) => VectorOp;
  vecMax: (...params: VectorOp[]) => VectorOp;
  dot: (a: VectorOp, b: VectorOp) => Op;
  length: (val: VectorOp) => Op;
  dist: (a: VectorOp, b: VectorOp) => Op;
}
```

### Additional settings

On some very rare occasions, you write code that Just Works™! For the other 99% of the time, AutoDiff includes debug options that you can change by passing an additional settings object into the `gen` function:

```typescript
gen: (
  cb: (ad: AD) => void,
  settings?: Partial<ADSettings>,
) => string;

type ADSettings = {
  maxDepthPerVariable: number;
  debug: boolean;
};
```

When you set `debug: true`, each line in the outputted GLSL that comes directly from an code you wrote gets a comment referencing where it came from:
<table>
  <tr>
    <th>Input</td>
    <th>Output</td>
  </tr>
  <tr>
    <td>
      <pre>const vert = `
void main(void) {
  vec4 objSpacePosition = vec4(aPosition, 1.0);
  float origZ = objSpacePosition.z;
  float x = objSpacePosition.x;
  float y = objSpacePosition.y;
  ${AutoDiff.gen((ad) => {
    const x = ad.param('x')
    const y = ad.param('y')
    const time = ad.param('time')
    const speedX = 1.5
    const speedY = 2.8

    let offset = ad.val(0)
    for (let i = 0; i < 3; i++) {
      offset = offset.add(ad.sin(
        ad.sum(
          offset.mult(0.5).add(x.mult(speedX)).add(y.mult(speedY)),
          time.mult(0.002),
        )
      ))
    }
    offset = offset.mult(0.1)
    offset.output('z')
  }, { debug: true, maxDepthPerVariable: 4 })}
  objSpacePosition.z += z;
  vec4 worldSpacePosition = uModelViewMatrix * objSpacePosition;
  gl_Position = uProjectionMatrix * worldSpacePosition;
}
`</pre>
    </td>
    <td>
      <pre>void main(void) {
  vec4 objSpacePosition = vec4(aPosition, 1.0);
  float origZ = objSpacePosition.z;
  float x = objSpacePosition.x;
  float y = objSpacePosition.y;
  
  // From vert<@file:///Users/dpagurek/Documents/Projects/glsl-autodiff/test/sine_plane/test.js:31:12
  float _glslad_v14=(((0.0000\*0.5000)+(x\*1.5000))+(y\*2.8000))+(time\*0.0020);

  // From vert<@file:///Users/dpagurek/Documents/Projects/glsl-autodiff/test/sine_plane/test.js:30:23
  float _glslad_v16=0.0000+(sin(_glslad_v14));

  // From vert<@file:///Users/dpagurek/Documents/Projects/glsl-autodiff/test/sine_plane/test.js:31:12
  float _glslad_v27=(((_glslad_v16\*0.5000)+(x\*1.5000))+(y\*2.8000))+(time\*0.0020);

  // From vert<@file:///Users/dpagurek/Documents/Projects/glsl-autodiff/test/sine_plane/test.js:30:23
  float _glslad_v29=_glslad_v16+(sin(_glslad_v27));

  // From vert<@file:///Users/dpagurek/Documents/Projects/glsl-autodiff/test/sine_plane/test.js:31:12
  float _glslad_v40=(((_glslad_v29\*0.5000)+(x\*1.5000))+(y\*2.8000))+(time\*0.0020);
  float z=((_glslad_v29+(sin(_glslad_v40)))\*0.1000);

  objSpacePosition.z += z;
  vec4 worldSpacePosition = uModelViewMatrix \* objSpacePosition;
  gl_Position = uProjectionMatrix \* worldSpacePosition;
}</pre>
    </td>
  </tr>
</table>

Sometimes too much or too little ends up on one line, so you can also supply `maxDepthPerVariable` to supply a maximum number of nested operations before creating an intermediate variable. If unspecified, we use `maxDepthPerVariable: 8`. To condense into as few lines as possible, use `Infinity`. To make every operation its own variable, use 1.

### Importing in JS/TS builds

Add this library to your project:
```
yarn add @davepagurek/glsl-autodiff
```

Then, import the `gen` method:
```typescript
import { gen } from '@davepagurek/glsl-autodiff'

const myShader = `
  // some shader code here
  ${gen((ad) => {
    // Use autodiff here
  })}
`
```

### Importing in the Browser

Download the library <a href="https://github.com/davepagurek/glsl-autodiff/releases/tag/v0.0.14">from the Github releases tab</a> and add the library to your HTML file:
```html
<script type="text/javascript" src="autodiff.js"></script>
```

Then, use the global `AutoDiff` variable which includes the `gen` function:
```js
const myShader = `
  // some shader code here
  ${AutoDiff.gen((ad) => {
    // Use autodiff here
  })}
`
```

## Contributing

Want to help out? There are a number of things I'd like to get done at some point that are <a href="https://github.com/davepagurek/glsl-autodiff/issues">written down for posterity in the Issues tab</a> that I'd love help on!

Setting up the repo:

```
git clone git@github.com:davepagurek/glsl-autodiff.git
cd glsl-autodiff
yarn install
```

Compiling `build/autodiff.js` and `build/autodiff.d.ts`:
```
yarn build
```

Pushing all compiled code to Github Pages for demos (if you are me or have write permissions):
```
yarn deploy
```

Publishing a new version to NPM:
```
yarn publish
```
