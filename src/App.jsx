import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// Define the 6 standard colors of a Rubik's Cube
// Order of materials in Three.js BoxGeometry: [Right (X+), Left (X-), Top (Y+), Bottom (Y-), Front (Z+), Back (Z-)]
const FACE_COLORS = ['red', 'orange', 'white', 'yellow', 'green', 'blue'];

// Global directions we want to check for each of the 6 faces
const GLOBAL_DIRECTIONS = {
  U: new THREE.Vector3(0, 1, 0),   // Up (White face originally)
  D: new THREE.Vector3(0, -1, 0),  // Down (Yellow face originally)
  R: new THREE.Vector3(1, 0, 0),   // Right (Red face originally)
  L: new THREE.Vector3(-1, 0, 0),  // Left (Orange face originally)
  F: new THREE.Vector3(0, 0, 1),   // Front (Green face originally)
  B: new THREE.Vector3(0, 0, -1),  // Back (Blue face originally)
};

// Local normals of a single cubie pointing to its 6 faces
const LOCAL_NORMALS = [
  new THREE.Vector3(1, 0, 0),   // Index 0: Right (Red)
  new THREE.Vector3(-1, 0, 0),  // Index 1: Left (Orange)
  new THREE.Vector3(0, 1, 0),   // Index 2: Top (White)
  new THREE.Vector3(0, -1, 0),  // Index 3: Bottom (Yellow)
  new THREE.Vector3(0, 0, 1),   // Index 4: Front (Green)
  new THREE.Vector3(0, 0, -1),  // Index 5: Back (Blue)
];

