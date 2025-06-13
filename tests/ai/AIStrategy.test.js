const GameConfig = require('../../src/config/GameConfig');
const { AIStrategy, HuntStrategy, TargetStrategy, AIContext } = require('../../src/ai/AIStrategy');

// Common test setup
let gameState;

beforeEach(() => {
  gameState = {
    cpuGuesses: new Set(),
    playerBoard: {
      size: new GameConfig().get('boardSize'),
      ships: []
    }
  };
});

describe('AIStrategy Base Class', () => {
  it('should require makeMove implementation', () => {
    const strategy = new AIStrategy();
    expect(() => strategy.makeMove({})).toThrow('AI Strategy must implement makeMove method');
  });

  it('should return class name from getName', () => {
    const strategy = new AIStrategy();
    expect(strategy.getName()).toBe('AIStrategy');
  });
});

describe('HuntStrategy', () => {
  let huntStrategy;

  beforeEach(() => {
    huntStrategy = new HuntStrategy();
  });

  describe('move generation', () => {
    it('should make random moves within board bounds', () => {
      const move = huntStrategy.makeMove(gameState);
      const [row, col] = move.coordinate.split('').map(Number);
      const boardSize = gameState.playerBoard.size;
      
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(boardSize);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(boardSize);
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
      expect(move.confidence).toBe(0.1);
    });

    it('should not repeat previous moves', () => {
      const moves = new Set();
      for (let i = 0; i < 10; i++) {
        const move = huntStrategy.makeMove(gameState);
        expect(moves.has(move.coordinate)).toBe(false);
        moves.add(move.coordinate);
        gameState.cpuGuesses.add(move.coordinate);
      }
    });

    it('should handle nearly full board gracefully', () => {
      // Fill most of the board
      const boardSize = gameState.playerBoard.size;
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize - 1; j++) {
          gameState.cpuGuesses.add(`${i}${j}`);
        }
      }
      const move = huntStrategy.makeMove(gameState);
      expect(move.coordinate).toBeDefined();
      expect(gameState.cpuGuesses.has(move.coordinate)).toBe(false);
    });
  });

  describe('state management', () => {
    it('should reset previous moves', () => {
      huntStrategy.makeMove(gameState);
      expect(huntStrategy.previousMoves.size).toBe(1);
      huntStrategy.reset();
      expect(huntStrategy.previousMoves.size).toBe(0);
    });
  });
});

describe('TargetStrategy', () => {
  let targetStrategy;

  beforeEach(() => {
    targetStrategy = new TargetStrategy();
  });

  describe('target selection', () => {
    it('should fall back to hunt strategy when no targets', () => {
      const move = targetStrategy.makeMove(gameState);
      expect(move.mode).toBe('hunt');
      expect(move.strategy).toBe('HuntStrategy');
    });

    it('should add valid adjacent targets', () => {
      targetStrategy.addTargets(5, 5, gameState);
      expect(targetStrategy.targetQueue.length).toBe(4);
      
      const directions = targetStrategy.targetQueue.map(t => t.direction);
      expect(directions).toContain('north');
      expect(directions).toContain('south');
      expect(directions).toContain('east');
      expect(directions).toContain('west');
    });

    it('should handle board edges correctly', () => {
      // Test top-left corner
      targetStrategy.addTargets(0, 0, gameState);
      expect(targetStrategy.targetQueue.length).toBe(2);
      
      // Test bottom-right corner
      targetStrategy.reset();
      const boardSize = gameState.playerBoard.size;
      targetStrategy.addTargets(boardSize - 1, boardSize - 1, gameState);
      expect(targetStrategy.targetQueue.length).toBe(2);
    });

    it('should not add targets at invalid coordinates', () => {
      targetStrategy.addTargets(-1, -1, gameState);
      expect(targetStrategy.targetQueue.length).toBe(0);
      
      const boardSize = gameState.playerBoard.size;
      targetStrategy.addTargets(boardSize, boardSize, gameState);
      expect(targetStrategy.targetQueue.length).toBe(0);
    });
  });

  describe('target prioritization', () => {
    it('should prioritize targets in hit direction', () => {
      // Set up initial hits
      targetStrategy.updateStrategy('55', true, false);
      targetStrategy.updateStrategy('56', true, false);
      
      // Add new targets around latest hit
      targetStrategy.addTargets(5, 7, gameState);
      
      // Check that horizontal targets have higher priority
      const targets = targetStrategy.targetQueue;
      const horizontalTargets = targets.filter(t => t.coordinate[0] === '5');
      
      horizontalTargets.forEach(target => {
        expect(target.priority).toBe(3);
      });
    });

    it('should maintain hit history order', () => {
      const hits = ['55', '56', '57'];
      hits.forEach(coord => targetStrategy.updateStrategy(coord, true, false));
      
      expect(targetStrategy.hitHistory.map(h => h.coordinate)).toEqual(hits);
    });
  });

  describe('state management', () => {
    it('should reset state correctly', () => {
      targetStrategy.updateStrategy('55', true, false);
      targetStrategy.addTargets(5, 5, gameState);
      expect(targetStrategy.hitHistory.length).toBeGreaterThan(0);
      expect(targetStrategy.targetQueue.length).toBeGreaterThan(0);
      
      targetStrategy.reset();
      expect(targetStrategy.hitHistory.length).toBe(0);
      expect(targetStrategy.targetQueue.length).toBe(0);
    });

    it('should handle state serialization', () => {
      targetStrategy.updateStrategy('55', true, false);
      targetStrategy.addTargets(5, 5, gameState);
      
      const state = targetStrategy.getState();
      expect(state.hitHistory).toBeDefined();
      expect(state.targetQueue).toBeDefined();
      expect(Array.isArray(state.hitHistory)).toBe(true);
      expect(Array.isArray(state.targetQueue)).toBe(true);
    });
  });
});

