import {vec2, vec3, vec4, mat4, glMatrix} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import MeshInstanced from './geometry/MeshInstanced';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture from './rendering/gl/Texture';
import SpotLight from './lights/SpotLight';
import PointLight from './lights/PointLight';
import WFC from './WFC';


var Logger = require('debug');
var mainAppLog = Logger("mainApp:WFC:trace");
var mainAppLogInfo = Logger("mainApp:WFC:info");
var mainAppLogError = Logger("mainApp:WFC:error");


function axisAngleToQuaternion(axis: vec3, angle: number) {
  let quat = vec4.create();
  let cos = Math.cos(angle / 2.0);
  let sin = Math.sin(angle / 2.0);

  let scaledAxis = vec3.create();
  vec3.scale(scaledAxis, axis, sin);

  quat[0] = scaledAxis[0];
  quat[1] = scaledAxis[1];
  quat[2] = scaledAxis[2];
  quat[3] = cos;

  return quat;
}

let captureIndex = 0;

let shouldCapture: boolean = false;

const MOONLIGHT_COLOR = [68, 77, 175];
const WHITE_COLOR = [255, 255, 255];
let useMoonlight:boolean = true;

function toggleLightColor() {
  if (useMoonlight) {
    controls.skyLight.color = WHITE_COLOR;
  } else {
    controls.skyLight.color = MOONLIGHT_COLOR;
  }

  useMoonlight = !useMoonlight;
}

let wfc: any;



const SM_VIEWPORT_TRANSFORM:mat4 = mat4.fromValues(
  0.5, 0.0, 0.0, 0.0,
  0.0, 0.5, 0.0, 0.0,
  0.0, 0.0, 0.5, 0.0,
  0.5, 0.5, 0.5, 1.0);

let showEmpty = false;

function toggleEmpty() {
  showEmpty = !showEmpty;
}

let controls = {
  saveImage: saveImage,
  newScene: newScene,
  doWFC: doWFC,
  iterateScene: iterateScene,
  oneStep: oneStep,
  toggleEmpty: toggleEmpty,
  toggleLightColor: toggleLightColor,
  skyLight: {
    color: WHITE_COLOR,
    intensity: 1.5,
    direction: [12, 6, 10]
  },
  wfc: {
    gridX: 8,
    gridY: 8,
    gridZ: 4,
    isDebug: false
  },
  camera: {
    isOrtho: true
  },
  godray: {
    enabled: true,
    blend: 1.0,
    iterations: 4,
    density: 1.0,
    weight: 0.75,
    decay: 0.75,
    exposure: 1.0
  },
  dof: {
    enabled: false,
    focalLength: 20,
    inFocusPlaneSize: 15,
    blend: 1.0
  },
  tonemap: {
    enabled: true
  },
  bloom: {
    enabled: false,
    blend: 1.0,
    iterations: 1
  },
  artistic: {
    effect: 'none'
  }
};

function doWFC(capture : boolean) {
  let isDebug = controls.wfc.isDebug;

  wfc = new WFC('Test', null, controls.wfc.gridX, controls.wfc.gridY, controls.wfc.gridZ, false, "ground", "empty", "empty", "empty", isDebug);
  wfc.captureState = true;

  let limit = isDebug ? 15 : 15;

  for (let k = 0; k < limit; k++) {
    let result = wfc.run();

    if (result) {
      mainAppLogInfo('Generated Scene');
      break;

    } else {
      mainAppLogError('Failed to Generate Scene: Contradiction');
    }
  }

  return wfc.transformOutput();
}

let obj0: string;

let tex0: Texture;
let lights: Array<PointLight> = [];

