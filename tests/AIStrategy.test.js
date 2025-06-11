/**
 * AI Strategy Tests - Comprehensive coverage for AI Strategy module
 * 
 * @module tests/AIStrategy
 */

const {
  AIStrategy,
  HuntStrategy,
  TargetStrategy,
  AIContext
} = require('../src/ai/AIStrategy');

jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key) => {
      const config = {
        boardSize: 10,
        numShips: 3,
        shipLength: 3
      };
      return config[key];
    }
  }));
});

describe('AI Strategy', () => {
  describe('AIStrategy Base Class', () => {
    test('should throw error when makeMove is not implemented', () => {
      const strategy = new AIStrategy();
      expect(() => strategy.makeMove({})).toThrow('AI Strategy must implement makeMove method');
    });

    test('should return correct name', () => {
      const strategy = new AIStrategy();
      expect(strategy.getName()).toBe('AIStrategy');
    });
  });

  describe('HuntStrategy', () => {
    let huntStrategy;
    let mockGameState;

    beforeEach(() => {
      huntStrategy = new HuntStrategy();
      mockGameState = {
        cpuGuesses: new Set()
      };
    });

    test('should create instance with empty previous moves', () => {
      expect(huntStrategy.previousMoves.size).toBe(0);
    });

    test('should make valid random move', () => {
      const move = huntStrategy.makeMove(mockGameState);
      
      expect(move).toHaveProperty('coordinate');
      expect(move.coordinate).toMatch(/^[0-9][0-9]$/);
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
      expect(move.confidence).toBe(0.1);
    });

    test('should avoid previously guessed coordinates', () => {
      mockGameState.cpuGuesses.add('00');
      mockGameState.cpuGuesses.add('11');
      mockGameState.cpuGuesses.add('22');
      
      const move = huntStrategy.makeMove(mockGameState);
      
      expect(mockGameState.cpuGuesses.has(move.coordinate)).toBe(false);
    });

    test('should reset strategy state', () => {
      huntStrategy.makeMove(mockGameState);
      expect(huntStrategy.previousMoves.size).toBeGreaterThan(0);
      
      huntStrategy.reset();
      expect(huntStrategy.previousMoves.size).toBe(0);
    });
  });

  describe('TargetStrategy', () => {
    let targetStrategy;
    let mockGameState;

    beforeEach(() => {
      targetStrategy = new TargetStrategy();
      mockGameState = {
        cpuGuesses: new Set()
      };
    });

    test('should create instance with empty queues', () => {
      expect(targetStrategy.targetQueue.length).toBe(0);
      expect(targetStrategy.hitHistory.length).toBe(0);
    });

    test('should add targets around hit location', () => {
      targetStrategy.addTargets(5, 5, mockGameState);
      
      expect(targetStrategy.targetQueue.length).toBe(4);
      
      const coordinates = targetStrategy.targetQueue.map(t => t.coordinate);
      expect(coordinates).toContain('45'); // north
      expect(coordinates).toContain('65'); // south
      expect(coordinates).toContain('54'); // west
      expect(coordinates).toContain('56'); // east
    });

    test('should validate target coordinates correctly', () => {
      expect(targetStrategy.isValidTarget(5, 5, mockGameState)).toBe(true);
      expect(targetStrategy.isValidTarget(-1, 5, mockGameState)).toBe(false);
      expect(targetStrategy.isValidTarget(10, 5, mockGameState)).toBe(false);
    });

    test('should fall back to hunt strategy when no targets', () => {
      const move = targetStrategy.makeMove(mockGameState);
      
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
    });

    test('should make targeted move when targets available', () => {
      targetStrategy.addTargets(5, 5, mockGameState);
      
      const move = targetStrategy.makeMove(mockGameState);
      
      expect(move.mode).toBe('target');
      expect(move.strategy).toBe('TargetStrategy');
      expect(move.confidence).toBe(0.8);
    });

    test('should reset strategy state', () => {
      targetStrategy.addTargets(5, 5, mockGameState);
      targetStrategy.updateStrategy('55', true, false);
      
      targetStrategy.reset();
      
      expect(targetStrategy.targetQueue.length).toBe(0);
      expect(targetStrategy.hitHistory.length).toBe(0);
    });
  });

  describe('AIContext', () => {
    let aiContext;
    let mockGameState;

    beforeEach(() => {
      aiContext = new AIContext();
      mockGameState = {
        cpuGuesses: new Set(),
        playerNumShips: 3,
        cpuNumShips: 3
      };
    });

    test('should create instance with hunt strategy as default', () => {
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
      expect(aiContext.moveHistory.length).toBe(0);
    });

    test('should switch to hunt mode', () => {
      aiContext.switchToTarget(5, 5, mockGameState);
      expect(aiContext.currentStrategy).toBeInstanceOf(TargetStrategy);
      
      aiContext.switchToHunt();
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
    });

    test('should make move using current strategy', () => {
      const move = aiContext.makeMove(mockGameState);
      
      expect(move).toHaveProperty('coordinate');
      expect(move).toHaveProperty('mode');
      expect(move).toHaveProperty('strategy');
      expect(aiContext.moveHistory.length).toBe(1);
    });

    test('should update result statistics', () => {
      aiContext.updateResult('55', true, false);
      
      expect(aiContext.performanceStats.hits).toBe(1);
      expect(aiContext.performanceStats.misses).toBe(0);
    });

    test('should get performance statistics', () => {
      aiContext.updateResult('55', true, false);
      aiContext.updateResult('56', false, false);
      
      const stats = aiContext.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalMoves).toBe(2);
      expect(stats.accuracy).toBe(50);
      expect(stats.currentStrategy).toBe('HuntStrategy');
    });

    test('should reset context state', () => {
      aiContext.makeMove(mockGameState);
      aiContext.updateResult('55', true, false);
      
      aiContext.reset();
      
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
      expect(aiContext.moveHistory.length).toBe(0);
      expect(aiContext.performanceStats.hits).toBe(0);
    });
  });
}); 