const vert = `
//standard vertex shader
#ifdef GL_ES
      precision mediump float;
    #endif

    // attributes, in
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;
    attribute vec4 aVertexColor;

    // attributes, out
    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float wind;
    uniform float anchor;
    uniform float height;

    // matrices
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;


  /*float sinnoise(vec2 u ){
    vec2 zoom = vec2(4.0,4.0);
    vec2 offset = vec2(10.,1.);
    vec2 cumul = u*zoom+offset;
     float a_x = 0.4;
     float a_y = 0.4;
      for(int i=1; i< 4; i++){
        float float_i = float(i);
        cumul.x+= a_x*sin(float_i*cumul.y+time);
        cumul.y+= a_y*cos(float_i*cumul.x+time);
    };

    float r = sin(cumul.x*cumul.y)*.5+.5;
    r = smoothstep(-0.5,1.5,r);
    return r;

    }*/

    void main() {
      vec3 pos = aPosition;
      vec3 inputNorm = aNormal;
      float var_height = height;

      float var_anchor = -pos.x;
      if(anchor == 1.) var_anchor = -pos.y;
      if(anchor == 2.) var_anchor = pos.x;
      if(anchor == 3.) var_anchor = pos.y;

      ${AutoDiff.gen((ad) => {
        const pos = ad.vec2Param('pos.xy')
        const time = ad.param('time')
        const var_anchor = ad.param('var_anchor')
        const var_height = ad.param('var_height')
        const wind = ad.param('wind')

        const smoothstep = (edge0, edge1, x) => {
          const t = x.sub(edge0).div(edge1.sub(edge0)).clamp(0, 1)
          return t.mult(t).mult(t.mult(-2).add(3))
        }

        const sinnoise = (u) => {
          const zoom = ad.vec2(4, 4)
          const offset = ad.vec2(10, 1)
          let cumul = u.mult(zoom).add(offset)
          const a = ad.vec2(0.4, 0.4)
          for (let i = 1; i < 4; i++) {
            cumul = cumul.add(
              ad
                .vec2(
                  ad.sin(ad.val(i).mult(cumul.y()).add(time)),
                  ad.sin(ad.val(i).mult(cumul.x()).add(time)),
                )
                .mult(a),
            )
          }

          const r = ad.sin(cumul.x().mult(cumul.y())).mult(0.5).add(0.5)
          return smoothstep(ad.val(-0.5), ad.val(1.5), r)
        }

        const sn = sinnoise(pos.neg().scale(0.1))
        const z = sn.mult(var_anchor.mult(2).sub(1)).mult(var_height).mult(wind)
        z.output('z')
        z.outputDeriv('dzdx', pos.x())
        z.outputDeriv('dzdy', pos.y())
      })}

      //float sn = sinnoise(-pos.xy*.10);
      //pos.z = sn * (var_anchor*2.-1.) * var_height * wind;
      pos.z = z;
      vec3 slopeX = vec3(1.0, 0.0, dzdx);
      vec3 slopeY = vec3(0.0, 1.0, dzdy);
      vNormal = uNormalMatrix * -normalize(cross(slopeX, slopeY));

      gl_Position = uProjectionMatrix *
                    uModelViewMatrix *
                    vec4(pos, 1.0);

      vPosition = pos;
      vTexCoord = aTexCoord;

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

void main() {

  vec3 materialColor = texture2D(img, vTexCoord).rgb;
  vec3 normal = normalize(vNormal);
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
  //gl_FragColor = vec4(normal, 1.0);
}
`

const makePlane = (detail) => {
  return new p5.Geometry(detail, detail, function() {
    this.gid = `subdivPlane|${detail}`

    const [uVec, vVec] = [createVector(1, 0, 0), createVector(0, 1, 0)]
    const normal = uVec.cross(vVec)

    // This will be the index of the first vertex
    // of this face
    const vertexOffset = this.vertices.length

    for (let i = 0; i < detail; i++) {
      for (let j = 0; j < detail; j++) {
        const u = i / (detail - 1)
        const v = j / (detail - 1)
        this.vertices.push(
          createVector(0, 0, 0)
          .add(uVec.copy().mult(u - 0.5))
          .add(vVec.copy().mult(v - 0.5))
        )
        this.uvs.push([u, v])
        this.vertexNormals.push(normal)
      }
    }

    for (let i = 1; i < detail; i++) {
      for (let j = 1; j < detail; j++) {
        // +--+
        //  \ |
        //    +
        this.faces.push([
          vertexOffset + (j - 1) * detail + i - 1,
          vertexOffset + (j - 1) * detail + i,
          vertexOffset + j * detail + i,
        ])

        // +
        // | \
        // +--+
        this.faces.push([
          vertexOffset + j * detail + i,
          vertexOffset + j * detail + i - 1,
          vertexOffset + (j - 1) * detail + i - 1,
        ])
      }
    }
  })
}

let distortShader
let texture
let subdivPlane
function setup() {
  createCanvas(800, 600, WEBGL)
  distortShader = createShader(vert, frag)
  texture = createGraphics(500, 500)
  subdivPlane = makePlane(40)
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
  distortShader.setUniform('height', 0.4)
  distortShader.setUniform('wind', 1)
  distortShader.setUniform('anchor', 0)
  distortShader.setUniform('time', frameCount*.005)
  distortShader.setUniform('img', texture)
  distortShader.setUniform('lightPositions', lights.map(l => l.position).flat())
  distortShader.setUniform('lightColors', lights.map(l => l.color).flat())
  distortShader.setUniform('lightStrengths', lights.map(l => l.strength).flat())
  distortShader.setUniform('numLights', lights.length)
  distortShader.setUniform('ambientLight', ambient)
  distortShader.setUniform('materialShininess', shininess)
  push()
  const r = 200
  scale(r)
  model(subdivPlane)
  pop()
}
