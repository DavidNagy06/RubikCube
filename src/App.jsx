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
  // Generate initial state with 3D transformation matrices
  const initialCubies = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const matrix = new THREE.Matrix4();
        // Set the initial translation (position) of the cubie
        matrix.makeTranslation(x, y, z);

        initialCubies.push({
          id: `${x}-${y}-${z}`,
          matrix: matrix,
        });
      }
    }
  }

  const [cubies, setCubies] = useState(initialCubies);

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

  return (
    <div className="app-container">
      {/* Cleaned control overlay using CSS classes */}
      <div className="controls-container">
        <button 
          className="control-btn"
          onClick={() => rotateLayer('y', 1, -Math.PI / 2)} // Rotate U (Up) Clockwise
        >
          U (Top Clockwise)
        </button>
        <button 
          className="control-btn"
          onClick={() => rotateLayer('y', 1, Math.PI / 2)} // Rotate U' (Up Counter-Clockwise)
        >
          U' (Top Counter-Clockwise)
        </button>
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