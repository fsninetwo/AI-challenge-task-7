/**
 * Integration Tests - End-to-end testing of game functionality
 * 
 * @module tests/Integration
 */

// Mock readline before requiring any modules
jest.mock('readline', () => {
  const mockReadline = {
    question: jest.fn(),
    close: jest.fn()
  };
  return {
    createInterface: jest.fn().mockReturnValue(mockReadline)
  };
});

const Game = require('../src/game/Game');
const GameBoard = require('../src/entities/GameBoard');
const Ship = require('../src/entities/Ship');
const { AIContext } = require('../src/ai/AIStrategy');
const { GameStatsObserver } = require('../src/observers/GameObservers');
const GameConfig = require('../src/config/GameConfig');

describe('Integration Tests', () => {
  let game;
  let consoleSpy;
  let mockReadline;
  let config;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    config = new GameConfig();
    game = new Game();
    mockReadline = require('readline').createInterface();
    await game.initialize(); // Initialize game in beforeEach
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('should initialize game with all components', () => {
    expect(game.playerBoard).toBeInstanceOf(GameBoard);
    expect(game.cpuBoard).toBeInstanceOf(GameBoard);
    expect(game.aiContext).toBeInstanceOf(AIContext);
    expect(game.observers[0]).toBeInstanceOf(GameStatsObserver);
    expect(game.playerNumShips).toBe(config.get('numShips'));
    expect(game.cpuNumShips).toBe(config.get('numShips'));
  });

  test('should play a complete game turn', async () => {
    // Player's turn
    mockReadline.question.mockImplementationOnce((_, callback) => callback('22'));
    const playerMove = await game.processPlayerMove('22');
    expect(playerMove.success).toBe(true);
    
    // CPU's turn
    const cpuMove = await game.processCPUMove();
    expect(cpuMove.success).toBe(true);
    expect(cpuMove.coordinate).toMatch(/^[0-9][0-9]$/);
  });

  test('should handle ship sinking', async () => {
    // Reset game state
    game.cpuBoard = new GameBoard();
    game.cpuNumShips = 1;
    
    // Place a ship and sink it
    const ship = new Ship(['22', '23', '24']);
    game.cpuBoard.placeShip(ship);
    
    // Process moves
    await game.processPlayerMove('22');
    await game.processPlayerMove('23');
    await game.processPlayerMove('24');
    
    expect(ship.isSunk()).toBe(true);
    expect(game.cpuNumShips).toBe(0);
  });

  test('should track game statistics', async () => {
    await game.processPlayerMove('22');
    await game.processCPUMove();
    await game.processPlayerMove('33');
    await game.processCPUMove();
    
    const stats = game.getGameStatus();
    expect(stats.playerMoves).toBe(2);
    expect(stats.cpuMoves).toBe(2);
    expect(stats.totalTurns).toBeGreaterThan(0);
  });

  test('should handle invalid moves gracefully', async () => {
    // Reset game state
    game.playerGuesses = new Set();
    game.cpuBoard = new GameBoard();
    
    // Try duplicate move
    await game.processPlayerMove('22');
    const duplicateMove = await game.processPlayerMove('22');
    expect(duplicateMove.success).toBe(false);
    expect(duplicateMove.error).toBe('You already guessed that location!');
    
    // Try invalid coordinate
    const invalidMove = await game.processPlayerMove('XX');
    expect(invalidMove.success).toBe(false);
  });

  test('should end game when all ships sunk', async () => {
    // Reset game state
    game.cpuBoard = new GameBoard();
    game.cpuNumShips = 1;
    
    // Place a ship and sink it
    const ship = new Ship(['22', '23', '24']);
    game.cpuBoard.placeShip(ship);
    
    // Process moves
    await game.processPlayerMove('22');
    await game.processPlayerMove('23');
    await game.processPlayerMove('24');
    
    expect(game.checkGameOver()).toBe(true);
  });

  test('should display boards correctly', async () => {
    // Make some moves
    await game.processPlayerMove('22');
    await game.processCPUMove();
    
    // Capture board display
    game.displayBoards();
    
    expect(consoleSpy).toHaveBeenCalledWith('\nPlayer Board:');
    expect(consoleSpy).toHaveBeenCalledWith('\nCPU Board:');
  });

  test('should handle game reset', async () => {
    await game.processPlayerMove('22');
    await game.processCPUMove();
    
    game.reset();
    
    expect(game.playerNumShips).toBe(0);
    expect(game.cpuNumShips).toBe(0);
    expect(game.playerGuesses.size).toBe(0);
    expect(game.cpuGuesses.size).toBe(0);
  });

  test('should notify observers of game events', async () => {
    const observer = game.observers[0];
    const updateSpy = jest.spyOn(observer, 'update');
    
    await game.processPlayerMove('22');
    
    expect(updateSpy).toHaveBeenCalled();
  });

  test('should handle game quit gracefully', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    game.quit();
    
    expect(mockReadline.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    
    exitSpy.mockRestore();
  });

  describe('Game Configuration Integration', () => {
    test('should maintain consistent configuration across modules', () => {
      // Reset game state
      game.playerBoard = new GameBoard();
      game.cpuBoard = new GameBoard();
      game.playerNumShips = config.get('numShips');
      game.cpuNumShips = config.get('numShips');
      
      // Board size should be consistent
      expect(game.playerBoard.size).toBe(config.get('boardSize'));
      expect(game.cpuBoard.size).toBe(config.get('boardSize'));
      
      // Ship counts should be consistent
      expect(game.playerNumShips).toBe(config.get('numShips'));
      expect(game.cpuNumShips).toBe(config.get('numShips'));
    });

    test('should use consistent symbols across game components', () => {
      const config = new GameConfig();
      const symbols = config.get('symbols');
      
      // Reset board state
      game.playerBoard = new GameBoard();
      
      // Check board symbols
      expect(game.playerBoard.grid[0][0]).toBe(symbols.water);
      
      // Mark a hit and check symbol
      game.playerBoard.markHit(0, 0);
      expect(game.playerBoard.grid[0][0]).toBe(symbols.hit);
      
      // Mark a miss and check symbol
      game.playerBoard.markMiss(1, 1);
      expect(game.playerBoard.grid[1][1]).toBe(symbols.miss);
    });
  });

  describe('AI Strategy Integration', () => {
    test('should integrate AI strategy with game moves', async () => {
      const aiContext = game.aiContext;
      const moveStats = aiContext.getStats();
      
      expect(moveStats.totalMoves).toBe(0);
      
      // Make a move and check AI response
      await game.processCPUMove();
      
      const updatedStats = aiContext.getStats();
      expect(updatedStats.totalMoves).toBe(1);
    });

    test('should adapt AI strategy based on hits', async () => {
      const aiContext = game.aiContext;
      
      // Reset board state
      game.playerBoard = new GameBoard();
      
      // Place a ship and let AI hit it
      const ship = new Ship(['55']);
      game.playerBoard.placeShip(ship);
      
      // Force AI to hit the ship
      game.playerBoard.markHit(5, 5);
      aiContext.updateResult(true, '55');
      
      // AI should switch to target mode
      const nextMove = aiContext.makeMove(game.cpuGuesses, game.playerBoard);
      expect(nextMove.mode).toBe('target');
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance with integrated components', async () => {
      const startTime = Date.now();
      
      // Reset game state
      game.playerGuesses = new Set();
      game.cpuGuesses = new Set();
      game.playerBoard = new GameBoard();
      game.cpuBoard = new GameBoard();
      
      // Simulate multiple game turns
      for (let i = 0; i < 5; i++) {
        await game.processPlayerMove(`${i}${i}`);
        await game.processCPUMove();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Game turns should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second max
    }, 5000); // 5 second timeout
  });
}); 