// Cubie component using a Transformation Matrix with active animation support
function Cubie({ matrix, animationData, isAnimated }) {
  const meshRef = useRef();
  const currentAngleRef = useRef(0);

  // Sync mesh with static matrix when animation is NOT active
  useEffect(() => {
    if (meshRef.current && !animationData.active) {
      meshRef.current.matrix.copy(matrix);
      meshRef.current.matrixAutoUpdate = false;
      currentAngleRef.current = 0; // Reset internal rotation tracker
    }
  }, [matrix, animationData.active]);

  // Handle smooth rotation frame-by-frame if this cubie is part of the moving layer
  useFrame((state, delta) => {
    if (!animationData.active || !isAnimated || !meshRef.current) return;

    const speed = 8; // Animation speed multiplier
    const targetAngle = animationData.angle;
    const step = speed * delta;
    
    const diff = targetAngle - currentAngleRef.current;
    let nextStepAngle = Math.sign(diff) * step;

    // Prevent overshooting the target angle
    if (Math.abs(diff) < step) {
      nextStepAngle = diff;
    }

    currentAngleRef.current += nextStepAngle;

    // Create incremental rotation matrix
    const incrementalRot = new THREE.Matrix4();
    if (animationData.axis === 'y') incrementalRot.makeRotationY(nextStepAngle);
    if (animationData.axis === 'x') incrementalRot.makeRotationX(nextStepAngle);
    if (animationData.axis === 'z') incrementalRot.makeRotationZ(nextStepAngle);

    // Multiply the mesh matrix directly for GPU rendering
    meshRef.current.matrix.premultiply(incrementalRot);
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {FACE_COLORS.map((color, index) => (
        <meshStandardMaterial 
          key={index} 
          attach={`material-${index}`} 
          color={color} 
          roughness={0.1}
        />
      ))}
    </mesh>
  );
}

export default function App() {
  // Helper to generate a brand new, solved cube state
  const generateSolvedCube = () => {
    const solved = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const matrix = new THREE.Matrix4();
          matrix.makeTranslation(x, y, z);
          solved.push({
            id: `${x}-${y}-${z}`,
            matrix: matrix,
          });
        }
      }
    }
    return solved;
  };

  const [cubies, setCubies] = useState(generateSolvedCube);
  const [isScrambling, setIsScrambling] = useState(false);
  const [logs, setLogs] = useState([{ text: 'System initialized. Cube ready.', type: 'system' }]);
  const logStreamEndRef = useRef(null);

  // Animation state tracker
  const [animationData, setAnimationData] = useState({
    active: false,
    axis: 'y',
    layer: 1,
    angle: 0,
    entire: false,
  });

  // Define all official Rubik's Cube moves
  const moves = [
    { name: 'U', axis: 'y', layer: 1, angle: -Math.PI / 2 },
    { name: "U'", axis: 'y', layer: 1, angle: Math.PI / 2 },
    { name: 'D', axis: 'y', layer: -1, angle: Math.PI / 2 },
    { name: "D'", axis: 'y', layer: -1, angle: -Math.PI / 2 },
    { name: 'R', axis: 'x', layer: 1, angle: -Math.PI / 2 },
    { name: "R'", axis: 'x', layer: 1, angle: Math.PI / 2 },
    { name: 'L', axis: 'x', layer: -1, angle: Math.PI / 2 },
    { name: "L'", axis: 'x', layer: -1, angle: -Math.PI / 2 },
    { name: 'F', axis: 'z', layer: 1, angle: -Math.PI / 2 },
    { name: "F'", axis: 'z', layer: 1, angle: Math.PI / 2 },
    { name: 'B', axis: 'z', layer: -1, angle: Math.PI / 2 },
    { name: "B'", axis: 'z', layer: -1, angle: -Math.PI / 2 },
  ];

  // Helper to append on-screen logs
  const addLog = (text, type = 'action') => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  // Auto-scroll logs to bottom when a new log arrives
  useEffect(() => {
    if (logStreamEndRef.current) {
      logStreamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Trigger layer animation
  const animateLayer = (axis, layerValue, angle, moveName) => {
    if (animationData.active || isScrambling) return;
    addLog(`Move executed: ${moveName}`);
    setAnimationData({
      active: true,
      axis,
      layer: layerValue,
      angle,
      entire: false,
    });
  };

  // Trigger entire cube animation
  const animateEntireCube = (axis, angle, label) => {
    if (animationData.active || isScrambling) return;
    addLog(`Rotated entire cube: ${label}`, 'system');
    setAnimationData({
      active: true,
      axis,
      layer: 0,
      angle,
      entire: true,
    });
  };

  // Check if a specific cubie should animate during the current active animation
  const checkIsAnimated = (cubie) => {
    if (!animationData.active) return false;
    if (animationData.entire) return true;

    const currentPos = new THREE.Vector3();
    currentPos.setFromMatrixPosition(cubie.matrix);
    const currentCoordOnAxis = currentPos[animationData.axis];
    return Math.abs(currentCoordOnAxis - animationData.layer) < 0.1;
  };

  // Finalize matrix positions when the transition completes
  // This triggers automatically after the animation time runs out
  useEffect(() => {
    if (!animationData.active) return;

    const duration = 1000 / 8; // 1000ms divided by our frame-rate speed
    const timer = setTimeout(() => {
      const finalRotationMatrix = new THREE.Matrix4();
      if (animationData.axis === 'y') finalRotationMatrix.makeRotationY(animationData.angle);
      if (animationData.axis === 'x') finalRotationMatrix.makeRotationX(animationData.angle);
      if (animationData.axis === 'z') finalRotationMatrix.makeRotationZ(animationData.angle);

      setCubies((prevCubies) =>
        prevCubies.map((cubie) => {
          // Check if this specific cubie was animated (Inlined const to resolve eslint no-useless-assignment)
          const currentPos = new THREE.Vector3();
          currentPos.setFromMatrixPosition(cubie.matrix);
          const currentCoordOnAxis = currentPos[animationData.axis];
          
          const wasAnimated = animationData.entire || Math.abs(currentCoordOnAxis - animationData.layer) < 0.1;

          if (wasAnimated) {
            const newMatrix = cubie.matrix.clone();
            newMatrix.premultiply(finalRotationMatrix);
            return { ...cubie, matrix: newMatrix };
          }
          return cubie;
        })
      );
      setAnimationData({ active: false, axis: 'y', layer: 1, angle: 0, entire: false });
    }, duration);

    return () => clearTimeout(timer);
  }, [animationData]); // animationData is now the only required dependency!

  // Rotate a specific layer around an axis (for instant calculation during scramble)
  const rotateLayerInstant = (axis, layerValue, angle) => {
    setCubies((prevCubies) =>
      prevCubies.map((cubie) => {
        const currentPos = new THREE.Vector3();
        currentPos.setFromMatrixPosition(cubie.matrix);
        const currentCoordOnAxis = currentPos[axis];
        if (Math.abs(currentCoordOnAxis - layerValue) < 0.1) {
          const rotationMatrix = new THREE.Matrix4();
          if (axis === 'y') rotationMatrix.makeRotationY(angle);
          if (axis === 'x') rotationMatrix.makeRotationX(angle);
          if (axis === 'z') rotationMatrix.makeRotationZ(angle);

          const newMatrix = cubie.matrix.clone();
          newMatrix.premultiply(rotationMatrix);

          return {
            ...cubie,
            matrix: newMatrix,
          };
        }
        return cubie;
      })
    );
  };

  // Function to scramble the cube with a sequence of random moves
  const scrambleCube = () => {
    if (isScrambling || animationData.active) return;
    setIsScrambling(true);
    addLog('Starting auto-scramble (20 random moves)...', 'system');

    const scrambleLength = 20; // Standard scramble length
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= scrambleLength) {
        clearInterval(interval);
        setIsScrambling(false);
        addLog('Scramble sequence finished.', 'system');
        return;
      }

      // Pick a random move from our moves array
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      rotateLayerInstant(randomMove.axis, randomMove.layer, randomMove.angle);

      currentStep++;
    }, 80); // Delay between moves in milliseconds
  };

  // Reset function to set the cube back to the solve state
  const resetCube = () => {
    if (isScrambling || animationData.active) return;
    setCubies(generateSolvedCube());
    addLog('Cube reset to solved state.', 'system');
  };

  // Modern state reader converting 3D matrix rotations into 2D color representation
  const logCubeState = () => {
    const faceStates = { U: [], D: [], R: [], L: [], F: [], B: [] };

    // Group cubies that belong to each of the 6 physical faces
    cubies.forEach((cubie) => {
      const currentPos = new THREE.Vector3();
      currentPos.setFromMatrixPosition(cubie.matrix);

      // Extract rotation part of the transformation matrix
      const rotationMatrix = new THREE.Matrix3().setFromMatrix4(cubie.matrix);

      // 1. Check which global faces this cubie belongs to
      if (Math.abs(currentPos.y - 1) < 0.1) faceStates.U.push({ pos: currentPos.clone(), rot: rotationMatrix });
      if (Math.abs(currentPos.y - (-1)) < 0.1) faceStates.D.push({ pos: currentPos.clone(), rot: rotationMatrix });
      if (Math.abs(currentPos.x - 1) < 0.1) faceStates.R.push({ pos: currentPos.clone(), rot: rotationMatrix });
      if (Math.abs(currentPos.x - (-1)) < 0.1) faceStates.L.push({ pos: currentPos.clone(), rot: rotationMatrix });
      if (Math.abs(currentPos.z - 1) < 0.1) faceStates.F.push({ pos: currentPos.clone(), rot: rotationMatrix });
      if (Math.abs(currentPos.z - (-1)) < 0.1) faceStates.B.push({ pos: currentPos.clone(), rot: rotationMatrix });
    });

    console.clear();
    console.log("%c--- 3D TO 2D CUBE COLOR MAPPER ---", "color: #00d2ff; font-weight: bold;");

    // Helper to find the color facing a specific global direction
    const getFaceColor = (cubieRot, globalDir) => {
      let bestMatchIndex = 0;
      let maxDotProduct = -Infinity;

      LOCAL_NORMALS.forEach((localNormal, index) => {
        // Rotate the local normal using the cubie's current rotation matrix
        const rotatedNormal = localNormal.clone().applyMatrix3(cubieRot);
        // The Dot Product measures how parallel two vectors are (1 = identical direction)
        const dot = rotatedNormal.dot(globalDir);

        if (dot > maxDotProduct) {
          maxDotProduct = dot;
          bestMatchIndex = index;
        }
      });

      return FACE_COLORS[bestMatchIndex];
    };

    // Helper to sort face cubies into a structured 3x3 grid (top-left to bottom-right)
    const sortFaceGrid = (faceName, cubiesList) => {
      let sorted = [...cubiesList];
      
      if (faceName === 'U') { // Looking from top (Z is rows, X is cols)
        sorted.sort((a, b) => b.pos.z - a.pos.z || a.pos.x - b.pos.x);
      } else if (faceName === 'D') { // Looking from bottom
        sorted.sort((a, b) => a.pos.z - b.pos.z || a.pos.x - b.pos.x);
      } else if (faceName === 'F') { // Looking from front (Y is rows, X is cols)
        sorted.sort((a, b) => b.pos.y - a.pos.y || a.pos.x - b.pos.x);
      } else if (faceName === 'B') { // Looking from back
        sorted.sort((a, b) => b.pos.y - a.pos.y || b.pos.x - a.pos.x);
      } else if (faceName === 'R') { // Looking from right (Y is rows, Z is cols)
        sorted.sort((a, b) => b.pos.y - a.pos.y || b.pos.z - a.pos.z);
      } else if (faceName === 'L') { // Looking from left
        sorted.sort((a, b) => b.pos.y - a.pos.y || a.pos.z - b.pos.z);
      }

      return sorted.map(cubie => getFaceColor(cubie.rot, GLOBAL_DIRECTIONS[faceName]));
    };

    const finalState = {};
    Object.keys(faceStates).forEach((face) => {
      finalState[face] = sortFaceGrid(face, faceStates[face]);
    });

    // Log the colors for the Up (U) face as a quick demo on-screen
    addLog(`UP Face Colors: [${finalState.U.join(', ')}]`, 'system');
    console.log("Full 2D State Projection:", finalState);
  };

  return (
    <div className='app-container'>
      {/* Modern Glassmorphic Sidebar Menu */}
      <div className="sidebar-menu">
        <div className="menu-header">
          <div className="logo-container">
            {/* Elegant CSS 3D Cube Logo */}
            <div className="cube-logo">
              <div className="cube-face face-top"></div>
              <div className="cube-face face-front"></div>
              <div className="cube-face face-right"></div>
            </div>
            <div>
              <h1 className="menu-title">Rubik's AI</h1>
              <p className="menu-subtitle">3D Solver Project</p>
            </div>
          </div>
        </div>

        <div className="menu-content">
          {/* Scramble Button */}
          <button
            className='scramble-btn'
            onClick={scrambleCube}
            disabled={isScrambling || animationData.active}
          >
            {isScrambling ? 'Scrambling...' : 'Scramble Cube'}
          </button>

          {/* New utility buttons group */}
          <div className="utility-buttons">
            <button 
              className="utility-btn reset-btn"
              onClick={resetCube}
              disabled={isScrambling || animationData.active}
            >
              Reset
            </button>
            <button 
              className="utility-btn solve-btn"
              onClick={logCubeState}
              disabled={isScrambling || animationData.active}
            >
              Log State
            </button>
          </div>

          {/* New section for entire cube rotations */}
          <h4 className="section-title">Rotate Cube</h4>
          <div className="utility-buttons">
            <button 
              className="utility-btn rotate-all-btn"
              onClick={() => animateEntireCube('y', Math.PI / 2, 'Y Axis')}
              disabled={isScrambling || animationData.active}
            >
              Rotate Y
            </button>
            <button 
              className="utility-btn rotate-all-btn"
              onClick={() => animateEntireCube('x', Math.PI / 2, 'X Axis')}
              disabled={isScrambling || animationData.active}
            >
              Rotate X
            </button>
            <button 
              className="utility-btn rotate-all-btn"
              onClick={() => animateEntireCube('z', Math.PI / 2, 'Z Axis')}
              disabled={isScrambling || animationData.active}
            >
              Rotate Z
            </button>
          </div>

          <h4 className="section-title">Layer Moves</h4>
          <div className="button-grid">
            {moves.map((move) => (
              <button 
                key={move.name}
                className="control-btn"
                onClick={() => animateLayer(move.axis, move.layer, move.angle, move.name)}
                disabled={isScrambling || animationData.active} // Disable manual moves during scramble
              >
                {move.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* On-screen Log Console */}
      <div className="log-panel">
        <div className="log-title-container">
          <h4 className="log-panel-title">Console Log</h4>
          <button className="clear-log-btn" onClick={() => setLogs([])}>Clear</button>
        </div>
        <div className="log-stream">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry log-entry-${log.type}`}>
              &gt; {log.text}
            </div>
          ))}
          <div ref={logStreamEndRef} />
        </div>
      </div>

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Render all 27 cubies flatly in a single array. No group unmounting! */}
        {cubies.map((cubie) => (
          <Cubie 
            key={cubie.id} 
            matrix={cubie.matrix} 
            animationData={animationData} 
            isAnimated={checkIsAnimated(cubie)}
          />
        ))}

        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}