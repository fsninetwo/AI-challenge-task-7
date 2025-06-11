const { AIStrategy, HuntStrategy, TargetStrategy, AIContext } = require('../src/ai/AIStrategies');

// Mock GameConfig
jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key) => ({ boardSize: 10 }[key])
  }));
});

describe('AI Strategies', () => {
  describe('AIStrategy Base Class', () => {
    test('should throw error when makeMove is not implemented', () => {
      const strategy = new AIStrategy();
      expect(() => strategy.makeMove({})).toThrow('AI Strategy must implement makeMove method');
    });
  });

  describe('HuntStrategy', () => {
    let strategy;
    let gameState;

    beforeEach(() => {
      strategy = new HuntStrategy();
      gameState = { cpuGuesses: new Set() };
    });

    test('should return valid hunt move', () => {
      const move = strategy.makeMove(gameState);
      
      expect(move).toHaveProperty('coordinate');
      expect(move).toHaveProperty('mode');
      expect(move.mode).toBe('hunt');
      expect(move.coordinate).toMatch(/^\d\d$/);
    });

    test('should generate coordinates within board bounds', () => {
      for (let i = 0; i < 100; i++) {
        const move = strategy.makeMove(gameState);
        const [row, col] = [parseInt(move.coordinate[0]), parseInt(move.coordinate[1])];
        
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(10);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(10);
      }
    });

    test('should avoid duplicate guesses', () => {
      gameState.cpuGuesses.add('00');
      gameState.cpuGuesses.add('11');
      gameState.cpuGuesses.add('22');
      
      const move = strategy.makeMove(gameState);
      
      expect(gameState.cpuGuesses.has(move.coordinate)).toBe(false);
    });

    test('should eventually find valid coordinate even with many guesses', () => {
      // Fill most of the board
      for (let i = 0; i < 95; i++) {
        const coord = `${Math.floor(i / 10)}${i % 10}`;
        gameState.cpuGuesses.add(coord);
      }
      
      const move = strategy.makeMove(gameState);
      expect(gameState.cpuGuesses.has(move.coordinate)).toBe(false);
    });
  });

  describe('TargetStrategy', () => {
    let strategy;
    let gameState;

    beforeEach(() => {
      strategy = new TargetStrategy();
      gameState = { cpuGuesses: new Set() };
    });

    test('should fall back to hunt when no targets', () => {
      const move = strategy.makeMove(gameState);
      
      expect(move.mode).toBe('hunt');
      expect(move.coordinate).toMatch(/^\d\d$/);
    });

    test('should add adjacent targets correctly', () => {
      strategy.addTargets(5, 5, gameState);
      
      expect(strategy.targetQueue).toContain('45'); // North
      expect(strategy.targetQueue).toContain('65'); // South
      expect(strategy.targetQueue).toContain('54'); // West
      expect(strategy.targetQueue).toContain('56'); // East
      expect(strategy.targetQueue).toHaveLength(4);
    });

    test('should filter out invalid targets', () => {
      // Test corner position
      strategy.addTargets(0, 0, gameState);
      
      expect(strategy.targetQueue).toContain('10'); // South
      expect(strategy.targetQueue).toContain('01'); // East
      expect(strategy.targetQueue).toHaveLength(2); // Only valid ones
    });

    test('should filter out already guessed targets', () => {
      gameState.cpuGuesses.add('45');
      gameState.cpuGuesses.add('56');
      
      strategy.addTargets(5, 5, gameState);
      
      expect(strategy.targetQueue).toContain('65'); // South
      expect(strategy.targetQueue).toContain('54'); // West
      expect(strategy.targetQueue).not.toContain('45'); // Already guessed
      expect(strategy.targetQueue).not.toContain('56'); // Already guessed
    });

    test('should avoid duplicate targets in queue', () => {
      strategy.addTargets(5, 5, gameState);
      strategy.addTargets(5, 5, gameState); // Add same targets again
      
      expect(strategy.targetQueue).toHaveLength(4); // No duplicates
    });

    test('should return target mode when targets available', () => {
      strategy.addTargets(5, 5, gameState);
      
      const move = strategy.makeMove(gameState);
      
      expect(move.mode).toBe('target');
      expect(['45', '65', '54', '56']).toContain(move.coordinate);
    });

    test('should skip already guessed targets from queue', () => {
      strategy.addTargets(5, 5, gameState);
      gameState.cpuGuesses.add('45');
      gameState.cpuGuesses.add('65');
      
      const move = strategy.makeMove(gameState);
      
      expect(['54', '56']).toContain(move.coordinate);
    });

    test('should reset target queue', () => {
      strategy.addTargets(5, 5, gameState);
      expect(strategy.targetQueue.length).toBeGreaterThan(0);
      
      strategy.reset();
      expect(strategy.targetQueue).toHaveLength(0);
    });

    test('should handle edge coordinates correctly', () => {
      // Test all corners and edges
      const edgeCases = [
        { row: 0, col: 0, expected: 2 }, // Top-left corner
        { row: 0, col: 9, expected: 2 }, // Top-right corner
        { row: 9, col: 0, expected: 2 }, // Bottom-left corner
        { row: 9, col: 9, expected: 2 }, // Bottom-right corner
        { row: 0, col: 5, expected: 3 }, // Top edge
        { row: 9, col: 5, expected: 3 }, // Bottom edge
        { row: 5, col: 0, expected: 3 }, // Left edge
        { row: 5, col: 9, expected: 3 }, // Right edge
      ];

      edgeCases.forEach(({ row, col, expected }) => {
        const testStrategy = new TargetStrategy();
        testStrategy.addTargets(row, col, gameState);
        expect(testStrategy.targetQueue).toHaveLength(expected);
      });
    });
  });

  describe('AIContext', () => {
    let context;
    let gameState;

    beforeEach(() => {
      context = new AIContext();
      gameState = { cpuGuesses: new Set() };
    });

    test('should start in hunt mode', () => {
      expect(context.currentStrategy).toBeInstanceOf(HuntStrategy);
    });

    test('should switch to hunt mode', () => {
      // First switch to target mode
      context.switchToTarget(5, 5, gameState);
      expect(context.currentStrategy).toBeInstanceOf(TargetStrategy);
      
      // Then switch back to hunt
      context.switchToHunt();
      expect(context.currentStrategy).toBeInstanceOf(HuntStrategy);
    });

    test('should switch to target mode and add targets', () => {
      context.switchToTarget(5, 5, gameState);
      
      expect(context.currentStrategy).toBeInstanceOf(TargetStrategy);
      expect(context.targetStrategy.targetQueue.length).toBeGreaterThan(0);
    });

    test('should reset target strategy when switching to hunt', () => {
      context.switchToTarget(5, 5, gameState);
      expect(context.targetStrategy.targetQueue.length).toBeGreaterThan(0);
      
      context.switchToHunt();
      expect(context.targetStrategy.targetQueue).toHaveLength(0);
    });

    test('should delegate makeMove to current strategy', () => {
      // Test hunt mode
      const huntMove = context.makeMove(gameState);
      expect(huntMove.mode).toBe('hunt');
      
      // Test target mode
      context.switchToTarget(5, 5, gameState);
      const targetMove = context.makeMove(gameState);
      expect(targetMove.mode).toBe('target');
    });

    test('should maintain separate strategy instances', () => {
      const huntStrategy = context.huntStrategy;
      const targetStrategy = context.targetStrategy;
      
      context.switchToTarget(5, 5, gameState);
      context.switchToHunt();
      
      expect(context.huntStrategy).toBe(huntStrategy);
      expect(context.targetStrategy).toBe(targetStrategy);
    });
  });

  describe('Integration Tests', () => {
    test('should simulate complete AI decision cycle', () => {
      const context = new AIContext();
      const gameState = { cpuGuesses: new Set() };
      
      // Start with hunt
      const huntMove = context.makeMove(gameState);
      expect(huntMove.mode).toBe('hunt');
      gameState.cpuGuesses.add(huntMove.coordinate);
      
      // Switch to target after hit
      const [hitRow, hitCol] = [5, 5];
      context.switchToTarget(hitRow, hitCol, gameState);
      
      // Should now target adjacent cells
      const targetMove = context.makeMove(gameState);
      expect(targetMove.mode).toBe('target');
      
      const [targetRow, targetCol] = [parseInt(targetMove.coordinate[0]), parseInt(targetMove.coordinate[1])];
      const isAdjacent = Math.abs(targetRow - hitRow) + Math.abs(targetCol - hitCol) === 1;
      expect(isAdjacent).toBe(true);
    });

    test('should handle rapid strategy switching', () => {
      const context = new AIContext();
      const gameState = { cpuGuesses: new Set() };
      
      for (let i = 0; i < 10; i++) {
        context.switchToTarget(i % 10, i % 10, gameState);
        context.switchToHunt();
      }
      
      // Should still work correctly
      const move = context.makeMove(gameState);
      expect(move.mode).toBe('hunt');
      expect(move.coordinate).toMatch(/^\d\d$/);
    });
  });
}); 