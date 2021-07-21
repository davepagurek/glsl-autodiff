# glsl-autodiff
Tired of doing math to get normals in your vertex shader? Same. Use this library to write your function once and generate derivatives automatically!

- <a href="#demo">Demo</a>
- <a href="#why">Why?</a>
  - <a href="#eg-1d-plane-displacement">e.g. 1D Plane Displacement</a>
  - <a href="#eg-1d-mesh-displacement">e.g. 1D Mesh Displacement</a>
  - <a href="#eg-3d-mesh-displacement">e.g. 3D Mesh Displacement</a>
- <a href="#api-usage">API Usage</a>
  - <a href="#inputs-and-outputs">Inputs and Outputs</a>
  - <a href="#operations">Operations</a>
  - <a href="#additional-settings">Additional Settings</a>
  - <a href="#importing-in-jsts-builds">Importing in JS/TS Builds</a>
  - <a href="#importing-in-the-browser">Importing in the Browser</a>
- <a href="#contributing">Contributing</a>

## Demo
Some example distortion functions with autodiff used to make normals:
- https://davepagurek.github.io/glsl-autodiff/test/sine_plane/
- https://davepagurek.github.io/glsl-autodiff/test/advanced_plane/
- https://davepagurek.github.io/glsl-autodiff/test/sinenoise_plane/

## Why?
Sometimes I want to dynamically distort meshes in shaders. If I want to preserve shading, this means I need to figure out the change to the surface normals in addition to the vertex displacement. If we have two different tangents vectors on the surface at a point, the normal is `normalize(cross(tan1, tan2))`. So far so good! Now how do we get those tangents?

If my displacement is based on two variables (e.g. if I am displacing `z` based on `x` and `y`), I can get those tangents by calculating the change in displacement in each axis:
```glsl
vec3 normal = normalize(
  cross(
    vec3(1.0, 0.0, dz_by_dx),
    vec3(0.0, 1.0, dz_by_dy)
  )
)
```

Calculating these by hand involves doing a lot of derivatives and chain rules. I'm probably going to mess up my algebra somewhere and spend hours tracking down a minus sign I forgot. Instead, how about I calculate `z` using a domain specific language that can automatically compute `dz/dx` and `dz/dy`?

### e.g. 1D Plane Displacement

In the simplest case, our input mesh is only in 2D, and we displace it in only the third dimension (x and y are independent; z is dependent.) Because of this setup, we can directly compute surface tangents: given a unit vector pointing in a surface direction, we set its z component to be the offset derivative for that axis. The cross product of these tangents then gives us a normal.

```typescript
import { gen } from '@davepagurek/glsl-autodiff'
const vert = `
varying vec3 vVertPos;
void main() {
  vec3 position = vVertPos.xyz;
  ${gen((ad) => {
    // Generate z displacement based on x and y
    const displace: (x: Op, y: Op) => Op = (x, y) => { /* Fill this in */ }
    
    const position = ad.vec3Param('position')
    const offset = displace(position.x(), position.y())
    offset.output('offset')
    offset.outputDeriv('dodx', position.x())
    offset.outputDeriv('dody', position.y())
  })}
  
  // Use the offset
  vec3 outPosition = position;
  outPosition.z += offset;
  
  // The normal is the cross product of two surface tangents, which are
  // the changes in z given a unit change in our two surface directions
  vec3 slopeX = vec3(1., 0., dodx);
  vec3 slopeY = vec3(0., 1., dodx);
  vec3 normal = normalize(cross(slopeX, slopeY));
  
  // TODO do something with outPosition and normal
}
`
```

### e.g. 1D Mesh Displacement

