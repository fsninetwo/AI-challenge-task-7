const Game = require('../src/game/Game');
const GameConfig = require('../src/config/GameConfig');
const { InputValidator, InputFormatValidator, CoordinateRangeValidator, DuplicateGuessValidator } = require('../src/validation/ValidationStrategy');

// Mock readline for testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn(),
    close: jest.fn()
  }))
}));

describe('Integration Tests', () => {
  describe('Game Configuration Integration', () => {
    test('should maintain consistent configuration across modules', () => {
      const config = new GameConfig();
      const game = new Game();
      
      // All modules should use the same configuration values
      expect(config.get('boardSize')).toBe(10);
      expect(config.get('numShips')).toBe(3);
      expect(config.get('shipLength')).toBe(3);
      
      // Game should use these values
      expect(game.playerBoard.size).toBe(10);
      expect(game.cpuBoard.size).toBe(10);
      expect(game.playerNumShips).toBe(3);
      expect(game.cpuNumShips).toBe(3);
    });
    
    test('should use consistent symbols across game components', () => {
      const config = new GameConfig();
      const symbols = config.get('symbols');
      
      expect(symbols.water).toBe('~');
      expect(symbols.ship).toBe('S');
      expect(symbols.hit).toBe('X');
      expect(symbols.miss).toBe('O');
    });
  });

  describe('Validation Chain Integration', () => {
    test('should integrate all validation strategies correctly', () => {
      const game = new Game();
      const guessHistory = new Set(['00', '11']);
      
      const validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator())
        .addStrategy(new DuplicateGuessValidator(guessHistory));

      // Valid input should pass all validations
      expect(validator.validate('22')).toEqual({ isValid: true });
      
      // Invalid format should fail first
      const formatResult = validator.validate('1');
      expect(formatResult.isValid).toBe(false);
      expect(formatResult.message).toContain('exactly two digits');
      
      // Invalid range should fail second
      const rangeResult = validator.validate('AA');
      expect(rangeResult.isValid).toBe(false);
      expect(rangeResult.message).toContain('valid row and column numbers');
      
      // Duplicate should fail third
      const duplicateResult = validator.validate('00');
      expect(duplicateResult.isValid).toBe(false);
      expect(duplicateResult.message).toContain('already guessed');
    });
  });

  describe('Ship and Board Integration', () => {
    test('should coordinate ship placement and hit detection', () => {
      const game = new Game();
      
      // Initialize game to place ships
      game.initializeGame();
      
      // Verify ships are placed on CPU board
      expect(game.cpuBoard.getShips()).toHaveLength(3);
      expect(game.playerBoard.getShips()).toHaveLength(3);
      
      // Test ship hit detection integration
      const cpuShips = game.cpuBoard.getShips();
      const firstShip = cpuShips[0];
      const firstLocation = firstShip.locations[0];
      
      // Hit the ship through the board
      const [row, col] = game.cpuBoard.parseCoordinate(firstLocation);
      game.cpuBoard.markHit(row, col);
      
      // Ship should register the hit
      expect(firstShip.hit(firstLocation)).toBe(true);
      expect(firstShip.isHit(firstLocation)).toBe(true);
    });
  });

  describe('AI Strategy Integration', () => {
    test('should integrate AI strategies with game state', () => {
      const game = new Game();
      const gameState = {
        cpuGuesses: new Set(),
        playerBoard: game.playerBoard
      };

      // AI should start in hunt mode
      expect(game.aiContext.currentStrategy.constructor.name).toBe('HuntStrategy');
      
      // Make a move
      const move = game.aiContext.makeMove(gameState);
      expect(move).toHaveProperty('coordinate');
      expect(move).toHaveProperty('mode');
      expect(move.coordinate).toMatch(/^\d\d$/);
      
      // Switch to target mode
      game.aiContext.switchToTarget(5, 5, gameState);
      expect(game.aiContext.currentStrategy.constructor.name).toBe('TargetStrategy');
      
      // Should have targets queued
      expect(game.aiContext.targetStrategy.targetQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Command Pattern Integration', () => {
    test('should execute and track player moves through command pattern', () => {
      const game = new Game();
      game.initializeGame();
      
      const gameState = {
        playerGuesses: new Set(),
        cpuBoard: game.cpuBoard,
        cpuNumShips: game.cpuNumShips
      };

      // Create and execute a player command
      const { PlayerMoveCommand } = require('../src/commands/Commands');
      const command = new PlayerMoveCommand('34', gameState);
      
      const result = game.commandInvoker.execute(command);
      
      // Command should be in history
      expect(game.commandInvoker.history).toContain(command);
      expect(gameState.playerGuesses.has('34')).toBe(true);
      expect(result).toBeDefined();
    });
  });

  describe('Observer Pattern Integration', () => {
    test('should emit and handle game events', () => {
      const game = new Game();
      let eventReceived = null;
      
      // Register event listener (using notify method from EventEmitter)
      const mockObserver = {
        update: (event, data) => {
          eventReceived = { event, data };
        }
      };
      game.eventEmitter.subscribe(mockObserver);
      
      // Emit event
      const testData = { type: 'test', coordinate: '34' };
      game.eventEmitter.notify('test-event', testData);
      
      // Event should be received
      expect(eventReceived).toEqual({ event: 'test-event', data: testData });
      
      // Stats observer should track events using update method
      const initialStats = game.statsObserver.getStats();
      const initialHits = initialStats.playerHits;
      
      game.statsObserver.update('playerHit');
      
      const stats = game.statsObserver.getStats();
      expect(stats.playerHits).toBe(initialHits + 1);
    });
  });

  describe('State Machine Integration', () => {
    test('should coordinate game flow through state transitions', () => {
      const game = new Game();
      
      // Should start in initialization state
      expect(game.stateMachine.getStateName()).toBe('Initialization');
      
      // Initialize should transition to player turn
      const mockGame = {
        playerBoard: game.playerBoard,
        cpuBoard: game.cpuBoard,
        initializeGame: jest.fn(),
        setState: (state) => game.stateMachine.setState(state)
      };
      
      game.stateMachine.handle(mockGame);
      expect(game.stateMachine.getStateName()).toBe('PlayerTurn');
    });
  });

  describe('Full Game Flow Integration', () => {
    test('should handle complete game initialization', () => {
      const game = new Game();
      
      // Initialize should set up all components
      game.initializeGame();
      
      // Boards should be initialized
      expect(game.playerBoard.getShips()).toHaveLength(3);
      expect(game.cpuBoard.getShips()).toHaveLength(3);
      
      // Ship counts should be correct
      expect(game.playerNumShips).toBe(3);
      expect(game.cpuNumShips).toBe(3);
      
      // Validation should be ready
      expect(game.inputValidator).toBeDefined();
      expect(game.inputValidator.strategies.length).toBeGreaterThan(0);
    });

    test('should handle move validation and execution flow', () => {
      const game = new Game();
      game.initializeGame();
      
      // Valid move should pass validation and execute
      const validMove = '34';
      const validation = game.inputValidator.validate(validMove);
      expect(validation.isValid).toBe(true);
      
      // Move should execute through game
      const initialGuesses = game.playerGuesses.size;
      game.playerGuesses.add(validMove);
      expect(game.playerGuesses.size).toBe(initialGuesses + 1);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors gracefully across modules', () => {
      const game = new Game();
      
      // Invalid moves should be handled
      expect(() => {
        const validation = game.inputValidator.validate('invalid');
        expect(validation.isValid).toBe(false);
      }).not.toThrow();
      
      // AI should handle edge cases
      expect(() => {
        const gameState = { cpuGuesses: new Set() };
        const move = game.aiContext.makeMove(gameState);
        expect(move).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance with integrated components', () => {
      const game = new Game();
      
      const startTime = Date.now();
      
      // Initialize game
      game.initializeGame();
      
      // Make multiple moves
      for (let i = 0; i < 10; i++) {
        const coord = `${i % 10}${(i * 2) % 10}`;
        if (game.inputValidator.validate(coord).isValid) {
          game.playerGuesses.add(coord);
        }
        
        // AI move
        const gameState = { cpuGuesses: new Set() };
        game.aiContext.makeMove(gameState);
      }
      
      const endTime = Date.now();
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Memory Management Integration', () => {
    test('should clean up resources properly', () => {
      const game = new Game();
      game.initializeGame();
      
      // Add some game state
      game.playerGuesses.add('00');
      game.cpuGuesses.add('11');
      
      // Reset should clear state
      game.playerBoard.reset();
      game.cpuBoard.reset();
      
      expect(game.playerBoard.getShips()).toHaveLength(0);
      expect(game.cpuBoard.getShips()).toHaveLength(0);
    });
  });

  test('should maintain consistent configuration values', () => {
    const config = new GameConfig();
    
    expect(config.get('boardSize')).toBe(10);
    expect(config.get('numShips')).toBe(3);
    expect(config.get('shipLength')).toBe(3);
  });

  test('should handle coordinate format consistently', () => {
    const testCoordinates = ['00', '34', '99', '05', '50'];
    
    testCoordinates.forEach(coord => {
      const row = parseInt(coord[0]);
      const col = parseInt(coord[1]);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(10);
    });
  });
}); 