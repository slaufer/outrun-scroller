import React, { Component, Fragment } from "react";
import "./BackgroundRender.css";
import * as THREE from "three";

class BackgroundRender extends Component {
  constructor(props) {
    super(props);

    this.nextFrameID = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.config = {};
    this.config.segs = {
      x: 50,
      z: 50
    };
    this.config.cameraPosition = {
      y: 2.5,
      z: this.config.segs.z
    };
    this.config.terrain = {
      sinFrequency: { x: Math.random(), z: Math.random() },
      sinIntensity: { x: 0.025 * this.config.segs.x, z: 0.025 * this.config.segs.x },
      sinOffset: { x: Math.random() * Math.PI, z: Math.random() * Math.PI },
      cosFrequency: { x: Math.random(), z: Math.random() },
      cosIntensity: { x: 0.025 * this.config.segs.x, z: 0.025 * this.config.segs.x },
      cosOffset: { x: Math.random() * Math.PI, z: Math.random() * Math.PI },
      valleyFactor: 4 / this.config.segs.x,
      valleyPower: 2,
      modFactor: 3 / this.config.segs.x
    };
    this.config.speed = 0.01;

    console.log("Terrain config:", this.config.terrain);

    this.lastFrameTime = null;
    this.lastInfoTime = null;
    this.lastFrameCount = null;
    this.zSegCount = 0;
    this.zSegs = [];

    this.meshNormal = new THREE.Vector3(0, 1, 1);
    this.meshMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();

    // move the camera up so that we don't just see a flat line
    this.camera.position.y = this.config.cameraPosition.y;
    this.camera.position.z = this.config.cameraPosition.z;

    this.infoContainer = document.querySelector(".background-render-info");
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
  }

  initComponents() {
    /*
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
    */

    //////////////////
    // IT'S THE SUN //
    //////////////////
    const colors = [
      [0xf7, 0x13, 0x9e], // from #F7139E
      [0xfe, 0xff, 0x03] // to #FEFF03
    ];

    const r = this.config.segs.x / 2;
    const accel = 0.02;
    let step = accel;

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

    // add a fullbright lightsource so we can see meshes
    // this.scene.add(new THREE.AmbientLight(0xffffff));
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

  // creates a z segment and drops it at z=0, to be moved by animate()
  // featuring the world's shittiest terrain generator
  createZSegment(zPos = 0) {
    const group = new THREE.Group();
    group.position.z = zPos;

    const lineGroup = new THREE.Group();
    lineGroup.position.x = -this.config.segs.x / 2;
    lineGroup.position.y = 0.01;
    group.add(lineGroup);

    const meshGroup = new THREE.Group();
    meshGroup.position.x = -this.config.segs.x / 2;
    group.add(meshGroup);

    for (let x = -1; x < this.config.segs.x; x++) {
      const y0 = this.getY(x, this.zSegCount);
      const y1 = this.getY(x + 1, this.zSegCount);
      const y2 = this.getY(x + 1, this.zSegCount - 1);
      const y3 = this.getY(x, this.zSegCount - 1);

      const v0 = new THREE.Vector3(0, y0, 0);
      const v1 = new THREE.Vector3(1, y1, 0);
      const v2 = new THREE.Vector3(1, y2, 1);
      const v3 = new THREE.Vector3(0, y3, 1);

      const lineGeo = new THREE.Geometry();
      lineGeo.vertices.push(v0, v1, v2);

      // if we're creating the left-most line, we don't need the x-line segment
      if (x === -1) lineGeo.vertices.shift();

      // if this is the first z-segment, we don't want dangling z-line segments
      // after the first z-segment is destroyed, subsequent dangling z-lines should be out of the
      // camera's FOV
      if (this.zSegCount === 0) lineGeo.vertices.pop();

      const lineSat = Math.floor((Math.max(y0, y1) * 223) / this.getMaxY()) + 32;
      const lineMat = new THREE.LineBasicMaterial({ color: `rgb(0, ${lineSat}, ${lineSat})` });
      const line = new THREE.Line(lineGeo, lineMat);
      line.position.x = x;
      lineGroup.add(line);

      // if we're creating the left-most line, we don't need faces, so we're done
      if (x === -1) continue;

      const meshGeo = new THREE.Geometry();
      meshGeo.vertices.push(v0, v1, v2, v3);
      meshGeo.faces.push(
        new THREE.Face3(1, 0, 3, this.meshNormal),
        new THREE.Face3(2, 1, 3, this.meshNormal)
      );
      meshGeo.normalsNeedUpdate = true;

      // const meshMat = new THREE.MeshBasicMaterial({ color: `rgb(0, ${lineSat}, ${lineSat})` });
      const mesh = new THREE.Mesh(meshGeo, this.meshMat);
      mesh.position.x = x;
      meshGroup.add(mesh);
    }

    this.zSegs.push({ group, lineGroup, meshGroup });
    this.scene.add(group);
    this.zSegCount++;
  }

  destroyZSegment(segment) {
    // remove the segment from the scene
    this.scene.remove(segment.group);

    // dispose of geometries and materials allocated for the lines
    for (const line of segment.lineGroup.children) {
      line.geometry.dispose();
      line.material.dispose();
    }

    for (const mesh of segment.meshGroup.children) {
      mesh.geometry.dispose();
      // mesh.material.dispose();
    }
  }

  animate() {
    // figure out how far we need to move since the last frame
    const now = Date.now();
    this.lastFrameTime = this.lastFrameTime || now;
    const step = (now - this.lastFrameTime) * this.config.speed
    this.lastFrameTime = now;

    // advance z-segments
    for (const zSeg of this.zSegs) {
      zSeg.group.position.z += step;
    }

    // destroy any z-segments that have gone beyond the near boundary
    while (this.zSegs.length > 0 && this.zSegs[0].group.position.z >= this.config.segs.z) {
      this.destroyZSegment(this.zSegs.shift());
    }

    // if there are no z-segments left, create one at the near boundary so we'll create the rest next
    if (this.zSegs.length === 0) {
      this.createZSegment(this.config.segs.z);
    }

    // create new z-segments until we reach the far boundary
    while (this.zSegs[this.zSegs.length - 1].group.position.z >= 1) {
      // create the new z-segment right beyond the nearest z-segment
      this.createZSegment(this.zSegs[this.zSegs.length - 1].group.position.z - 1);
    }

    const timeSinceLastInfo = now - this.lastInfoTime;
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
      this.lastInfoTime = now;
      this.lastFrameCount = this.renderer.info.render.frame;
    }

    // render the frame, and set up the next frame request
    this.renderer.render(this.scene, this.camera);
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
