import * as tf from '@tensorflow/tfjs';

// Color mapping helper to convert our string colors into index values
const COLOR_TO_INDEX = {
  'red': 0,
  'orange': 1,
  'white': 2,
  'yellow': 3,
  'green': 4,
  'blue': 5
};

/**
 * Converts the 2D cube state object into a 1D flat binary array (One-Hot Encoded)
 * Input size: 54 facelets * 6 colors = 324 binary features.
 * This is the exact shape our Neural Network expects as Input.
 */
export function encodeCubeState(cubeState2D) {
    const facesOrder = ['U', 'D', 'R', 'L', 'F', 'B'];
    const encoded = [];

    facesOrder.forEach((face) => {
        const facelets = cubeState2D[face];
        facelets.forEach((cell) => {
            const colorIndex = COLOR_TO_INDEX[cell.color];

            // Create a 6-element one-hot vector for this single facelet
            const oneHot = Array(6).fill(0);
            if (colorIndex !== undefined) {
                oneHot[colorIndex] = 1;
            }
            
            encoded.push(...oneHot);
        });
    });

    return encoded;
}

/**
 * Creates and compiles a simple heuristic Deep Neural Network
 * Output: 1 single scalar (predicted cost/distance to the solved state)
 */
export function createHeuristicModel() {
  const model = tf.sequential();

  // Input Layer: 324 features
  model.add(tf.layers.dense({
    units: 128,
    activation: 'relu',
    inputShape: [324]
  }));

  // Hidden Layer
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu'
  }));

  // Output Layer: Single value predicting the heuristic distance
  model.add(tf.layers.dense({
    units: 1,
    activation: 'linear' 
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
  });

  return model;
}