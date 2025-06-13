class ProbabilityStrategy {
  constructor() {
    this.probabilities = {};
  }

  getNextMove(gameState) {
    this.calculateProbabilities(gameState);
    
    // Find coordinate with highest probability
    let maxProb = 0;
    let bestMove = null;
    
    Object.entries(this.probabilities).forEach(([coord, prob]) => {
      if (prob > maxProb && !gameState.cpuGuesses.has(coord)) {
        maxProb = prob;
        bestMove = coord;
      }
    });
    
    // If no valid move found, fall back to random
    if (!bestMove) {
      const size = gameState.playerBoard.size;
      let row, col;
      do {
        row = Math.floor(Math.random() * size);
        col = Math.floor(Math.random() * size);
        bestMove = `${row}${col}`;
      } while (gameState.cpuGuesses.has(bestMove));
    }
    
    return bestMove;
  }

  calculateProbabilities(gameState) {
    const size = gameState.playerBoard.size;
    const shipLength = 3; // Assuming fixed ship length of 3
    this.probabilities = {};
    
    // Initialize probabilities
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const coord = `${row}${col}`;
        if (!gameState.cpuGuesses.has(coord)) {
          this.probabilities[coord] = 0;
        }
      }
    }
    
    // Calculate probability for each possible ship placement
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Check horizontal placement
        if (col + shipLength <= size) {
          let valid = true;
          for (let i = 0; i < shipLength; i++) {
            const coord = `${row}${col + i}`;
            if (gameState.cpuGuesses.has(coord)) {
              valid = false;
              break;
            }
          }
          if (valid) {
            for (let i = 0; i < shipLength; i++) {
              const coord = `${row}${col + i}`;
              this.probabilities[coord] = (this.probabilities[coord] || 0) + 1;
            }
          }
        }
        
        // Check vertical placement
        if (row + shipLength <= size) {
          let valid = true;
          for (let i = 0; i < shipLength; i++) {
            const coord = `${row + i}${col}`;
            if (gameState.cpuGuesses.has(coord)) {
              valid = false;
              break;
            }
          }
          if (valid) {
            for (let i = 0; i < shipLength; i++) {
              const coord = `${row + i}${col}`;
              this.probabilities[coord] = (this.probabilities[coord] || 0) + 1;
            }
          }
        }
      }
    }
    
    // Normalize probabilities
    const maxProb = Math.max(...Object.values(this.probabilities));
    if (maxProb > 0) {
      Object.keys(this.probabilities).forEach(coord => {
        this.probabilities[coord] /= maxProb;
      });
    }
    
    return this.probabilities;
  }
}

module.exports = ProbabilityStrategy; 