describe('AIContext', () => {
  let aiContext;

  beforeEach(() => {
    aiContext = new AIContext();
  });

  describe('strategy switching', () => {
    it('should start with hunt strategy', () => {
      const move = aiContext.makeMove(gameState);
      expect(move.strategy).toBe('hunt');
    });

    it('should switch to target strategy on hit', () => {
      const move = aiContext.makeMove(gameState);
      aiContext.updateResult(move.coordinate, true, false);
      aiContext.switchToTarget(parseInt(move.coordinate[0]), parseInt(move.coordinate[1]), gameState);
      const nextMove = aiContext.makeMove(gameState);
      expect(nextMove.strategy).toBe('target');
    });

    it('should switch back to hunt strategy on ship sunk', () => {
      const move = aiContext.makeMove(gameState);
      aiContext.updateResult(move.coordinate, true, false);
      aiContext.switchToTarget(parseInt(move.coordinate[0]), parseInt(move.coordinate[1]), gameState);
      aiContext.updateResult('45', true, true);
      const nextMove = aiContext.makeMove(gameState);
      expect(nextMove.strategy).toBe('hunt');
    });
  });

  describe('move analysis', () => {
    it('should track last move details', () => {
      const move = aiContext.makeMove(gameState);
      const analysis = aiContext.getMoveAnalysis();
      
      expect(analysis.coordinate).toBe(move.coordinate);
      expect(analysis.wasHit).toBe(false);
      expect(analysis.strategy).toBe('hunt');
      expect(analysis.executedAt).toBeInstanceOf(Date);
    });

    it('should update hit status after move', () => {
      const move = aiContext.makeMove(gameState);
      aiContext.updateResult(move.coordinate, true, false);
      const analysis = aiContext.getMoveAnalysis();
      expect(analysis.wasHit).toBe(true);
    });
  });

  describe('state management', () => {
    it('should provide current state information', () => {
      const stats = aiContext.getStats();
      expect(stats.mode).toBe('hunt');
      expect(stats.targetState).toBeNull();
      
      // Switch to target mode
      const move = aiContext.makeMove(gameState);
      aiContext.updateResult(move.coordinate, true, false);
      aiContext.switchToTarget(parseInt(move.coordinate[0]), parseInt(move.coordinate[1]), gameState);
      
      const newStats = aiContext.getStats();
      expect(newStats.mode).toBe('target');
      expect(newStats.targetState).toBeDefined();
      expect(newStats.targetState.hitHistory).toBeDefined();
      expect(newStats.targetState.targetQueue).toBeDefined();
    });

    it('should reset state correctly', () => {
      const move = aiContext.makeMove(gameState);
      aiContext.updateResult(move.coordinate, true, false);
      aiContext.switchToTarget(parseInt(move.coordinate[0]), parseInt(move.coordinate[1]), gameState);
      
      aiContext.reset();
      
      const stats = aiContext.getStats();
      expect(stats.mode).toBe('hunt');
      expect(stats.targetState).toBeNull();
      expect(aiContext.lastMove).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle invalid coordinates in updateResult', () => {
      expect(() => aiContext.updateResult('invalid', true, false)).not.toThrow();
    });

    it('should handle missing gameState in makeMove', () => {
      const defaultGameState = {
        cpuGuesses: new Set(),
        playerBoard: {
          size: 10,
          ships: []
        }
      };
      const move = aiContext.makeMove(defaultGameState);
      expect(move).toBeDefined();
      expect(move.coordinate).toMatch(/^\d{2}$/);
    });

    it('should handle undefined results in updateResult', () => {
      expect(() => aiContext.updateResult('55', undefined, undefined)).not.toThrow();
    });
  });
}); 