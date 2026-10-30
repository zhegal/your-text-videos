import * as THREE from "three";
import motion from "./camera-motion.json";
import { layoutTextRows } from "./text-layout.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export const WIDTH = 960;
export const HEIGHT = 720;
export const FPS = 30;
export const FRAMES = 127;
export const DURATION = FRAMES / FPS;

const vertexShader = `varying vec2 vUv;
void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);

export async function createStudio(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute("role", "img");
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.1, 100);
  camera.position.set(0, 0, 8.7);
  camera.updateMatrixWorld();
  const root = new THREE.Group();
  scene.add(root);
  const textGroup = new THREE.Group();
  root.add(textGroup);
  const font = await new FontLoader().loadAsync(
    `${import.meta.env.BASE_URL}fonts/chrome-bold.json`,
  );

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color("#454647");
  const addSoftbox = (
    position,
    scale,
    color,
    intensity,
    aimAtOrigin = true,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(...scale),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.material.color.multiplyScalar(intensity);
    mesh.position.set(...position);
    if (aimAtOrigin) mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
  };
  addSoftbox([0, 5, 4], [11, 5], "#9bb8e3", 0.45);
  addSoftbox([-5, 1, 5], [3.5, 8], "#ffffff", 0.65);
  addSoftbox([6, -1, 3], [2, 8], "#c3c9d9", 0.7);
  addSoftbox([1, -5, 3], [9, 1.5], "#b5b7b8", 0.9);
  addSoftbox([0, 2, -5], [8, 3], "#dad8d5", 0.8);
  addSoftbox([3.5, 1.25, 5], [10, 1.8], "#d0e3ff", 3.8, false);
  addSoftbox([3.5, -1.6, 5], [10, 2], "#c2c4c8", 0.25, false);
  addSoftbox([3, 3.2, 5], [9, 1.4], "#95b6ee", 0.95, false);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(envScene, 0.12);
  envScene.scale.x = -1;
  const mirroredEnvironment = pmrem.fromScene(envScene, 0.12);
  scene.environment = environment.texture;
  pmrem.dispose();
  envScene.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });

  const front = new THREE.MeshStandardMaterial({
    color: "#9daac2",
    metalness: 0.82,
    roughness: 0.22,
    envMapIntensity: 0.95,
  });
  const side = new THREE.MeshStandardMaterial({
    color: "#b8b8b2",
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.2,
  });
  scene.add(new THREE.HemisphereLight("#d9e5f5", "#252525", 1.1));
  const key = new THREE.DirectionalLight("#f0f2ff", 1.5);
  key.position.set(-3, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#9cbaff", 0.8);
  rim.position.set(6, 2, 1);
  scene.add(rim);
  const pinkLight = new THREE.PointLight("#ffe4fb", 0.7, 8, 2);
  pinkLight.position.set(-0.25, 0.25, 2.3);
  root.add(pinkLight);
  const blueLight = new THREE.PointLight("#729eff", 0.32, 8, 2);
  root.add(blueLight);

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 40),
    new THREE.ShaderMaterial({
      depthWrite: false,
      vertexShader,
      uniforms: { uGlow: { value: 1 }, uSide: { value: 1 } },
      fragmentShader: `varying vec2 vUv; uniform float uGlow; uniform float uSide;
    void main(){
      vec2 p=gl_FragCoord.xy/vec2(960.,720.);
      if(uSide<0.) p.x=1.-p.x;
      vec3 c=vec3(.010,.010,.010);
      c+=vec3(.006,.011,.020)*exp(-length((p-vec2(.63,.72))*vec2(1.1,1.5))*4.)*uGlow;
      c+=vec3(.075,.073,.115)*exp(-length((p-vec2(.22,.6))*vec2(1.5,1.))*4.);
      gl_FragColor=vec4(c,1.);
    }`,
    }),
  );
  background.position.z = -12;
  background.renderOrder = -100;

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(WIDTH, HEIGHT);
  composer.renderToScreen = false;
  composer.renderTarget1.samples = 4;
  composer.renderTarget2.samples = 4;
  background.material.depthTest = false;
  const backgroundPass = new ShaderPass(background.material);
  backgroundPass.clear = true;
  composer.addPass(backgroundPass);
  const scenePass = new RenderPass(scene, camera);
  scenePass.clear = false;
  composer.addPass(scenePass);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(WIDTH, HEIGHT),
    0.35,
    0.65,
    1.5,
  );
  composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 1 },
      uGlow: { value: 1 },
      uSide: { value: 1 },
      uFlare1: { value: new THREE.Vector2() },
      uFlare2: { value: new THREE.Vector2() },
      uFlareVisible: { value: 1 },
    },
    vertexShader,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse;
      uniform vec2 uFlare1; uniform vec2 uFlare2; uniform float uTime; uniform float uGlow; uniform float uFlareVisible; uniform float uSide;
      vec3 flare(vec2 p,vec2 center,float intensity){
        vec2 d=(p-center)*vec2(1.333333,1.);
        d.x*=uSide;
        float r=length(d);
        float core=.005/(r*r+.000035);
        vec3 color=vec3(1.,.90,.96)*core*.022;
        color+=vec3(.40,.42,.50)*exp(-r*18.)*.18;
        float ring=exp(-pow((r-.046)/.003,2.));
        color+=vec3(.75,.25,.55)*ring*.35;
        float star=exp(-abs(d.y-d.x*.28)*550.)*exp(-r*24.);
        float cross=exp(-abs(d.x+d.y*.28)*950.)*exp(-r*45.);
        color+=vec3(1.,.85,.96)*(star*.6+cross*.4);
        return color*intensity;
      }
      void main(){
        vec3 c=texture2D(tDiffuse,vUv).rgb;
        c+=flare(vUv,uFlare1,1.)*uGlow*uFlareVisible;
        c+=flare(vUv,uFlare2,.4)*uGlow*uFlareVisible;
        float vignette=1.-.34*pow(length((vUv-.5)*vec2(1.1,.9)),1.3);
        c*=vignette;
        float grain=fract(sin(dot(floor(vUv*vec2(960.,720.)),vec2(12.9898,78.233))+floor(uTime*30.))*43758.5453);
        c+=(grain-.5)*.005;
        gl_FragColor=vec4(c,1.);
      }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  const targets = [0, 1].map(
    () =>
      new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
      }),
  );
  const averageMaterial = new THREE.ShaderMaterial({
    uniforms: {
      current: { value: null },
      previous: { value: null },
      weight: { value: 1 },
    },
    vertexShader,
    fragmentShader: `varying vec2 vUv; uniform sampler2D current; uniform sampler2D previous; uniform float weight;
      void main(){gl_FragColor=mix(texture2D(previous,vUv),texture2D(current,vUv),weight);}`,
    depthTest: false,
    depthWrite: false,
  });
  const averageQuad = new FullScreenQuad(averageMaterial);
  const copyMaterial = new THREE.ShaderMaterial({
    uniforms: { image: { value: null } },
    vertexShader,
    fragmentShader:
      "varying vec2 vUv; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,vUv);}",
    depthTest: false,
    depthWrite: false,
  });
  const copyQuad = new FullScreenQuad(copyMaterial);
  let rows = [];
  let glow = 1;
  let textScale = 1;
  let sideSign = 1;
  const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
  const view = new THREE.Matrix4();
  const viewProjection = new THREE.Matrix4();
  const entryTransform = new THREE.Matrix4();
  const entryX = [
    -1200, -850, -590, -389, -248, -177, -112, -68, -39, -21, -9, -2.4, 0,
  ];
  function interpolateEntry(values, frame) {
    const i = Math.floor(frame);
    const t = frame - i;
    const p0 = values[Math.max(0, i - 1)];
    const p1 = values[i];
    const p2 = values[Math.min(12, i + 1)];
    const p3 = values[Math.min(12, i + 2)];
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    );
  }
  const rotation = new THREE.Euler();
  const pivot = new THREE.Vector3();
  const translation = new THREE.Vector3();
  const flareWorld = new THREE.Vector3();

  function setText(lines, depth = 1) {
    const normalized = lines
      .map((line) => line.normalize("NFC").trim())
      .filter(Boolean);
    const unsupported = [
      ...new Set(
        Array.from(normalized.join("")).filter(
          (char) => !font.data.glyphs[char],
        ),
      ),
    ];
    if (unsupported.length)
      throw Object.assign(new Error("Unsupported glyphs"), {
        code: "unsupportedGlyphs",
        characters: unsupported.slice(0, 6).join(" "),
      });
    const nextRows = [];
    try {
      for (const text of normalized) {
        const geometry = new TextGeometry(text, {
          font,
          size: 1,
          depth: 1.8 * depth,
          curveSegments: 14,
          bevelEnabled: true,
          bevelThickness: 0.003,
          bevelSize: 0.002,
          bevelSegments: 3,
        });
        geometry.computeBoundingBox();
        const box = geometry.boundingBox.clone();
        geometry.translate(-(box.min.x + box.max.x) / 2, 0, -1.8 * depth);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          positions.setX(
            i,
            positions.getX(i) + positions.getZ(i) * 0.085 * sideSign,
          );
        }
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        nextRows.push({
          mesh: new THREE.Mesh(geometry, [front, side]),
          text,
          width: box.max.x - box.min.x,
          minY: box.min.y,
          maxY: box.max.y,
        });
      }
    } catch (error) {
      nextRows.forEach((row) => row.mesh.geometry.dispose());
      throw error;
    }
    rows.forEach((row) => {
      textGroup.remove(row.mesh);
      row.mesh.geometry.dispose();
    });
    rows = nextRows;
    const layout = layoutTextRows(rows, motion.gap);
    textScale = layout.scale;
    rows.forEach((row, i) => {
      row.scale = layout.rows[i].scale;
      row.mesh.scale.setScalar(row.scale);
      row.mesh.position.y = layout.rows[i].y;
      textGroup.add(row.mesh);
    });
    textGroup.scale.setScalar(textScale);
  }

  function placeFlare(target, x, y, z) {
    flareWorld.set(x, y, z);
    root.localToWorld(flareWorld);
    flareWorld.project(camera);
    target.set((flareWorld.x + 1) / 2, (flareWorld.y + 1) / 2);
  }
  function pose(t) {
    const frame = THREE.MathUtils.clamp(
      t * motion.fps,
      0,
      motion.frames.length - 1,
    );
    const sourceFrame = Math.max(12, frame);
    const index = Math.floor(sourceFrame);
    const next = Math.min(index + 1, motion.frames.length - 1);
    const alpha = sourceFrame - index;
    const from = motion.frames[index];
    const to = motion.frames[next];
    const h = from.h.map((v, i) => THREE.MathUtils.lerp(v, to.h[i], alpha));
    const p = from.pose.map((v, i) =>
      THREE.MathUtils.lerp(v, to.pose[i], alpha),
    );
    rotation.set(p[0], p[1], p[2], "XYZ");
    view.makeRotationFromEuler(rotation);
    pivot.set(motion.centerX, -motion.gap / 2, 0).applyMatrix4(view);
    translation.set(p[3] / 2.048, p[4] / 2.048, p[5] / 2.048).add(pivot);
    view.setPosition(translation);
    camera.matrixWorld.copy(view).invert();
    camera.matrixWorld.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );
    camera.updateMatrixWorld(true);

    // Калибровка лицевой плоскости по MP4; третья колонка задаёт перспективу экструзии.
    const x = [0, 1, 2].map((i) => (h[i] - 360 * h[6 + i]) / 480);
    const y = [0, 1, 2].map((i) => (360 * h[6 + i] - h[3 + i]) / 360);
    const w = [h[6], h[7], h[8]];
    const cx = motion.centerX * 2048;
    const cy = -motion.gap * 1024;
    const ox = x[0] * cx + x[1] * cy + x[2];
    const oy = y[0] * cx + y[1] * cy + y[2];
    const ow = w[0] * cx + w[1] * cy + w[2];
    const scale = ow / -translation.z;
    const e = view.elements;
    const zx = (p[6] / 480) * e[8] * scale;
    const zy = (p[6] / 360) * e[9] * scale;
    const zw = -e[10] * scale;
    const a = 100.01 / 99.99;
    const b = -2 / 99.99;
    viewProjection.set(
      x[0] * 2048,
      x[1] * 2048,
      zx,
      ox,
      y[0] * 2048,
      y[1] * 2048,
      zy,
      oy,
      a * w[0] * 2048,
      a * w[1] * 2048,
      a * zw,
      a * ow + b * scale,
      w[0] * 2048,
      w[1] * 2048,
      zw,
      ow,
    );
    if (frame < 12) {
      entryTransform.makeTranslation(
        interpolateEntry(entryX, frame) / 480,
        0,
        0,
      );
      viewProjection.premultiply(entryTransform);
    }
    if (sideSign < 0) {
      // Reflect both coordinate systems so the camera changes sides and text stays readable.
      viewProjection.premultiply(mirror).multiply(mirror);
      camera.matrixWorld.premultiply(mirror).multiply(mirror);
      camera.matrixWorld.decompose(
        camera.position,
        camera.quaternion,
        camera.scale,
      );
      camera.updateMatrixWorld(true);
    }
    camera.projectionMatrix.copy(viewProjection).multiply(camera.matrixWorld);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    scene.updateMatrixWorld(true);

    if (rows.length) {
      const lower = rows[rows.length - 1];
      const advance = font.data.glyphs[Array.from(lower.text)[0]].ha / 1000;
      const drift = smooth(0.4, 4.2, t);
      const flareX =
        (-lower.width / 2 + advance * (0.65 + 0.22 * drift)) *
        lower.scale *
        textScale *
        sideSign;
      const flareY =
        (lower.mesh.position.y + (0.54 + 0.084 * drift) * lower.scale) *
        textScale;
      placeFlare(finish.uniforms.uFlare1.value, flareX, flareY, 0.006);
      placeFlare(
        finish.uniforms.uFlare2.value,
        (rows[0].width / 2 - 0.035) * rows[0].scale * textScale * sideSign,
        (rows[0].mesh.position.y + 0.51 * rows[0].scale) * textScale,
        0.006,
      );
      const anchor = new THREE.Vector3(flareX, flareY, 0.006);
      const reflection = camera.position.clone().sub(anchor).normalize();
      reflection.x *= -1;
      reflection.y *= -1;
      pinkLight.position.copy(anchor).addScaledVector(reflection, 0.7);
      anchor.set(
        (rows[0].width / 2 - 0.1) * rows[0].scale * textScale * sideSign,
        (rows[0].mesh.position.y + 0.35 * rows[0].scale) * textScale,
        0.006,
      );
      reflection.copy(camera.position).sub(anchor).normalize();
      reflection.x *= -1;
      reflection.y *= -1;
      blueLight.position.copy(anchor).addScaledVector(reflection, 0.7);
    }
    finish.uniforms.uFlareVisible.value =
      smooth(0.04, 0.2, t) * (rows.length ? 1 : 0);
    finish.uniforms.uTime.value = t;
  }

  function render(t, exporting = false) {
    const samples = t < 0.45 ? (exporting ? 10 : 5) : 1;
    for (let i = 0; i < samples; i++) {
      pose(
        samples === 1 ? t : Math.max(0, t - (1 - i / samples) * (0.85 / FPS)),
      );
      composer.render();
      const write = i % 2;
      averageMaterial.uniforms.current.value = composer.readBuffer.texture;
      averageMaterial.uniforms.previous.value = targets[1 - write].texture;
      averageMaterial.uniforms.weight.value = 1 / (i + 1);
      renderer.setRenderTarget(targets[write]);
      averageQuad.render(renderer);
    }
    copyMaterial.uniforms.image.value = targets[(samples - 1) % 2].texture;
    renderer.setRenderTarget(null);
    copyQuad.render(renderer);
  }
  function setGlow(value) {
    glow = value;
    bloom.strength = 0.35 * glow;
    finish.uniforms.uGlow.value = glow;
    background.material.uniforms.uGlow.value = glow;
    pinkLight.intensity = 0.7 * glow;
    blueLight.intensity = 0.32 * glow;
  }
  function setSide(value) {
    const nextSign = value === "right" ? -1 : 1;
    if (nextSign === sideSign) return;
    for (const row of rows) {
      const geometry = row.mesh.geometry;
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setX(
          i,
          positions.getX(i) + positions.getZ(i) * 0.085 * (nextSign - sideSign),
        );
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    sideSign = nextSign;
    scene.environment =
      sideSign < 0 ? mirroredEnvironment.texture : environment.texture;
    key.position.x = -3 * sideSign;
    rim.position.x = 6 * sideSign;
    background.material.uniforms.uSide.value = sideSign;
    finish.uniforms.uSide.value = sideSign;
  }
  setText(["Your", "Text"]);
  return { canvas: renderer.domElement, render, setText, setGlow, setSide };
}
