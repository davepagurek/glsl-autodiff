# glsl-autodiff

Live demo: https://davepagurek.github.io/glsl-autodiff/test/sinenoise_plane/

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

## Usage
This exposes an `AutoDiff` class that generates GLSL that you can splice into your shader code. Reference existing variables in scope with `ad.param('name')`. Use built-in operations to compute values based on these parameters. At the end, specify the names you want to refer to values by using `.output('name')`. Additionally, specify a name for the derivative with respect to `param` with `.outputDeriv('name', param)`.
```js
const vert = `
void main(void) {
  vec4 objSpacePosition = vec4(aPosition, 1.0);

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
