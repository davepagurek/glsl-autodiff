import { gen, AD } from './index'
import type { VectorOp, VecParam } from './vecBase'
import type { Op, Param } from './base'
import type P5 from 'p5'

type DistortionOptions = {
  type?: 'specular' | 'normal'
}

type Params = {
  glsl: AD
  position: VecParam
  uv: VecParam
  normal: VecParam
  mouse: VecParam
  mouseX: Param
  mouseY: Param
  millis: Param
  pixelDensity: Param
  size: VecParam
  width: Param
  height: Param
  color: VecParam
}

type Material = () => void

declare module 'P5' {
  interface __Graphics__ {
    createWarp(
      getOffset: (params: Params) => VectorOp,
      options: DistortionOptions
    ): Material
  }
}

declare class p5 extends P5 {
  createWarp(
    getOffset: (params: Params) => VectorOp,
    options: DistortionOptions
  ): Material
  static Graphics: new (...args: any[]) => P5.Graphics
}

const createWarp = function(
  getOffset: (params: Params) => VectorOp,
  { type = 'specular' }: DistortionOptions = {}
) {
  const vert = `precision highp float;
precision highp int;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;

uniform vec3 uAmbientColor[5];

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
uniform int uAmbientLightCount;

uniform bool uUseVertexColor;
uniform vec4 uMaterialColor;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vViewPosition;
varying vec3 vAmbientColor;
varying vec4 vColor;

uniform vec2 mouse;
uniform float millis;
uniform float pixelDensity;
uniform vec2 size;

void main(void) {
  vColor = (uUseVertexColor ? aVertexColor : uMaterialColor);

  ${gen((glsl) => {
    const position = glsl.vec3Param('aPosition')
    const millis = glsl.param('millis')
    const mouse = glsl.vec2Param('mouse')
    const mouseX = mouse.x()
    const mouseY = mouse.y()
    const pixelDensity = glsl.param('pixelDensity')
    const size = glsl.vec2Param('size')
    const width = size.x()
    const height = size.y()
    const uv = glsl.vec2Param('aTexCoord')
    const normal = glsl.vec2Param('aNormal')
    const color = glsl.vec4Param('vColor')

    const offset = getOffset({
      glsl,
      position,
      millis,
      mouse,
      mouseX,
      mouseY,
      pixelDensity,
      size,
      width,
      height,
      uv,
      normal,
      color,
    })
    offset.output('offset')

    const adjustedNormal = offset.adjustNormal(normal, position)
    adjustedNormal.output('adjustedNormal')
  })}

  vec4 viewModelPosition = uModelViewMatrix * vec4(aPosition + offset, 1.0);

  // Pass varyings to fragment shader
  vViewPosition = viewModelPosition.xyz;
  gl_Position = uProjectionMatrix * viewModelPosition;  

  vNormal = uNormalMatrix * adjustedNormal;
  vTexCoord = aTexCoord;

  // TODO: this should be a uniform
  vAmbientColor = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    if (i < uAmbientLightCount) {
      vAmbientColor += uAmbientColor[i];
    }
  }
}`

  const frag = `precision highp float;
precision highp int;

uniform bool normalMaterial;

uniform vec4 uSpecularMatColor;
uniform vec4 uAmbientMatColor;
uniform vec4 uEmissiveMatColor;

uniform vec4 uTint;
uniform sampler2D uSampler;
uniform bool isTexture;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vViewPosition;
varying vec3 vAmbientColor;
varying vec4 vColor;

uniform mat4 uViewMatrix;

uniform bool uUseLighting;

uniform int uAmbientLightCount;
uniform vec3 uAmbientColor[5];

uniform int uDirectionalLightCount;
uniform vec3 uLightingDirection[5];
uniform vec3 uDirectionalDiffuseColors[5];
uniform vec3 uDirectionalSpecularColors[5];

uniform int uPointLightCount;
uniform vec3 uPointLightLocation[5];
uniform vec3 uPointLightDiffuseColors[5];	
uniform vec3 uPointLightSpecularColors[5];

uniform int uSpotLightCount;
uniform float uSpotLightAngle[5];
uniform float uSpotLightConc[5];
uniform vec3 uSpotLightDiffuseColors[5];
uniform vec3 uSpotLightSpecularColors[5];
uniform vec3 uSpotLightLocation[5];
uniform vec3 uSpotLightDirection[5];

uniform bool uSpecular;
uniform float uShininess;

uniform float uConstantAttenuation;
uniform float uLinearAttenuation;
uniform float uQuadraticAttenuation;

const float specularFactor = 2.0;
const float diffuseFactor = 0.73;

struct LightResult {
  float specular;
  float diffuse;
};

float _phongSpecular(
  vec3 lightDirection,
  vec3 viewDirection,
  vec3 surfaceNormal,
  float shininess) {

  vec3 R = reflect(lightDirection, surfaceNormal);
  return pow(max(0.0, dot(R, viewDirection)), shininess);
}

float _lambertDiffuse(vec3 lightDirection, vec3 surfaceNormal) {
  return max(0.0, dot(-lightDirection, surfaceNormal));
}

LightResult _light(vec3 viewDirection, vec3 normal, vec3 lightVector) {

  vec3 lightDir = normalize(lightVector);

  //compute our diffuse & specular terms
  LightResult lr;
  if (uSpecular)
    lr.specular = _phongSpecular(lightDir, viewDirection, normal, uShininess);
  lr.diffuse = _lambertDiffuse(lightDir, normal);
  return lr;
}

void totalLight(
  vec3 modelPosition,
  vec3 normal,
  out vec3 totalDiffuse,
  out vec3 totalSpecular
) {

  totalSpecular = vec3(0.0);

  if (!uUseLighting) {
    totalDiffuse = vec3(1.0);
    return;
  }

  totalDiffuse = vec3(0.0);

  vec3 viewDirection = normalize(-modelPosition);

  for (int j = 0; j < 5; j++) {
    if (j < uDirectionalLightCount) {
      vec3 lightVector = (uViewMatrix * vec4(uLightingDirection[j], 0.0)).xyz;
      vec3 lightColor = uDirectionalDiffuseColors[j];
      vec3 specularColor = uDirectionalSpecularColors[j];
      LightResult result = _light(viewDirection, normal, lightVector);
      totalDiffuse += result.diffuse * lightColor;
      totalSpecular += result.specular * lightColor * specularColor;
    }

    if (j < uPointLightCount) {
      vec3 lightPosition = (uViewMatrix * vec4(uPointLightLocation[j], 1.0)).xyz;
      vec3 lightVector = modelPosition - lightPosition;
    
      //calculate attenuation
      float lightDistance = length(lightVector);
      float lightFalloff = 1.0 / (uConstantAttenuation + lightDistance * uLinearAttenuation + (lightDistance * lightDistance) * uQuadraticAttenuation);
      vec3 lightColor = lightFalloff * uPointLightDiffuseColors[j];
      vec3 specularColor = lightFalloff * uPointLightSpecularColors[j];

      LightResult result = _light(viewDirection, normal, lightVector);
      totalDiffuse += result.diffuse * lightColor;
      totalSpecular += result.specular * lightColor * specularColor;
    }

    if(j < uSpotLightCount) {
      vec3 lightPosition = (uViewMatrix * vec4(uSpotLightLocation[j], 1.0)).xyz;
      vec3 lightVector = modelPosition - lightPosition;
    
      float lightDistance = length(lightVector);
      float lightFalloff = 1.0 / (uConstantAttenuation + lightDistance * uLinearAttenuation + (lightDistance * lightDistance) * uQuadraticAttenuation);

      vec3 lightDirection = (uViewMatrix * vec4(uSpotLightDirection[j], 0.0)).xyz;
      float spotDot = dot(normalize(lightVector), normalize(lightDirection));
      float spotFalloff;
      if(spotDot < uSpotLightAngle[j]) {
        spotFalloff = 0.0;
      }
      else {
        spotFalloff = pow(spotDot, uSpotLightConc[j]);
      }
      lightFalloff *= spotFalloff;

      vec3 lightColor = uSpotLightDiffuseColors[j];
      vec3 specularColor = uSpotLightSpecularColors[j];
     
      LightResult result = _light(viewDirection, normal, lightVector);
      
      totalDiffuse += result.diffuse * lightColor * lightFalloff;
      totalSpecular += result.specular * lightColor * specularColor * lightFalloff;
    }
  }

  totalDiffuse *= diffuseFactor;
  totalSpecular *= specularFactor;
}

void main(void) {
  if (normalMaterial) {
    gl_FragColor = vec4(abs(normalize(vNormal)), 1.0);
    return;
  }

  vec3 diffuse;
  vec3 specular;
  totalLight(vViewPosition, normalize(vNormal), diffuse, specular);

  // Calculating final color as result of all lights (plus emissive term).

  vec4 baseColor = isTexture
    // Textures come in with premultiplied alpha. To apply tint and still have
    // premultiplied alpha output, we need to multiply the RGB channels by the
    // tint RGB, and all channels by the tint alpha.
    ? texture2D(uSampler, vTexCoord) * vec4(uTint.rgb/255., 1.) * (uTint.a/255.)
    // Colors come in with unmultiplied alpha, so we need to multiply the RGB
    // channels by alpha to convert it to premultiplied alpha.
    : vec4(vColor.rgb * vColor.a, vColor.a);
  gl_FragColor = vec4(diffuse * baseColor.rgb + 
                    vAmbientColor * uAmbientMatColor.rgb + 
                    specular * uSpecularMatColor.rgb + 
                    uEmissiveMatColor.rgb, baseColor.a);
}`

  const p5 = this as P5.p5InstanceExtensions | P5.Graphics
  const materialShader: P5.Shader = this.createShader(vert, frag)
  const material: Material = () => {
    p5.shader(materialShader)
    materialShader.setUniform('mouse', [p5.mouseX, p5.mouseY])
    materialShader.setUniform('millis', p5.millis())
    materialShader.setUniform('pixelDensity', p5.pixelDensity())
    materialShader.setUniform('size', [p5.width, p5.height])
    materialShader.setUniform('normalMaterial', type === 'normal')
    p5.noStroke()
  }

  return material
}

p5.prototype.createWarp = createWarp
p5.Graphics.prototype.createWarp = createWarp
