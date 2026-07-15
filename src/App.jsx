import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
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

// Cubie component using a Transformation Matrix
function Cubie({ matrix }) {
  const meshRef = React.useRef();

  // Apply the 3D transformation matrix directly to the mesh on every render
  React.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.matrix.copy(matrix);
      meshRef.current.matrixAutoUpdate = false; // Tell Three.js we handle the matrix manually
    }
  }, [matrix]);

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

  // Rotate the entire cube around an axis (Fixed version)
  const rotateEntireCube = (axis, angle) => {
    setCubies((prevCubies) =>
      prevCubies.map((cubie) => {
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
      })
    );
  };

  // Rotate a specific layer around an axis
  const rotateLayer = (axis, layerValue, angle) => {
    setCubies((prevCubies) =>
      prevCubies.map((cubie) => {
        // Extract current position from the cubie's matrix
        const currentPos = new THREE.Vector3();
        currentPos.setFromMatrixPosition(cubie.matrix);

        // Check if the cubie belongs to the target layer (with tolerance for floating-point errors)
        const currentCoordOnAxis = currentPos[axis];
        if (Math.abs(currentCoordOnAxis - layerValue) < 0.1) {
          
          // Create rotation matrix around the specified axis
          const rotationMatrix = new THREE.Matrix4();
          if (axis === 'y') rotationMatrix.makeRotationY(angle);
          if (axis === 'x') rotationMatrix.makeRotationX(angle);
          if (axis === 'z') rotationMatrix.makeRotationZ(angle);

          // Clone the existing matrix to avoid mutating state directly
          const newMatrix = cubie.matrix.clone();
          
          // To rotate around the world center (0,0,0), we pre-multiply the rotation
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
    if (isScrambling) return; // Prevent multiple scramble triggers
    setIsScrambling(true);

    const scrambleLength = 20; // Standard scramble length
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= scrambleLength) {
        clearInterval(interval);
        setIsScrambling(false);
        return;
      }

      // Pick a random move from our moves array
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      rotateLayer(randomMove.axis, randomMove.layer, randomMove.angle);

      currentStep++;
    }, 150); // Delay between moves in milliseconds
  };

  // Reset function to set the cube back to the solve state
  const resetCube = () => {
    if (isScrambling) return;
    setCubies(generateSolvedCube());
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

    // Log the colors for the Up (U) face as a quick demo
    const upFaceColors = faceStates.U.map(cubie => getFaceColor(cubie.rot, GLOBAL_DIRECTIONS.U));
    console.log("UP Face Colors (Y=1):", upFaceColors);
  };

  return (
    <div className='app-container'>
      {/* Dynamic control panel */}
      <div className="controls-container">
        <h3 className="controls-title">Controls</h3>

        {/* Scramble Button */}
        <button
          className='scramble-btn'
          onClick={scrambleCube}
          disabled={isScrambling}
        >
          {isScrambling ? 'Scrambling...' : 'Scramble Cube'}
        </button>

        {/* New utility buttons group */}
        <div className="utility-buttons">
          <button 
            className="utility-btn reset-btn"
            onClick={resetCube}
            disabled={isScrambling}
          >
            Reset
          </button>
          <button 
            className="utility-btn debug-btn"
            onClick={logCubeState}
            disabled={isScrambling}
          >
            Log State
          </button>
        </div>

        {/* New section for entire cube rotations */}
        <h4 className="section-title">Rotate Cube</h4>
        <div className="utility-buttons">
          <button 
            className="utility-btn rotate-all-btn"
            onClick={() => rotateEntireCube('y', Math.PI / 2)}
            disabled={isScrambling}
          >
            Rotate Y
          </button>
          <button 
            className="utility-btn rotate-all-btn"
            onClick={() => rotateEntireCube('x', Math.PI / 2)}
            disabled={isScrambling}
          >
            Rotate X
          </button>
          <button 
            className="utility-btn rotate-all-btn"
            onClick={() => rotateEntireCube('z', Math.PI / 2)}
            disabled={isScrambling}
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
              onClick={() => rotateLayer(move.axis, move.layer, move.angle)}
              disabled={isScrambling} // Disable manual moves during scramble
            >
              {move.name}
            </button>
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />

        <group>
          {cubies.map((cubie) => (
            <Cubie key={cubie.id} matrix={cubie.matrix} />
          ))}
        </group>

        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}