let meshes:any = {
  'down' : './resources/test/down.obj',
  'line' : './resources/test/line.obj',
  'turn' : './resources/test/turn.obj',
  'up' : './resources/test/up.obj',
  'ground' : './resources/obj/Ground.obj',
  'vertical' : './resources/test/vertical.obj',
  'wall1' : './resources/test/wall1.obj',
  'gate1' : './resources/test/gate1.obj',
  'stair1' : './resources/test/stair1.obj',
  'stair2' : './resources/test/stair2.obj',
  'filler1' : './resources/test/filler1.obj',
  'platform' : './resources/test/platform.obj',
  'pipeL' : './resources/test/pipe1.obj',
  'pipeT' : './resources/test/pipe2.obj',
  'wallside1' : './resources/test/wallside1.obj',
  'wallroof1' : './resources/test/wallroof1.obj',
  'straightwall1' : './resources/test/straightwall1.obj',
  'wall_straight_1' : './resources/test/wall_straight_1.obj',
  'roof_straight_1' : './resources/test/roof_straight_1.obj',
  'roof_curved_1' : './resources/test/roof_curved_1.obj',
  'WallStraight1' : './resources/obj/WallStraight1.obj',
  'WallCurved1' : './resources/obj/WallCurved1.obj',
  'WallGate1' : './resources/obj/WallGate1.obj',
  'WallGate2' : './resources/obj/WallGate2.obj',
  'WallJunction1' : './resources/obj/WallJunction1.obj',
  'WallJunction_Tall' : './resources/obj/WallJunction_Tall.obj',
  'WallJunction_TallUpper' : './resources/obj/WallJunction_TallUpper.obj',
  'WallJunction_Middle' : './resources/obj/WallJunction_Middle.obj',
  'WallCurved_Tall' : './resources/obj/WallCurved_Tall.obj',
  'WallCurved_Middle' : './resources/obj/WallCurved_Middle.obj',
  'WallCurved_Middle2' : './resources/obj/WallCurved_Middle2.obj',
  'WallCurved_TallUpper' : './resources/obj/WallCurved_TallUpper.obj',
  'WallCurved_TallUpper1' : './resources/obj/WallCurved_TallUpper1.obj',
  'roof' : './resources/obj/roof.obj',
  'WallStraight2' : './resources/obj/WallStraight2.obj',
  // 'empty' : './resources/test/empty.obj',
  // 'sky' : './resources/test/empty.obj',
};

let textures: any = [
  ['./resources/test/down.png', './resources/textures/default_emissive.png'],
  ['./resources/test/line.png', './resources/textures/default_emissive.png'],
  ['./resources/test/turn.png', './resources/textures/default_emissive.png'],
  ['./resources/test/up.png', './resources/textures/default_emissive.png'],
  ['./resources/test/ground.png', './resources/textures/default_emissive.png'],
  ['./resources/test/vertical.png', './resources/textures/default_emissive.png'],
  ['./resources/test/wall1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/gate1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/stair1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/stair2.png', './resources/textures/default_emissive.png'],
  ['./resources/test/filler1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/platform.png', './resources/textures/default_emissive.png'],
  ['./resources/test/pipe1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/pipe2.png', './resources/textures/default_emissive.png'],
  ['./resources/test/wallside1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/wallroof1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/straightwall1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/wall_straight_1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/roof_straight_1.png', './resources/textures/default_emissive.png'],
  ['./resources/test/roof_curved_1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallStraight1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallGate1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallGate2.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallJunction1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallJunction_Tall.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallJunction_TallUpper.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallJunction_Middle.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved_Tall.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved_Middle.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved_Middle2.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved_TallUpper.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallCurved_TallUpper1.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/roof.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/WallStraight2.png', './resources/textures/default_emissive.png'],
  ['./resources/obj/Ground.png', './resources/textures/default_emissive.png'],
  // ['./resources/test/empty.png', './resources/textures/default_emissive.png'],
  // ['./resources/test/empty.png', './resources/textures/default_emissive.png'],
];

let sceneOBJs: { [symbol: string]: string; } = { };
let sceneMeshMap: { [symbol: string]: MeshInstanced; } = { };
let sceneMeshes: Array<MeshInstanced> = [];
let sceneTextures: Array<Array<Texture>> = [];

var timer = {
  deltaTime: 0.0,
  startTime: 0.0,
  currentTime: 0.0,
  updateTime: function() {
    var t = Date.now();
    t = (t - timer.startTime) * 0.001;
    timer.deltaTime = t - timer.currentTime;
    timer.currentTime = t;
  },
}

function arrayToVec4(arr: any) {
  return vec4.fromValues(arr[0], arr[1], arr[2], arr[3]);
}

function arrayToVec3(arr: any) {
  return vec3.fromValues(arr[0], arr[1], arr[2]);
}

function getPointLight(config: any) {
  let light = new PointLight();
  light.ambient =  vec4.fromValues(0.2, 0.2, 0.2, 1);
  light.diffuse = config.diffuse ? arrayToVec4(config.diffuse) : vec4.fromValues(15, 15, 15, 1);
  light.specular = config.specular ? arrayToVec4(config.specular) : vec4.fromValues(5.0, 5.0, 5.0, 1);
  light.position = vec3.fromValues(config.position[0], config.position[1], config.position[2]);
  light.range = config.range || 20;
  light.attn = config.attn ? arrayToVec3(config.attn) : vec3.fromValues(1, 1, 4);

  return light;
}

function loadOBJText() {
  obj0 = readTextFile('../resources/obj/wahoo.obj');

  for(var key in meshes) {
    sceneOBJs[key] = readTextFile(meshes[key]);
  }
}

