import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// Define the 6 standard colors of a Rubik's Cube
// Order of materials in Three.js BoxGeometry: [Right (X+), Left (X-), Top (Y+), Bottom (Y-), Front (Z+), Back (Z-)]
const FACE_COLORS = ['red', 'orange', 'white', 'yellow', 'green', 'blue'];

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

  // Debug function to log current cubie positions (Step towards state exporting)
  const logCubeState = () => {
    console.log("CURRENT CUBE LOGICAL POSITIONS");
    cubies.forEach((cubie) => {
      const currentPos = new THREE.Vector3();
      currentPos.setFromMatrixPosition(cubie.matrix);
      // Rounding to avoid floating-point errors (e.g. -0.0000001 -> 0)
      const x = Math.round(currentPos.x);
      const y = Math.round(currentPos.y);
      const z = Math.round(currentPos.z);
      console.log(`Cubie ID: ${cubie.id} is currently at physical 3D space: [${x}, ${y}, ${z}]`);
    })
  }

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