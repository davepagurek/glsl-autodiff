const vert = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

uniform float time;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

void main(void) {
  vec4 objSpacePosition = vec4(aPosition, 1.0);
  float origZ = objSpacePosition.z;
  ${AutoDiff.gen((ad) => {
    const pos = ad.vec3Param('objSpacePosition')
    const x = pos.x()
    const y = pos.y()
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
    offset = ad.vec3(0, 0, offset)
    offset.output('offset')
    offset.adjustNormal(ad.vec3Param('aNormal'), pos).output('normal')
    //offset.output('z')
    //offset.outputDeriv('dzdx', x)
    //offset.outputDeriv('dzdy', y)
  }, { debug: true, maxDepthPerVariable: 4 })}
  objSpacePosition.xyz += offset;
  //vec3 slopeX = vec3(1.0, 0.0, dzdx);
  //vec3 slopeY = vec3(0.0, 1.0, dzdy);
  vec4 worldSpacePosition = uModelViewMatrix * objSpacePosition;
  gl_Position = uProjectionMatrix * worldSpacePosition;
  vTexCoord = aTexCoord;
  vPosition = worldSpacePosition.xyz;
  //vNormal = uNormalMatrix * aNormal;
  //normal=cross(_glslad_v61,_glslad_v60);
  //normal=_glslad_v61;
  vNormal = uNormalMatrix * normal;
}
`
console.log(vert)

const frag = `
precision mediump float;
const int MAX_LIGHTS = 3;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D img;
uniform int numLights;
uniform vec3 lightPositions[MAX_LIGHTS];
uniform vec3 lightColors[MAX_LIGHTS];
uniform float lightStrengths[MAX_LIGHTS];
uniform vec3 ambientLight;
uniform float materialShininess;

void main(void) {
  vec3 materialColor = texture2D(img, vTexCoord).rgb;
  vec3 normal = normalize(vNormal);
  gl_FragColor = vec4(abs(normal), 1.); return;
  vec3 color = vec3(0.0, 0.0, 0.0);
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= numLights) break;
    vec3 lightPosition = lightPositions[i];
    float distanceSquared = 0.0; /*0.00015*dot(
      lightPosition - vPosition,
      lightPosition - vPosition);*/
    vec3 lightDir = normalize(lightPosition - vPosition);
    float lambertian = max(dot(lightDir, normal), 0.0);
    color += lambertian * materialColor * lightColors[i] *
      lightStrengths[i] / (1.0 + distanceSquared);
    vec3 viewDir = normalize(-vPosition);
    float spec = pow(
      max(dot(viewDir, reflect(-lightDir, normal)), 0.0),
      materialShininess);
    color += spec * lightStrengths[i] * lightColors[i] /
      (1.0 + distanceSquared);
  }
  color += ambientLight * materialColor;
  gl_FragColor = vec4(color, 1.0);
}
`

let distortShader
let texture
function setup() {
  createCanvas(800, 600, WEBGL)
  distortShader = createShader(vert, frag)
  texture = createGraphics(500, 500)
}

const lights = [{
    position: [200, 50, -100],
    color: [1, 1, 1],
    strength: 0.5,
  },
  {
    position: [-200, -50, -100],
    color: [1, 1, 1],
    strength: 0.5,
  },
];

function draw() {
  texture.background(255, 0, 0)
  texture.fill(255)
  texture.noStroke()
  texture.textSize(70)
  texture.textAlign(CENTER, CENTER)
  texture.text('hello, world', texture.width / 2, texture.height / 2)

  background(0)

  const shininess = 1000
  const ambient = [0.2, 0.2, 0.2]

  orbitControl()
  noStroke()
  shader(distortShader)
  distortShader.setUniform('img', texture)
  distortShader.setUniform('lightPositions', lights.map(l => l.position).flat())
  distortShader.setUniform('lightColors', lights.map(l => l.color).flat())
  distortShader.setUniform('lightStrengths', lights.map(l => l.strength).flat())
  distortShader.setUniform('numLights', lights.length)
  distortShader.setUniform('ambientLight', ambient)
  distortShader.setUniform('materialShininess', shininess)
  distortShader.setUniform('time', millis())
  push()
  sphere(200, 60, 30)
  pop()
}
