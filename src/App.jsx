import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Define the 6 standard colors of a Rubik's Cube
// Order of materials in Three.js BoxGeometry: [Right (X+), Left (X-), Top (Y+), Bottom (Y-), Front (Z+), Back (Z-)]
const FACE_COLORS = ['red', 'orange', 'white', 'yellow', 'green', 'blue'];

// Individual Cubie component
function Cubie({ position, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
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
  // Generate initial state for 27 cubies
  const initialCubies = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        initialCubies.push({
          id: `${x}-${y}-${z}`,
          // Current logical coordinate in 3D space
          pos: [x, y, z],
          // Current rotation of the cubie (Euler angles in radians)
          rot: [0, 0, 0],
        });
      }
    }
  }

  const [cubies, setCubies] = useState(initialCubies);

  // Function to rotate the TOP face (Y = 1) clockwise by 90 degrees (PI / 2 radians)
  const rotateTopFace = () => {
    setCubies((prevCubies) =>
      prevCubies.map((cubie) => {
        const [x, y, z] = cubie.pos;

        // Check if the cubie is part of the TOP layer (Y coordinate is 1)
        if (y === 1) {
          // 2D Rotation matrix formula for 90 degrees clockwise on the XZ plane:
          // newX = -z
          // newZ = x
          const newX = -z;
          const newY = y; // Y stays the same during Y-axis rotation
          const newZ = x;

          // Update the cubie's individual rotation state
          const [rotX, rotY, rotZ] = cubie.rot;
          
          return {
            ...cubie,
            pos: [newX, newY, newZ],
            // We rotate around the Y axis by -90 degrees (-PI / 2) for clockwise
            rot: [rotX, rotY - Math.PI / 2, rotZ],
          };
        }
        
        // If it's not on the top layer, leave it unchanged
        return cubie;
      })
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Overlay for controls */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <button 
          onClick={rotateTopFace}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}
        >
          Rotate Top Face (U)
        </button>
      </div>

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Render the cubies from state */}
        <group>
          {cubies.map((cubie) => (
            <Cubie key={cubie.id} position={cubie.pos} rotation={cubie.rot} />
          ))}
        </group>

        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}