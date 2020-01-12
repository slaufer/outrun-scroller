import React, { Component } from "react";
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
    this.lineMat = null;
    this.xSegCount = 60;
    this.zSegCount = 60;
    this.zSegs = [];
    this.zSegTotal = 0;
    this.zShift = 0;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();

    // x = left / right
    // y = up / down
    // z = forward / backward

    this.camera.position.x = this.xSegCount / 2
    this.camera.position.y = 4;
    this.camera.position.z = this.zSegCount;
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

  // creates a z segment and drops it at z=0, to be moved by animate()
  // featuring the world's shittiest terrain generator
  createZSegment() {
    this.zSegTotal++;
    // find the previous z-segment so we can create the z-ward line segments
    const prev = this.zSegs[this.zSegs.length - 1] || { elevations: [] };

    // create the template for this segment
    const segment = {
      elevations: [],
      line: null
    };

    // generate the elevations for this z-segment
    for (let x = 0; x <= this.xSegCount; x++) {
      // see if the previous segment had an adjacent non-zero elevation (mountain)
      const mountain = prev.elevations[x] || prev.elevations[x-1] || prev.elevations[x+1];

      // continue a mountain from the previous segment, otherwise 5% chance to start a new one
      if (mountain || Math.random() > 0.95) {
        // elevation is slightly more likely to decrease than increase, so we don't end up going up forever
        // minimum elevation of 0 so we don't end up with bottomless trenches either
        segment.elevations[x] = Math.max(0, (mountain || 0) + Math.random() - 0.6);
      } else {
        segment.elevations[x] = 0;
      }
    }

    // create the geometry for this segment
    const geo = new THREE.Geometry();
    for (let x = 0; x <= this.xSegCount; x++) {
      // elevations near the x-edges of the plane are rendered taller to create a "valley" effect
      const edgeFactor = Math.pow(Math.abs(x - this.xSegCount / 2) / this.xSegCount * 5, 3);
      geo.vertices.push(new THREE.Vector3(x, segment.elevations[x] * edgeFactor, 0));

      // only draw the z-ward line segments if there's a previous z segment to attach them to
      geo.vertices.push(
        new THREE.Vector3(x, prev.elevations[x] * edgeFactor, 1),
        new THREE.Vector3(x, segment.elevations[x] * edgeFactor, 0)
      );
    }

    // create the line and insert it into the scene
    segment.line = new THREE.Line(geo, this.lineMat);
    this.scene.add(segment.line);

    // if we've exceeded zSegCount, destroy a zSeg
    if (this.zSegs.length > this.zSegCount) {
      this.disposeZSeg(this.zSegs.shift());
    }

    this.zSegs.push(segment);
    return segment;
  }

  disposeZSeg(segment) {
    this.scene.remove(segment.line);
    segment.line.geometry.dispose();
  }

  initComponents() {
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });

    // create initial zsegs
    /*
    for (let i = 0; i < this.zSegCount; i++) {
      this.createZSegment();
      this.zSegs[this.zSegs.length - 1].line.position.z = this.zSegCount - i - 1;
    }
    */


    //////////////////
    // IT'S THE SUN //
    //////////////////
    const colors = [
      [ 0xf7, 0x13, 0x9e ], // from #F7139E
      [ 0xfe, 0xff, 0x03 ]  // to #FEFF03
    ];

    const r = this.xSegCount / 2;
    const accel = 0.02;
    let step = accel;

    // group all of the sun components to make the location translation easier
    let sunGroup = new THREE.Group();

    // we're only rendering 3/4 of the circle [r, -r/2] so part disappears below the horizon
    for (let y = r; y >= -r / 2; y -= step, step += accel) {
      // calculate color based on y-position
      const color = [
        Math.round(colors[0][0] + (colors[1][0] - colors[0][0]) / (r * 3 / 2) * (y + r/2)),
        Math.round(colors[0][1] + (colors[1][1] - colors[0][1]) / (r * 3 / 2) * (y + r/2)),
        Math.round(colors[0][2] + (colors[1][2] - colors[0][2]) / (r * 3 / 2) * (y + r/2))
      ];

      // each line is a different color, so they each need a different material
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(`rgb(${color.join(",")})`) });

      // oh hey trig, how's it going
      const x = r * Math.cos(Math.asin(y / r));
      const geo = new THREE.Geometry();
      geo.vertices.push(
        new THREE.Vector3(-x, y, 0),
        new THREE.Vector3(x, y, 0)
      );
      const line = new THREE.Line(geo, mat);
      sunGroup.add(line);
    }

    sunGroup.position.x = this.xSegCount / 2;
    sunGroup.position.y = r / 2;
    this.scene.add(sunGroup);
  }

  animate() {

    for (const zSeg of this.zSegs) {
      zSeg.line.position.z += 0.2;
    }

    // when we've shifted by a full segment, spawn a new one and delete the oldest by calling createZSegment()
    this.zShift += 0.2;
    if (this.zShift >= 1) {
      this.zShift = 0;
      this.createZSegment();
    }

    // render the frame, and set up the next frame request
    this.renderer.render(this.scene, this.camera);
    this.nextFrameID = requestAnimationFrame(() => this.animate());
  }

  componentDidMount() {
    this.initScene();
    this.initViewport();
    this.initComponents();

    this.nextFrameID = requestAnimationFrame(() => this.animate());
  }

  componentWillUnmount() {
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
      <div className="background-render-container">
      </div>
    );
  }
}

export default BackgroundRender;