let interval:any;

function newScene() {
  loadScene(false);
}

function iterateScene() {
  interval = setInterval(function() {
    loadScene(true);
    ++captureIndex;
  }, 50);
}

function oneStep() {
  loadScene(true);
  ++captureIndex;
}

function computeLightingForVoxel(voxel: any) {
  if (voxel.mesh == "WallGate1") {

    let config:any = {};
    config.position = vec3.create();
    vec3.add(config.position, config.position, vec3.fromValues(voxel.position[0], voxel.position[1], voxel.position[2]));

    lights.push(getPointLight(config));
  }
}

function loadScene(capture:boolean = false) {
  let transforms = [];
  if (!capture) {
    transforms = doWFC(capture);
    mainAppLogInfo(`Recorded ${wfc.states.length} states`);
  } else {
    mainAppLogInfo('Showing State:' , captureIndex);
    transforms = wfc.transformState(wfc.states[captureIndex]);

    if (captureIndex > wfc.states.length) {
      clearInterval(interval);
      transforms = wfc.transformOutput();
    }
  }

  lights = [];

  for (var i = 0; i < sceneMeshes.length; ++i) {
    sceneMeshes[i].destory();
  }

  sceneMeshes = [];

  for(var key in sceneOBJs) {
    let mesh = new MeshInstanced('InstanceMesh_' + key, sceneOBJs[key]);
    sceneMeshes.push(mesh);
    sceneMeshMap[key] = mesh;
  }

  let groundMesh = sceneMeshMap['ground'];

  // for (var x = 0; x < 10; ++x) {
  //   for (var y = 0; y < 10; ++y) {
  //     groundMesh.addInstance(vec4.fromValues(x * 3, y * 3, 0, 1), axisAngleToQuaternion(vec3.fromValues(1,0,0), 0), vec3.fromValues(1,1,1));
  //   }
  // }

  for (var itr = 0; itr < transforms.length; ++itr) {
    let voxel = transforms[itr];

    let mesh = sceneMeshMap[voxel.mesh];

    // computeLightingForVoxel(voxel);

    if (mesh) {
      mesh.addInstance(voxel.position, vec4.fromValues(voxel.rotation[0], voxel.rotation[1], voxel.rotation[2], voxel.rotation[3]), voxel.scale);
    }
  }

  mainAppLogInfo(`Created ${lights.length} Lights`);

  for (var itr = 0; itr < sceneMeshes.length; ++itr) {
    sceneMeshes[itr].create();
  }

  for (var itr = 0; itr < textures.length; ++itr) {
    let tex1 = new Texture(textures[itr][0]);
    let tex2 = new Texture(textures[itr][1]);
    sceneTextures.push([tex1, tex2]);
  }

  tex0 = new Texture('./resources/textures/wahoo.bmp')
}

function saveImage() {
  shouldCapture = true;
}

function downloadImage() {
  // Dump the canvas contents to a file.
  var canvas = <HTMLCanvasElement>document.getElementById("canvas");
  canvas.toBlob(function(blob) {
    var link = document.createElement("a");
    link.download = "image.png";

    link.href = URL.createObjectURL(blob);
    mainAppLogInfo(blob);

    link.click();

  }, 'image/png');
}

