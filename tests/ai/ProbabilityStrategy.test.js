const ProbabilityStrategy = require('../../src/ai/ProbabilityStrategy');

describe('ProbabilityStrategy', () => {
  let strategy;
  let gameState;

  beforeEach(() => {
    strategy = new ProbabilityStrategy();
    gameState = {
      cpuGuesses: new Set(),
      playerBoard: {
        size: 10
      }
    };
  });

  test('should initialize with empty probabilities', () => {
    expect(strategy.probabilities).toEqual({});
  });

  test('should calculate probabilities for empty board', () => {
    const probabilities = strategy.calculateProbabilities(gameState);
    
    // Check that all cells have a probability
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const coord = `${row}${col}`;
        expect(probabilities[coord]).toBeDefined();
        expect(probabilities[coord]).toBeGreaterThanOrEqual(0);
        expect(probabilities[coord]).toBeLessThanOrEqual(1);
      }
    }

    // Check that corner cells have lower probability (fewer possible ship placements)
    expect(probabilities['00']).toBeLessThan(probabilities['44']);
    expect(probabilities['09']).toBeLessThan(probabilities['44']);
    expect(probabilities['90']).toBeLessThan(probabilities['44']);
    expect(probabilities['99']).toBeLessThan(probabilities['44']);
  });

  test('should return valid move for empty board', () => {
    const move = strategy.getNextMove(gameState);
    expect(move).toMatch(/^\d{2}$/);
    
    const row = parseInt(move[0]);
    const col = parseInt(move[1]);
    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(10);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(10);
  });

  test('should not return previously guessed coordinates', () => {
    // Add some guesses
    gameState.cpuGuesses.add('44');
    gameState.cpuGuesses.add('45');
    gameState.cpuGuesses.add('46');

    const move = strategy.getNextMove(gameState);
    expect(gameState.cpuGuesses.has(move)).toBe(false);
  });

  test('should prefer cells with higher probability', () => {
    // Add guesses that make certain cells more likely
    gameState.cpuGuesses.add('44');
    gameState.cpuGuesses.add('45');
    // Now 43 or 46 should have high probability as they could complete a ship

    const probabilities = strategy.calculateProbabilities(gameState);
    const move = strategy.getNextMove(gameState);

    // Both 43 and 46 should have equal probability
    expect(probabilities['43']).toBe(probabilities['46']);
    // And the move should be one of the highest probability cells
    expect(probabilities[move]).toBe(1);
  });

  test('should handle partially guessed rows', () => {
    // Add guesses in a pattern that suggests horizontal ship placement
    gameState.cpuGuesses.add('44');
    gameState.cpuGuesses.add('45');

    const probabilities = strategy.calculateProbabilities(gameState);
    
    // 43 and 46 should have equal probability
    expect(probabilities['43']).toBe(probabilities['46']);
    // And they should have higher probability than cells in other rows
    expect(probabilities['43']).toBeGreaterThanOrEqual(probabilities['33']);
    expect(probabilities['46']).toBeGreaterThanOrEqual(probabilities['56']);
  });

  test('should handle partially guessed columns', () => {
    // Add guesses in a pattern that suggests vertical ship placement
    gameState.cpuGuesses.add('44');
    gameState.cpuGuesses.add('54');

    const probabilities = strategy.calculateProbabilities(gameState);
    
    // 34 and 64 should have equal probability
    expect(probabilities['34']).toBe(probabilities['64']);
    // And they should have higher probability than cells in other columns
    expect(probabilities['34']).toBeGreaterThanOrEqual(probabilities['33']);
    expect(probabilities['64']).toBeGreaterThanOrEqual(probabilities['65']);
  });

  test('should handle nearly full board', () => {
    // Fill most of the board except for one cell
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (row !== 9 || col !== 9) {
          gameState.cpuGuesses.add(`${row}${col}`);
        }
      }
    }

    const move = strategy.getNextMove(gameState);
    expect(move).toBe('99');
  });

  test('should handle full board gracefully', () => {
    // Fill the entire board
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        gameState.cpuGuesses.add(`${row}${col}`);
      }
    }

    expect(() => strategy.getNextMove(gameState)).toThrow();
  });

  test('should normalize probabilities correctly', () => {
    const probabilities = strategy.calculateProbabilities(gameState);
    
    // Find maximum probability
    const maxProb = Math.max(...Object.values(probabilities));
    expect(maxProb).toBe(1);

    // Check that all probabilities are normalized
    Object.values(probabilities).forEach(prob => {
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });
  });

  test('should handle edge of board correctly', () => {
    // Add guesses near the edge
    gameState.cpuGuesses.add('08');
    gameState.cpuGuesses.add('09');

    const probabilities = strategy.calculateProbabilities(gameState);
    
    // Cells at the edge should have lower probability
    expect(probabilities['07']).toBeGreaterThanOrEqual(probabilities['00']);
    expect(probabilities['17']).toBeGreaterThanOrEqual(probabilities['19']);
  });

  test('should fall back to random when no high probability moves', () => {
    // Create a pattern where no clear high probability moves exist
    for (let i = 0; i < 10; i += 2) {
      for (let j = 0; j < 10; j += 2) {
        gameState.cpuGuesses.add(`${i}${j}`);
      }
    }

    const move = strategy.getNextMove(gameState);
    expect(move).toMatch(/^\d{2}$/);
    expect(gameState.cpuGuesses.has(move)).toBe(false);
  });
}); 