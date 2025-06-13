class RandomStrategy {
  getNextMove(gameState) {
    const size = gameState.playerBoard.size;
    const guesses = gameState.cpuGuesses;
    
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
    return allCoordinates[randomIndex];
  }
}

module.exports = RandomStrategy; 