import React, { Component, Fragment } from "react";
import "./BackgroundRender.css";
import * as THREE from "three";

class BackgroundRender extends Component {
  constructor(props) {
    super(props);

    this.config = {};
    this.config.segs = { x: 40, z: 90 };
    this.config.camera = {
      fov: 60,
      position: { x: 0, y: 3, z: this.config.segs.z },
      rotation: { x: 0, y: 0, z: 0, }
    };
    this.config.terrain = {
      sinFrequency: { x: Math.random() * 2, z: Math.random() * 2 },
      sinIntensity: { x: 0.025 * this.config.segs.x, z: 0.025 * this.config.segs.x },
      sinOffset: { x: Math.random() * Math.PI, z: Math.random() * Math.PI },
      cosFrequency: { x: Math.random() * 2, z: Math.random() * 2 },
      cosIntensity: { x: 0.025 * this.config.segs.x, z: 0.025 * this.config.segs.x },
      cosOffset: { x: Math.random() * Math.PI, z: Math.random() * Math.PI },
      valleyFactor: 3 / this.config.segs.x,
      valleyPower: 2,
      modFactor: 3 / this.config.segs.x
    };
    this.config.sun = {
      radius: this.config.segs.x / 3.5,
      step: 0.2,
      accel: 0.02,
      colors: [ [0xf7, 0x13, 0x9e], [0xfe, 0xff, 0x03] ]
    };
    this.config.starfield = {
      count: this.config.segs.x * 5,
      minSpeed: 0.01,
      speedFactor: 0.05,
      origin: -this.config.segs.z * 2,
      color: 0xFFFFFF
    };
    this.config.backgroundColor = 0x000000;
    this.config.speed = 0.01;

    console.log("Terrain config:", this.config.terrain);

    this.nextFrameID = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.lastFrameTime = null;
    this.lastInfoTime = null;
    this.lastFrameCount = null;
    this.resizeListener = null;
    this.zCount = null;
    this.terrain = null;
    this.stars = null;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    const aspect = (window.innerWidth - 1) / (window.innerHeight - 1);
    const near = 0.1;
    const far = 1000;
    this.camera = new THREE.PerspectiveCamera( this.config.camera.fov, aspect, near, far);
    this.renderer = new THREE.WebGLRenderer();

    // move the camera up so that we don't just see a flat line
    this.camera.position.x = this.config.camera.position.x;
    this.camera.position.y = this.config.camera.position.y;
    this.camera.position.z = this.config.camera.position.z;
    this.camera.rotation.x = this.config.camera.rotation.x;
    this.camera.rotation.y = this.config.camera.rotation.y;
    this.camera.rotation.z = this.config.camera.rotation.z;

    this.infoContainer = document.querySelector(".background-render-info");
  }

  _resizeListener() {
    const width = window.innerWidth - 1;
    const height = window.innerHeight - 1;
    const aspect = width / height;
    this.renderer.setSize(width, height);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  initViewport() {
    // take up the entire background
    this.renderer.setSize(window.innerWidth - 1, window.innerHeight - 1);
    this.renderer.domElement.style.position = "fixed";
    this.renderer.domElement.style.top = "0px";
    this.renderer.domElement.style.left = "0px";
    this.renderer.domElement.style.zIndex = "-9999";

    // insert the viewport into the DOM
    this.container = document.querySelector(".background-render-container");
    this.container.insertBefore(this.renderer.domElement, this.container.firstChild);

    this.resizeListener = () => this._resizeListener();

    window.addEventListener("resize", this.resizeListener)
  }

  drawGuidelines() {
    // debug guidelines
    for (let y = 0; y - 1 < this.getMaxY(); y++) {
      const geo = new THREE.Geometry();
      geo.vertices.push(
        new THREE.Vector3(-this.config.segs.x / 2, y, this.config.segs.z),
        new THREE.Vector3(this.config.segs.x / 2, y, this.config.segs.z),
        new THREE.Vector3(this.config.segs.x / 2, y, 0),
        new THREE.Vector3(-this.config.segs.x / 2, y, 0),
        new THREE.Vector3(-this.config.segs.x / 2, y, this.config.segs.z)
      );
      const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
    }
  }

  initSun() {
    const colors = this.config.sun.colors;

    const r = this.config.sun.radius;
    let step = this.config.sun.step;
    const accel = this.config.sun.accel;

    // group all of the sun components to make the location translation easier
    let sunGroup = new THREE.Group();

    // we're only rendering 3/4 of the circle [r, -r/2] so part disappears below the horizon
    for (let y = r; y >= -r / 2; y -= step, step += accel) {
      // calculate color based on y-position
      const color = [
        Math.round(colors[0][0] + ((colors[1][0] - colors[0][0]) / ((r * 3) / 2)) * (y + r / 2)),
        Math.round(colors[0][1] + ((colors[1][1] - colors[0][1]) / ((r * 3) / 2)) * (y + r / 2)),
        Math.round(colors[0][2] + ((colors[1][2] - colors[0][2]) / ((r * 3) / 2)) * (y + r / 2))
      ];

      // each line is a different color, so they each need a different material
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(`rgb(${color.join(",")})`) });

      // oh hey trig, how's it going
      const x = r * Math.cos(Math.asin(y / r));
      const geo = new THREE.Geometry();
      geo.vertices.push(new THREE.Vector3(-x, y, 0), new THREE.Vector3(x, y, 0));
      const line = new THREE.Line(geo, mat);
      sunGroup.add(line);
    }

