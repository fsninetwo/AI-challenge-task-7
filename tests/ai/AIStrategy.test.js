const AIContext = require('../../src/ai/AIContext');
const RandomStrategy = require('../../src/ai/RandomStrategy');
const HuntTargetStrategy = require('../../src/ai/HuntTargetStrategy');
const ProbabilityStrategy = require('../../src/ai/ProbabilityStrategy');

describe('AI Strategy Tests', () => {
  let aiContext;
  let gameState;

  beforeEach(() => {
    aiContext = new AIContext();
    gameState = {
      cpuGuesses: new Set(),
      playerBoard: {
        size: 10,
        getShipAt: jest.fn(),
        ships: []
      }
    };
  });

  describe('Strategy Context', () => {
    test('should initialize with random strategy', () => {
      expect(aiContext.strategy).toBeInstanceOf(RandomStrategy);
    });

    test('should switch strategies', () => {
      aiContext.setStrategy(new HuntTargetStrategy());
      expect(aiContext.strategy).toBeInstanceOf(HuntTargetStrategy);
    });

    test('should execute current strategy', () => {
      const mockStrategy = {
        getNextMove: jest.fn().mockReturnValue('00')
      };
      aiContext.setStrategy(mockStrategy);
      aiContext.getNextMove(gameState);
      expect(mockStrategy.getNextMove).toHaveBeenCalledWith(gameState);
    });
  });

  describe('Random Strategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = new RandomStrategy();
    });

    test('should generate valid moves', () => {
      const move = strategy.getNextMove(gameState);
      expect(move).toMatch(/^\d{2}$/);
      const [row, col] = [parseInt(move[0]), parseInt(move[1])];
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(10);
    });

    test('should not repeat moves', () => {
      // Mock a smaller board size for testing
      gameState.playerBoard.size = 3;
      const moves = new Set();
      const totalMoves = 9; // 3x3 board
      
      for (let i = 0; i < totalMoves; i++) {
        const move = strategy.getNextMove(gameState);
        expect(moves.has(move)).toBe(false);
        moves.add(move);
        gameState.cpuGuesses.add(move);
      }
    });
  });

  describe('Hunt Target Strategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = new HuntTargetStrategy();
    });

    test('should target adjacent cells after hit', () => {
      gameState.playerBoard.getShipAt.mockReturnValue({ isHit: () => true });
      const firstMove = strategy.getNextMove(gameState);
      gameState.cpuGuesses.add(firstMove);
      
      // After a hit, should target adjacent cells
      const nextMove = strategy.getNextMove(gameState);
      const [row1, col1] = [parseInt(firstMove[0]), parseInt(firstMove[1])];
      const [row2, col2] = [parseInt(nextMove[0]), parseInt(nextMove[1])];
      const isAdjacent = Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
      expect(isAdjacent).toBe(true);
    });

    test('should revert to random when no targets', () => {
      gameState.playerBoard.getShipAt.mockReturnValue(null);
      // Mock a smaller board size for testing
      gameState.playerBoard.size = 3;
      const moves = new Set();
      const totalMoves = 5; // Test with fewer moves than board size
      
      for (let i = 0; i < totalMoves; i++) {
        const move = strategy.getNextMove(gameState);
        expect(moves.has(move)).toBe(false);
        moves.add(move);
        gameState.cpuGuesses.add(move);
      }
    });
  });

  describe('Probability Strategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = new ProbabilityStrategy();
    });

    test('should calculate hit probabilities', () => {
      const probabilities = strategy.calculateProbabilities(gameState);
      expect(Object.keys(probabilities).length).toBeGreaterThan(0);
      Object.values(probabilities).forEach(prob => {
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });

    test('should choose highest probability move', () => {
      const move = strategy.getNextMove(gameState);
      expect(move).toMatch(/^\d{2}$/);
      const [row, col] = [parseInt(move[0]), parseInt(move[1])];
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(10);
    });

    test('should update probabilities after hits', () => {
      gameState.playerBoard.getShipAt.mockReturnValue({ isHit: () => true });
      const firstProbs = strategy.calculateProbabilities(gameState);
      const move = strategy.getNextMove(gameState);
      gameState.cpuGuesses.add(move);
      const secondProbs = strategy.calculateProbabilities(gameState);
      expect(secondProbs).not.toEqual(firstProbs);
    });
  });

  describe('Strategy Integration', () => {
    test('should switch strategies based on game state', () => {
      const mockShip = { isHit: () => true };
      gameState.playerBoard.getShipAt.mockReturnValue(mockShip);
      
      // Start with random
      expect(aiContext.strategy).toBeInstanceOf(RandomStrategy);
      const firstMove = aiContext.getNextMove(gameState);
      gameState.cpuGuesses.add(firstMove);
      
      // After hit, should switch to hunt-target
      aiContext.updateStrategy(gameState);
      expect(aiContext.strategy).toBeInstanceOf(HuntTargetStrategy);
      
      // After several misses, should switch to probability
      gameState.playerBoard.getShipAt.mockReturnValue(null);
      for (let i = 0; i < 3; i++) {
        const move = aiContext.getNextMove(gameState);
        gameState.cpuGuesses.add(move);
        aiContext.updateStrategy(gameState);
      }
      expect(aiContext.strategy).toBeInstanceOf(ProbabilityStrategy);
    });
  });
}); 