class HuntTargetStrategy {
  constructor() {
    this.lastHit = null;
    this.targetQueue = [];
  }

  getNextMove(gameState) {
    const size = gameState.playerBoard.size;
    const guesses = gameState.cpuGuesses;

    // If we have a target queue, use it
    while (this.targetQueue.length > 0) {
      const target = this.targetQueue.shift();
      if (!guesses.has(target)) {
        if (gameState.playerBoard.getShipAt(target)) {
          this.lastHit = target;
        }
        return target;
      }
    }

    // If we have a last hit, add adjacent cells to target queue
    if (this.lastHit) {
      const [row, col] = [parseInt(this.lastHit[0]), parseInt(this.lastHit[1])];
      const adjacentCells = [
        [row - 1, col], // up
        [row + 1, col], // down
        [row, col - 1], // left
        [row, col + 1]  // right
      ];

      adjacentCells.forEach(([r, c]) => {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const coordinate = `${r}${c}`;
          if (!guesses.has(coordinate)) {
            this.targetQueue.push(coordinate);
          }
        }
      });

      // If we found valid targets, use the first one
      if (this.targetQueue.length > 0) {
        const nextMove = this.targetQueue.shift();
        if (gameState.playerBoard.getShipAt(nextMove)) {
          this.lastHit = nextMove;
        }
        return nextMove;
      }
    }

    // Fall back to random targeting
    // Get all possible coordinates
    const allCoordinates = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const coordinate = `${row}${col}`;
        if (!guesses.has(coordinate)) {
          allCoordinates.push(coordinate);
        }
      }
    }
    
    // Pick a random unguessed coordinate
    const randomIndex = Math.floor(Math.random() * allCoordinates.length);
    const coordinate = allCoordinates[randomIndex];

    // If we hit a ship, update lastHit
    if (gameState.playerBoard.getShipAt(coordinate)) {
      this.lastHit = coordinate;
    }

    return coordinate;
  }

  updateLastHit(coordinate, wasHit) {
    if (wasHit) {
      this.lastHit = coordinate;
    }
  }
}

module.exports = HuntTargetStrategy; 