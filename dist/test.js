console.log("hello, world");

const fov = 75;
const aspect = 1;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 5;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(800, 800);
document.body.appendChild(renderer.domElement);

const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
const lineGeo = new THREE.Geometry();
lineGeo.vertices.push(
  new THREE.Vector3(-1, -1, 0),
  new THREE.Vector3( 1, -1, 0),
  new THREE.Vector3( 1,  1, 0),
  new THREE.Vector3(-1,  1, 0),
  new THREE.Vector3(-1, -1, 0)
);

const line = new THREE.Line(lineGeo, lineMat);
line.position.x = -2;
line.position.y = -2;
line.position.z = 1.001;
scene.add(line);

const cubeGeo = new THREE.Geometry();
cubeGeo.vertices.push(
  new THREE.Vector3(-1, -1,  1),
  new THREE.Vector3( 1, -1,  1),
  new THREE.Vector3(-1,  1,  1),
  new THREE.Vector3( 1,  1,  1),
  new THREE.Vector3(-1, -1, -1),
  new THREE.Vector3( 1, -1, -1),
  new THREE.Vector3(-1,  1, -1),
  new THREE.Vector3( 1,  1, -1)
);

cubeGeo.faces.push(
  new THREE.Face3(0, 3, 2),
  new THREE.Face3(0, 1, 3),
  new THREE.Face3(1, 7, 3),
  new THREE.Face3(1, 5, 7),
  new THREE.Face3(5, 6, 7),
  new THREE.Face3(5, 4, 6),
  new THREE.Face3(4, 2, 6),
  new THREE.Face3(4, 0, 2),
  new THREE.Face3(2, 7, 6),
  new THREE.Face3(2, 3, 7),
  new THREE.Face3(4, 1, 0),
  new THREE.Face3(4, 5, 1)
);

const redCube = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
redCube.position.x = -2;
redCube.position.y = -2;
scene.add(redCube);

/*
const greenCube = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
scene.add(greenCube);
*/

const blueCube = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: 0x0000FF }));
blueCube.position.x = 2;
blueCube.position.y = 2;
scene.add(blueCube);

const light = new THREE.AmbientLight(0xFFFFFF);
scene.add(light);

renderer.render(scene, camera)