    // move the sunGroup up so the bottom is flush with z=0
    sunGroup.position.y = r / 2;
    this.scene.add(sunGroup);
  }

  configStar(star) {
    const r = this.config.segs.x + this.config.segs.x * Math.random() / 2;
    const angle = Math.random() * Math.PI / 2;
    star.line.position.x = r * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    star.line.position.y = r * Math.sin(angle);
    star.line.position.z = this.config.starfield.origin;
    star.speed = Math.max(this.config.starfield.minSpeed, Math.random() * this.config.starfield.speedFactor);
  }

  initStarfield() {
    const geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2));

    const material = new THREE.LineBasicMaterial({ color: this.config.starfield.color });

    this.stars = [];

    for (let i = 0; i < this.config.starfield.count; i++) {
      const star = { line: new THREE.Line(geometry, material) };
      this.configStar(star);
      // randomize the star's starting position so that the starfield is pre-populated
      star.line.position.z =  this.config.starfield.origin + Math.random() * (this.config.segs.z - this.config.starfield.origin);

      this.stars.push(star);
      this.scene.add(star.line);
    }
  }

  updateStarfield() {
    const now = Date.now();
    const since = now - this.lastFrameTime;
    const xc = this.config.segs.x;

    for (const star of this.stars) {
      star.line.position.z += since * star.speed;

      // if the star has reached the near boundary, reconfigure and reset it
      if (star.line.position.z >= this.config.segs.z) {
        this.configStar(star);
      }
    }
  }

  // generates the terrain texture
  genTexture(w, h) {
    // create an appropriately-sized canvas
    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", w.toString());
    canvas.setAttribute("height", h.toString())
    const ctx = canvas.getContext("2d");

    // fill the canvas with black
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, w, h);

    // draw a while outlined square around the edges of the canvas
    ctx.strokeStyle = "#44FFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w-1, h-1);

    // return a CanvasTexture that uses NearestFilter so we can actually see the lines at a distance
    return new THREE.CanvasTexture(canvas, undefined, undefined, undefined, THREE.NearestFilter, THREE.NearestFilter);
  }

  initTerrainMesh() {
    const zc = this.config.segs.z;
    const xc = this.config.segs.x;
   
    // since the "squares" are attached in a plane, we only need (x+1)*(z+1) vertices
    const position = new Float32Array((this.config.segs.x + 1) * (this.config.segs.z + 1) * 3);
    const uv = new Float32Array((this.config.segs.x + 1) * (this.config.segs.z + 1) * 2);

    const uStep = 1 / this.config.segs.x;
    const vStep = 1 / this.config.segs.z;
   
    // generate vertices for the corners of each "square" 
    for (let z = 0; z < zc + 1; z++) {
      for (let x = 0; x < xc + 1; x++) {
        const i = (z * (xc + 1) + x) * 3;
        position[i] = x;
        position[i+1] = this.getY(x, z);
        position[i+2] = this.config.segs.z - z;

        const j = (z * (xc + 1) + x) * 2;
        uv[j] = x / this.config.segs.x;
        uv[j+1] = z / this.config.segs.z;
      }
    }
    
    const index = [];

    // generate face vertex indices for each face
    for (let z = 0; z < zc; z++) {
      for (let x = 0; x < xc; x++) {
        // near/far indices
        const ni = z * (xc + 1) + x;
        const fi = (z + 1) * (xc + 1) + x
        
        // add two triangle faces to form one "square"
        index.push(fi + 1, fi, ni, ni + 1, fi + 1, ni);
      }
    }

    this.zCount = this.config.segs.x;

    // take the vertices and face indices we made and combine them into a geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(index);

    // create a material and combine everything into a mesh you fucking coward
    /*
    const texture = this.genTexture(192, 192);
    texture.repeat.x = this.config.segs.x;
    texture.repeat.y = this.config.segs.z;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    */
    const material = new THREE.MeshBasicMaterial({ wireframe: true });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.x = -this.config.segs.x / 2;
    this.scene.add(terrain);

    this.terrain = terrain;
  }

  initTerrainWireframe() {
    const zc = this.config.segs.z;
    const xc = this.config.segs.x;

    for (var z = 0; z < zc + 1; z++) {
      for (var x = 0; x < xc + 1; x++) {

      }
    }

    const material = new THREE.LineBasicMaterial({ color: 0xFF0000 });
  }

  initTerrain() {
    this.initTerrainMesh();
    this.initTerrainWireframe();
  }

  updateTerrain() {
    const now = Date.now();

    // move the terrain forward
    this.terrain.position.z += (now - this.lastFrameTime) * this.config.speed;

    // if the terrain has moved forward by 1, reset it and update the face vectors
    if (this.terrain.position.z >= 1) {
      const xc = this.config.segs.x;
      this.terrain.position.z = 0;

      const position = this.terrain.geometry.getAttribute("position");
      const arr = position.array;

      const shift = (xc + 1) * 3;

      // shift up y-coordinates, preserving x,z-coordinates
      // we can't use Array.copyWithin() here because it would shift up x,z as well
      for (let i = shift + 1; i < position.array.length; i += 3) {
        position.array[i-shift] = position.array[i];
      }

      // populate last row with new y-coordinates
      for (let x = 0; x < xc + 1; x++) {
        const i = position.array.length - shift + x * 3 + 1;
        position.array[i] = this.getY(x, this.zCount);
      }

      this.zCount++;
      position.needsUpdate = true;
    }
  }

  initComponents() {
    this.initSun();
    this.initStarfield();
    this.initTerrain();

    // add a fullbright ambient light, we don't need complex lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF, 1);
    this.scene.add(ambient);

    // initialize last frame time
    this.lastFrameTime = Date.now();
  }

  getMaxY() {
    return (
      2 *
      (
        this.config.terrain.sinIntensity.x +
        this.config.terrain.sinIntensity.z +
        this.config.terrain.cosIntensity.x +
        this.config.terrain.cosIntensity.z
      ) *
      Math.pow(
        (this.config.segs.x / 2) * this.config.terrain.valleyFactor,
        this.config.terrain.valleyPower
      ) *
      (this.config.segs.x / 2 - 1) * this.config.terrain.modFactor
    );
  }

  getY(x, z) {
    const xSin =
      Math.sin(x * this.config.terrain.sinFrequency.x + this.config.terrain.sinOffset.x) *
        this.config.terrain.sinIntensity.x +
      this.config.terrain.sinIntensity.x;
    const zSin =
      Math.sin(z * this.config.terrain.sinFrequency.z + this.config.terrain.sinOffset.z) *
        this.config.terrain.sinIntensity.z +
      this.config.terrain.sinIntensity.z;
    const xCos =
      Math.cos(x * this.config.terrain.cosFrequency.x + this.config.terrain.cosOffset.x) *
        this.config.terrain.cosIntensity.x +
      this.config.terrain.cosIntensity.x;
    const zCos =
      Math.cos(z * this.config.terrain.cosFrequency.z + this.config.terrain.cosOffset.z) *
        this.config.terrain.cosIntensity.z +
      this.config.terrain.cosIntensity.z;
    const basis = xSin + zSin + xCos + zCos;

    const offCenter = Math.abs(x - this.config.segs.x / 2);
    const valley = Math.pow(offCenter * this.config.terrain.valleyFactor, this.config.terrain.valleyPower);
    const mod = offCenter > 0 ? z % offCenter * this.config.terrain.modFactor : 0;

    const y = basis * valley * mod;

    return y;
  }

  animate() {
    // figure out how far we need to move since the last frame
    this.updateStarfield();
    this.updateTerrain();

    const timeSinceLastInfo = Date.now() - this.lastInfoTime;
    if (this.renderer && timeSinceLastInfo >= 1000) {
      const fps = Math.floor((this.renderer.info.render.frame - this.lastFrameCount) / timeSinceLastInfo * 1000);
      this.infoContainer.innerText =
        `fps: ${fps}\n` +
        `frame: ${this.renderer.info.render.frame}\n` +
        `geometries: ${this.renderer.info.memory.geometries}\n` +
        `textures: ${this.renderer.info.memory.textures}\n` +
        `lines: ${this.renderer.info.render.lines}\n` +
        `triangles: ${this.renderer.info.render.triangles}\n` +
        `points: ${this.renderer.info.render.points}\n`;
      this.lastInfoTime = Date.now();
      this.lastFrameCount = this.renderer.info.render.frame;
    }

    // render the frame, and set up the next frame request
    this.renderer.render(this.scene, this.camera);
    this.lastFrameTime = Date.now();
    this.nextFrameID = requestAnimationFrame(() => this.animate());
  }

  componentDidMount() {
    // initialize all the things
    this.initScene();
    this.initViewport();
    this.initComponents();

    // start animating
    this.nextFrameID = requestAnimationFrame(() => this.animate());
  }

  componentWillUnmount() {
    // TODO: dispose scene components
    cancelAnimationFrame(this.nextFrameID);
    window.removeEventListener("resize", this.resizeListener);
    this.container.removeChild(this.renderer.domElement);

    this.scene.dispose();
    this.camera.dispose();
    this.renderer.dispose();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }

  render() {
    return (
      <Fragment>
        <div className="background-render-container"></div>
        <pre className="background-render-info"></pre>
      </Fragment>
    );
  }
}

export default BackgroundRender;