function setShadowMapData(shader: any, shader2: any) {
  let lightDir = controls.skyLight.direction;
  let lightDirection =  vec3.fromValues(lightDir[0], lightDir[1], lightDir[2]);

  let lightSpaceOrthoProj = mat4.create();
  mat4.ortho(lightSpaceOrthoProj, -150.0, 150.0, -150.0, 150.0, -500, 200.0);

  let lightSpaceView = mat4.create();
  mat4.lookAt(lightSpaceView, lightDirection, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1));
  let lightSpaceModel = mat4.create();
  let lightSpaceViewProj = mat4.create();

  mat4.multiply(lightSpaceViewProj, lightSpaceOrthoProj, lightSpaceView);

  // Convert Model Space -> Light Space Matrix (outputs NDC) to output texCoords between 0 & 1
  let lightSpaceToViewport = mat4.create();
  mat4.multiply(lightSpaceToViewport, SM_VIEWPORT_TRANSFORM, lightSpaceViewProj);

  shader.setShadowMapMatrices(lightSpaceViewProj, lightSpaceToViewport);
  shader2.setShadowMapMatrices(lightSpaceViewProj, lightSpaceToViewport);

  // let t = vec4.fromValues(25,25,20,1);
  // vec4.transformMat4(t, t, lightSpaceViewProj);
  // mainAppLogInfo(t);
}


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  var group;
  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'saveImage').name('Save Image');
  gui.add(controls, 'toggleLightColor').name('Toggle Sky Color');

  group = gui.addFolder('WFC');
  group.add(controls, 'iterateScene').name('Show States');
  group.add(controls, 'oneStep').name('Jump One State');
  group.add(controls, 'newScene').name('New WFC Scene');
  group.add(controls.wfc, 'gridX', 4, 16).step(1).name('Size X');
  group.add(controls.wfc, 'gridY', 4, 16).step(1).name('Size Y');
  group.add(controls.wfc, 'isDebug').name('Capture States');
  group.open();

  group = gui.addFolder('Tonemap');
  group.add(controls.tonemap, 'enabled').name('Enabled').listen();

  group = gui.addFolder('Sky Light');
  group.addColor(controls.skyLight, 'color').name('Color').listen();
  group.add(controls.skyLight, 'intensity', 0, 10.0).step(0.05).name('Intensity').listen();

  group = group.addFolder('Light Position');
  group.add(controls.skyLight.direction, '0', -20, 20).step(0.5).name('X').listen();
  group.add(controls.skyLight.direction, '1', -20, 20).step(0.5).name('Y').listen();
  group.add(controls.skyLight.direction, '2', -20, 20).step(0.5).name('Z').listen();

  group = gui.addFolder('Bloom');
  group.add(controls.bloom, 'blend', 0, 1.0).step(0.05).name('Blend Amount').listen();
  group.add(controls.bloom, 'iterations', 1.0, 10.0).step(1.0).name('Iterations').listen();
  group.add(controls.bloom, 'enabled').name('Enabled').listen();

  group = gui.addFolder('Camera');
  group.add(controls.camera, 'isOrtho').name('Is Static').listen();
  group.open();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 25), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);

  const standardDeferred = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/standard-frag.glsl')),
    ]);

  const standardShadowMap = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/sm-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/sm-frag.glsl')),
    ]);

  standardDeferred.setupTexUnits(["tex_Color", "emi_Color"]);
  standardShadowMap.setupTexUnits(["tex_Color", "emi_Color"]);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function tick() {
    camera.update(controls.camera);
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    timer.updateTime();
    renderer.updateTime(timer.deltaTime, timer.currentTime);

    renderer.deferredShader.setPointLights(lights);
    renderer.post32Passes[6].setPointLights(lights);

    // standardDeferred.bindTexToUnit("tex_Color", tex0, 0);

    // testUV(camera);

    let lightDirection = controls.skyLight.direction;
    let skyColor = controls.skyLight.color;
    let intensity = controls.skyLight.intensity;

    setShadowMapData(standardShadowMap, renderer.deferredShader);
    renderer.deferredShader.setLightPosition(vec3.fromValues(lightDirection[0], lightDirection[1], lightDirection[2]));
    renderer.deferredShader.setLightColor(vec3.fromValues(skyColor[0] * intensity / 255, skyColor[1] * intensity / 255, skyColor[2] * intensity / 255));

    renderer.clear();
    renderer.clearGB();

    // TODO: pass any arguments you may need for shader passes
    // forward render mesh info into gbuffers
    // renderer.renderToGBuffer(camera, standardDeferred, [mesh0, mesh1, mesh2]);
    renderer.renderToGBuffer(camera, standardDeferred, sceneMeshes, sceneTextures);
    renderer.renderToShadowMap(camera, standardShadowMap, sceneMeshes, sceneTextures);
    // render from gbuffers into 32-bit color buffer
    renderer.renderFromGBuffer(camera);
    // apply 32-bit post and tonemap from 32-bit color to 8-bit color
    // renderer.renderPostProcessHDR();
    // // apply 8-bit post and draw
    // renderer.renderPostProcessLDR();

    renderer.renderPass_Bloom(controls.bloom);

    renderer.renderPass_Composite(controls);

    renderer.renderPass_ToneMapping(controls.tonemap);
    
    renderer.renderPass_Present(camera);

    stats.end();

    if (shouldCapture) {
      downloadImage();
      shouldCapture = false;
    }

    requestAnimationFrame(tick);
  }

  // window.addEventListener('resize', function() {
  //   renderer.setSize(window.innerWidth, window.innerHeight);
  //   camera.setAspectRatio(window.innerWidth / window.innerHeight);
  //   camera.updateProjectionMatrix();
  // }, false);

  let width = window.innerWidth;
  let height = window.innerHeight;

  width = window.innerHeight;
  height = window.innerHeight;

  renderer.setSize(width, height);
  camera.setAspectRatio(width / height);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}


function setup() {
  timer.startTime = Date.now();
  loadOBJText();
  main();
}

setup();
