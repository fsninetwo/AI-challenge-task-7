class ProbabilityStrategy {
  constructor() {
    this.probabilities = {};
  }

  getNextMove(gameState) {
    this.calculateProbabilities(gameState);
    
    // Find coordinate with highest probability
    let maxProb = 0;
    let bestMoves = [];
    
    Object.entries(this.probabilities).forEach(([coord, prob]) => {
      if (!gameState.cpuGuesses.has(coord)) {
        if (prob > maxProb) {
          maxProb = prob;
          bestMoves = [coord];
        } else if (prob === maxProb) {
          bestMoves.push(coord);
        }
      }
    });
    
    // If no valid move found, fall back to random
    if (bestMoves.length === 0) {
      const size = gameState.playerBoard.size;
      const allCoordinates = [];
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const coordinate = `${row}${col}`;
          if (!gameState.cpuGuesses.has(coordinate)) {
            allCoordinates.push(coordinate);
          }
        }
      }

      if (allCoordinates.length === 0) {
        throw new Error('No valid moves remaining');
      }

      const randomIndex = Math.floor(Math.random() * allCoordinates.length);
      return allCoordinates[randomIndex];
    }
    
    // Pick a random move from the best moves
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIndex];
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
          let hasGuess = false;
          for (let i = 0; i < shipLength; i++) {
            const coord = `${row}${col + i}`;
            if (gameState.cpuGuesses.has(coord)) {
              if (hasGuess) {
                valid = false;
                break;
              }
              hasGuess = true;
            }
          }
          if (valid) {
            for (let i = 0; i < shipLength; i++) {
              const coord = `${row}${col + i}`;
              if (!gameState.cpuGuesses.has(coord)) {
                this.probabilities[coord] = (this.probabilities[coord] || 0) + (hasGuess ? 2 : 1);
              }
            }
          }
        }
        
        // Check vertical placement
        if (row + shipLength <= size) {
          let valid = true;
          let hasGuess = false;
          for (let i = 0; i < shipLength; i++) {
            const coord = `${row + i}${col}`;
            if (gameState.cpuGuesses.has(coord)) {
              if (hasGuess) {
                valid = false;
                break;
              }
              hasGuess = true;
            }
          }
          if (valid) {
            for (let i = 0; i < shipLength; i++) {
              const coord = `${row + i}${col}`;
              if (!gameState.cpuGuesses.has(coord)) {
                this.probabilities[coord] = (this.probabilities[coord] || 0) + (hasGuess ? 2 : 1);
              }
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