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

const GameBoard = require('../src/entities/GameBoard');
const Ship = require('../src/entities/Ship');

jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key) => {
      const config = {
        boardSize: 10,
        numShips: 3,
        shipLength: 3,
        symbols: {
          water: '~',
          ship: 'S',
          hit: 'X',
          miss: 'O'
        }
      };
      return config[key];
    }
  }));
});

describe('AI Strategy', () => {
  describe('AIStrategy Base Class', () => {
    test('should throw error when makeMove is not implemented', () => {
      const strategy = new AIStrategy();
      expect(() => strategy.makeMove(new Set(), new GameBoard())).toThrow('AI Strategy must implement makeMove method');
    });

    test('should return correct name', () => {
      const strategy = new AIStrategy();
      expect(strategy.getName()).toBe('AIStrategy');
    });
  });

  describe('HuntStrategy', () => {
    let huntStrategy;
    let playerBoard;
    let previousGuesses;

    beforeEach(() => {
      huntStrategy = new HuntStrategy();
      playerBoard = new GameBoard();
      previousGuesses = new Set();
    });

    test('should create instance with empty previous moves', () => {
      expect(huntStrategy.previousMoves.size).toBe(0);
    });

    test('should make valid random move', () => {
      const move = huntStrategy.makeMove(previousGuesses, playerBoard);
      
      expect(move).toHaveProperty('coordinate');
      expect(move.coordinate).toMatch(/^[0-9][0-9]$/);
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
      expect(move.confidence).toBe(0.1);
    });

    test('should avoid previously guessed coordinates', () => {
      previousGuesses.add('00');
      previousGuesses.add('11');
      previousGuesses.add('22');
      
      const move = huntStrategy.makeMove(previousGuesses, playerBoard);
      
      expect(previousGuesses.has(move.coordinate)).toBe(false);
    });

    test('should reset strategy state', () => {
      huntStrategy.makeMove(previousGuesses, playerBoard);
      expect(huntStrategy.previousMoves.size).toBeGreaterThan(0);
      
      huntStrategy.reset();
      expect(huntStrategy.previousMoves.size).toBe(0);
    });
  });

  describe('TargetStrategy', () => {
    let targetStrategy;
    let playerBoard;
    let previousGuesses;

    beforeEach(() => {
      targetStrategy = new TargetStrategy();
      playerBoard = new GameBoard();
      previousGuesses = new Set();
    });

    test('should create instance with empty queues', () => {
      expect(targetStrategy.targetQueue.length).toBe(0);
      expect(targetStrategy.hitHistory.length).toBe(0);
    });

    test('should add targets around hit location', () => {
      targetStrategy.addTargets(5, 5, previousGuesses);
      
      expect(targetStrategy.targetQueue.length).toBe(4);
      
      const coordinates = targetStrategy.targetQueue.map(t => t.coordinate);
      expect(coordinates).toContain('45'); // north
      expect(coordinates).toContain('65'); // south
      expect(coordinates).toContain('54'); // west
      expect(coordinates).toContain('56'); // east
    });

    test('should validate target coordinates correctly', () => {
      expect(targetStrategy.isValidTarget(5, 5, 10, previousGuesses)).toBe(true);
      expect(targetStrategy.isValidTarget(-1, 5, 10, previousGuesses)).toBe(false);
      expect(targetStrategy.isValidTarget(10, 5, 10, previousGuesses)).toBe(false);
    });

    test('should fall back to hunt strategy when no targets', () => {
      const move = targetStrategy.makeMove(previousGuesses, playerBoard);
      
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
    });

    test('should make targeted move when targets available', () => {
      targetStrategy.addTargets(5, 5, previousGuesses);
      
      const move = targetStrategy.makeMove(previousGuesses, playerBoard);
      
      expect(move.mode).toBe('target');
      expect(move.strategy).toBe('TargetStrategy');
      expect(move.confidence).toBe(0.8);
    });

    test('should update strategy based on hit result', () => {
      targetStrategy.updateStrategy('55', true, false);
      expect(targetStrategy.hitHistory.length).toBe(1);
      expect(targetStrategy.hitHistory[0].coordinate).toBe('55');
      expect(targetStrategy.hitHistory[0].wasSunk).toBe(false);
    });

    test('should reset strategy state', () => {
      targetStrategy.addTargets(5, 5, previousGuesses);
      targetStrategy.updateStrategy('55', true, false);
      
      targetStrategy.reset();
      
      expect(targetStrategy.targetQueue.length).toBe(0);
      expect(targetStrategy.hitHistory.length).toBe(0);
    });
  });

  describe('AIContext', () => {
    let aiContext;
    let playerBoard;
    let previousGuesses;

    beforeEach(() => {
      aiContext = new AIContext();
      playerBoard = new GameBoard();
      previousGuesses = new Set();
    });

    test('should create instance with hunt strategy as default', () => {
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
      expect(aiContext.moveHistory.length).toBe(0);
    });

    test('should make move using current strategy', () => {
      const move = aiContext.makeMove(previousGuesses, playerBoard);
      
      expect(move).toHaveProperty('coordinate');
      expect(move).toHaveProperty('mode');
      expect(move).toHaveProperty('strategy');
      expect(aiContext.moveHistory.length).toBe(1);
    });

    test('should update result and switch strategies', () => {
      // First move - miss
      const move1 = aiContext.makeMove(previousGuesses, playerBoard);
      aiContext.updateResult(false, move1.coordinate);
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
      
      // Second move - hit
      const move2 = aiContext.makeMove(previousGuesses, playerBoard);
      aiContext.updateResult(true, move2.coordinate);
      expect(aiContext.currentStrategy).toBeInstanceOf(TargetStrategy);
    });

    test('should get accurate statistics', () => {
      const move1 = aiContext.makeMove(previousGuesses, playerBoard);
      aiContext.updateResult(true, move1.coordinate);
      const move2 = aiContext.makeMove(previousGuesses, playerBoard);
      aiContext.updateResult(false, move2.coordinate);
      
      const stats = aiContext.getStats();
      expect(stats).toEqual({
        totalMoves: 2,
        hits: 1,
        misses: 1,
        accuracy: 0.5,
        shipsFound: 0,
        shipsSunk: 0,
        currentStrategy: 'TargetStrategy'
      });
    });

    test('should reset context state', () => {
      const move = aiContext.makeMove(previousGuesses, playerBoard);
      aiContext.updateResult(true, move.coordinate);
      
      aiContext.reset();
      
      expect(aiContext.currentStrategy).toBeInstanceOf(HuntStrategy);
      expect(aiContext.moveHistory.length).toBe(0);
      expect(aiContext.performanceStats.hits).toBe(0);
      expect(aiContext.performanceStats.misses).toBe(0);
    });
  });
}); 