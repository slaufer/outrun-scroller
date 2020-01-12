import React, { Component } from "react";
import "./App.css";
import BackgroundRender from "./BackgroundRender";

class App extends Component {
  render() {
    return (
      <div className="App">
        <BackgroundRender />
        <div className="test-div">
          React + three.js test app
        </div>
      </div>
    );
  }
}

export default App;
