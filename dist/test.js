////////////////
// INITIALIZE //
////////////////

const camera = new THREE.PerspectiveCamera(
  75,
  (window.innerWidth - 1) / (window.innerHeight - 1),
  0.1,
  100
);
camera.position.z = 2;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth - 1, window.innerHeight - 1);


renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
document.body.appendChild(renderer.domElement);
renderer.render(scene, camera)

/////////////
// HELPERS //
/////////////

const texLoader = new THREE.TextureLoader();

const getTexture = url => {
  return new Promise(resolve => {
    texLoader.load(url, texture => {
      console.log(`Finished loading ${url}`);
      resolve(texture);
    })
  });
};

/////////////
// ANIMATE //
/////////////

const animate = async () => {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

///////////
// SETUP //
///////////

const main = async () => {
  const light = new THREE.AmbientLight(0xFFFFFF);
  scene.add(light);

  // new geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from([
    -1,  1,  0,  0,  1,  0,  1,  1,  0,
    -1,  0,  0,  0,  0,  0,  1,  0,  0,
    -1, -1,  0,  0, -1,  0,  1, -1,  0
  ]), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from([
    0,   1, 0.5,   1, 1,   1,
    0, 0.5, 0.5, 0.5, 1, 0.5,
    0,   0, 0.5,   0, 1,   0
  ]), 2));
  geometry.setIndex([
    3, 1, 0, 4, 1, 3,
    4, 2, 1, 5, 2, 4,
    6, 4, 3, 7, 4, 6,
    7, 5, 4, 8, 5, 7
  ]);

  const texture = await getTexture("./uvtest1024.png");
  const material = new THREE.MeshBasicMaterial({ map: texture  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.x = 2;
  texture.repeat.y = 2;
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  requestAnimationFrame(animate);
}

///////////
// BEGIN //
///////////
main();