Even if we are still only distorting our mesh in the z axis, it complicates things if we have a mesh without constant normals of its own (meaning it isn't flat, e.g. a sphere).

Like before, we generate a displacement in z based on x and y, and use the displacement derivatives to compute a normal. However, this normal is the normal for a displaced plane, not a sphere. Instead of using it directly, we calculate the *rotation* from an undisplaced plane to this new normal, and then apply that same rotation to the mesh's original normal.

```typescript
import { gen } from '@davepagurek/glsl-autodiff'
const vert = `
varying vec3 vVertPos;
varying vec3 vVertNormal;

// http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat4 axisAngleRotation(vec3 axis, float angle) { /* ... */ }

void main() {
  vec3 position = vVertPos.xyz;
  ${gen((ad) => {
    // Generate z displacement based on x and y
    const displace: (x: Op, y: Op) => Op = (x, y) => { /* Fill this in */ }
    
    const position = ad.vec3Param('position')
    const offset = displace(position.x(), position.y())
    offset.output('offset')
    offset.outputDeriv('dodx', position.x())
    offset.outputDeriv('dody', position.y())
  })}
  
  // Use the offset
  vec3 outPosition = position;
  outPosition.z += offset;
  
  // Compute a normal like before, as if the mesh were a plane
  vec3 slopeX = vec3(1., 0., dodx);
  vec3 slopeY = vec3(0., 1., dodx);
  vec3 displacedPlaneNormal = normalize(cross(slopeX, slopeY));
  
  // The un-displaced normal for our hypothetical plane. This should be
  // the cross product of the two surface vectors.
  vec3 originalPlaneNormal = vec3(0., 0., 1.);
  
  // Find the rotation induced by the displacement
  float angle = acos(dot(noDisplacementNormal, originalPlaneNormal));
  vec3 axis = normalize(cross(noDisplacementNormal, originalPlaneNormal));
  mat4 rotation = axisAngleRotation(axis, -angle);

  // Apply the rotation to the original normal
  vec3 normal = (rotation * vec4(vVertNormal, 0.)).xyz;
  
  // TODO do something with outPosition and normal
}
`
```

### e.g. 3D Mesh Displacement

Now what do we do if we want to full generalize our displacement, so that we can displace using a 3D vector based on the entire 3D position input? Rotating the original normal will still work, but we no longer have two obvious surface tangents to use to come up with a displacement normal.

Our previous tangents were `vec3(1., 0., dodx)` ad `vec3(0., 1., dody)`. These can be re-expressed as a unit vector added to the offset induced by a change in that direction: `vec3(1., 0., 0.) + vec3(0., 0., dodx)` and `vec3(0., 1., 0.) + vec3(0., 0., dody)`. We can do the same thing now to come up with tangents, but where our induced change is a whole vector instead of just the z component! Our induced changes are no longer linearly independent from the input vectors, so this does place us in academically dubious territory, but in practice it seems to work decently.

The other issue is that we have three tangents to worry about now, x, y, and z, but we need only two vectors to produce a normal. Instead of getting a normal from `cross(slopeX, slopeY)`, we can make one of our tangents span two axes, e.g. `cross(slopeX, slopeYZ)` where `slopeYZ = vec3(0., 1., 1.) + dody + dodz)`.

```typescript
import { gen } from '@davepagurek/glsl-autodiff'
const vert = `
varying vec3 vVertPos;
varying vec3 vVertNormal;

// http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat4 axisAngleRotation(vec3 axis, float angle) { /* ... */ }

void main() {
  vec3 position = vVertPos.xyz;
  ${gen((ad) => {
    // Generate x,y,z displacement based on x,y,z input
    const displace: (position: VectorOp) => VectorOp = (pos) => { /* Fill this in */ }
    
    const position = ad.vec3Param('position')
    const offset = displace(position)
    offset.output('offset')
    offset.outputDeriv('dodx', position.x())
    offset.outputDeriv('dody', position.y())
    offset.outputDeriv('dodz', position.z())
  })}
  
  // Use the offset
  vec3 outPosition = position;
  outPosition.z += offset;
  
  // Compute a normal with a surface tangent in X and a surface tangent in YZ to
  // cover all three axes
  vec3 slopeX = vec3(1., 0., 0.) + dodx;
  vec3 slopeYZ = vec3(0., 1., 1.) + dody + dodz;
  vec3 displacedPlaneNormal = normalize(cross(slopeX, slopeYZ));
  
  // The un-displaced normal for our hypothetical plane. This should be
  // the cross product of the two surface vectors.
  vec3 originalPlaneNormal = normalize(cross(vec3(1., 0., 0.), vec3(0., 1., 1.)));
  
  // Find the rotation induced by the displacement
  float angle = acos(dot(noDisplacementNormal, originalPlaneNormal));
  vec3 axis = normalize(cross(noDisplacementNormal, originalPlaneNormal));
  mat4 rotation = axisAngleRotation(axis, -angle);

  // Apply the rotation to the original normal
  vec3 normal = (rotation * vec4(vVertNormal, 0.)).xyz;
  
  // TODO do something with outPosition and normal
}
`
```

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
