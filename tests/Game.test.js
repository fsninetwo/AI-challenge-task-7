// Mock readline first since it's used in Game constructor
const mockReadline = {
  question: jest.fn(),
  close: jest.fn()
};

jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue(mockReadline)
}));

// Mock states before requiring Game
const mockState = {
  getName: jest.fn().mockReturnValue('TestState'),
  handle: jest.fn()
};
const mockStateMachine = {
  getCurrentState: jest.fn().mockReturnValue(mockState)
};
const mockPlayingState = jest.fn().mockImplementation(() => mockState);

jest.mock('../src/states/GameStates', () => ({
  InitializationState: jest.fn().mockImplementation(() => mockState),
  GameStateMachine: jest.fn().mockImplementation(() => mockStateMachine),
  GameOverState: jest.fn().mockImplementation(() => mockState),
  PlayingState: mockPlayingState
}));

// Define mockShip before using it in jest.mock
const mockShip = { locations: ['00', '01', '02'] };

// Mock ShipFactory as a class
class MockShipFactory {
  generateShips() { return [mockShip, mockShip, mockShip]; }
}
MockShipFactory.createRandomShip = jest.fn().mockReturnValue(mockShip);

jest.mock('../src/entities/ShipFactory', () => MockShipFactory);

const Game = require('../src/game/Game');

// Mock all dependencies with comprehensive mocks
jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => {
      const config = {
        boardSize: 10,
        numShips: 3,
        shipLength: 3
      };
      return config[key];
    }),
    getMessage: jest.fn((key, params = {}) => {
      const messages = {
        playerHit: 'PLAYER HIT!',
        playerMiss: 'PLAYER MISS.',
        shipSunk: 'You sunk an enemy battleship!',
        cpuHit: `CPU HIT at ${params.coordinate || 'XX'}!`,
        cpuMiss: `CPU MISS at ${params.coordinate || 'XX'}.`,
        invalidInput: 'Invalid input'
      };
      return messages[key] || 'Unknown message';
    })
  }));
});

// Mock GameBoard
const mockGameBoard = {
  reset: jest.fn(),
  placeShip: jest.fn(),
  display: jest.fn().mockReturnValue(['  0 1 2', '0 ~ ~ ~', '1 ~ ~ ~']),
  getStats: jest.fn().mockReturnValue({ ships: 3 })
};

jest.mock('../src/entities/GameBoard', () => {
  return jest.fn().mockImplementation(() => mockGameBoard);
});

// Mock AI Strategies
const mockAIContext = {
  makeMove: jest.fn().mockReturnValue({ coordinate: '55', mode: 'hunt' })
};

jest.mock('../src/ai/AIStrategies', () => ({
  AIContext: jest.fn().mockImplementation(() => mockAIContext)
}));

// Mock Commands
const mockCommandInvoker = { execute: jest.fn() };
const mockPlayerMoveCommand = { execute: jest.fn().mockReturnValue(true) };
const mockCPUMoveCommand = { execute: jest.fn().mockReturnValue(false) };

jest.mock('../src/commands/Commands', () => ({
  CommandInvoker: jest.fn().mockImplementation(() => mockCommandInvoker),
  PlayerMoveCommand: jest.fn().mockImplementation(() => mockPlayerMoveCommand),
  CPUMoveCommand: jest.fn().mockImplementation(() => mockCPUMoveCommand)
}));

// Mock Observers
const mockStatsObserver = {
  getStats: jest.fn().mockReturnValue({
    playerHits: 2, playerMisses: 1, cpuHits: 1, cpuMisses: 2, turnsPlayed: 3
  })
};

const mockEventEmitter = {
  subscribe: jest.fn(),
  notify: jest.fn()
};

jest.mock('../src/observers/GameObservers', () => ({
  GameStatsObserver: jest.fn().mockImplementation(() => mockStatsObserver),
  EventEmitter: jest.fn().mockImplementation(() => mockEventEmitter)
}));

// Mock Validation with validate methods
const mockValidator = {
  addStrategy: jest.fn().mockReturnThis(),
  validate: jest.fn().mockReturnValue({ isValid: true })
};

const mockStrategy = { validate: jest.fn().mockReturnValue({ isValid: true }) };

jest.mock('../src/validation/ValidationStrategy', () => ({
  InputValidator: jest.fn().mockImplementation(() => mockValidator),
  InputFormatValidator: jest.fn().mockImplementation(() => mockStrategy),
  CoordinateRangeValidator: jest.fn().mockImplementation(() => mockStrategy),
  DuplicateGuessValidator: jest.fn().mockImplementation(() => mockStrategy)
}));

describe('Game', () => {
  let game;
  let consoleSpy;
  let originalValidate;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    game = new Game();
    // Save original validate for later restoration
    originalValidate = mockValidator.validate;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Restore original validate
    mockValidator.validate = originalValidate;
  });

  describe('Constructor and Initialization', () => {
    test('should create game instance', () => {
      expect(game).toBeInstanceOf(Game);
      expect(game.playerBoard).toBeDefined();
      expect(game.cpuBoard).toBeDefined();
      expect(game.aiContext).toBeDefined();
    });

    test('should initialize ship counts', () => {
      expect(game.playerNumShips).toBe(3);
      expect(game.cpuNumShips).toBe(3);
    });

    test('should initialize game and place ships', () => {
      game.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('Boards created.');
      expect(consoleSpy).toHaveBeenCalledWith("\nLet's play Sea Battle!");
      expect(mockEventEmitter.notify).toHaveBeenCalledWith('gameStart');
    });

    test('should alias initializeGame to initialize', () => {
      const initializeSpy = jest.spyOn(game, 'initialize');
      game.initializeGame();
      expect(initializeSpy).toHaveBeenCalled();
    });

    test('should setup observers correctly', () => {
      expect(mockEventEmitter.subscribe).toHaveBeenCalledWith(mockStatsObserver);
    });
  });

  describe('Ship Placement', () => {
    test('should place ships randomly', () => {
      const ShipFactory = require('../src/entities/ShipFactory');
      game.placeShipsRandomly();
      expect(ShipFactory.createRandomShip).toHaveBeenCalled();
      expect(mockGameBoard.placeShip).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('3 ships placed randomly for Player.');
    });

    test('should handle ship placement errors and use fallback', () => {
      const ShipFactory = require('../src/entities/ShipFactory');
      ShipFactory.createRandomShip.mockImplementation(() => {
        throw new Error('Placement failed');
      });
      // Spy on the prototype method
      const generateShipsSpy = jest.spyOn(MockShipFactory.prototype, 'generateShips');
      game.placeShipsRandomly();
      expect(generateShipsSpy).toHaveBeenCalled();
      expect(mockGameBoard.placeShip).toHaveBeenCalled();
      generateShipsSpy.mockRestore();
    });
  });

  describe('Game Flow', () => {
    test('should display boards', () => {
      game.displayBoards();
      
      expect(mockGameBoard.display).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('\n   --- OPPONENT BOARD ---          --- YOUR BOARD ---');
    });

    test('should request player input', () => {
      const processPlayerTurnSpy = jest.spyOn(game, 'processPlayerTurn').mockImplementation(() => {});
      
      game.requestPlayerInput();
      
      expect(mockReadline.question).toHaveBeenCalled();
      
      // Simulate answer callback
      const callback = mockReadline.question.mock.calls[0][1];
      callback('34');
      
      expect(processPlayerTurnSpy).toHaveBeenCalledWith('34');
    });

    test('should process valid player move', () => {
      const result = game.processPlayerMove('34');
      expect(result).toEqual({ continue: true, hit: true });
      expect(mockEventEmitter.notify).toHaveBeenCalledWith('playerHit');
    });

    test('should handle invalid player input', () => {
      // Create a mock validator with validate returning invalid
      const mockValidatorInstance = {
        addStrategy: jest.fn().mockReturnThis(),
        validate: jest.fn().mockReturnValueOnce({ isValid: false, message: 'Invalid input' })
      };
      const mockValidatorFactory = () => mockValidatorInstance;
      const GameWithDI = require('../src/game/Game');
      const gameWithDI = new GameWithDI(mockValidatorFactory);
      const result = gameWithDI.processPlayerMove('invalid');
      expect(result).toEqual({ continue: false, hit: false, error: 'Invalid input' });
    });

    test('should handle null player input', () => {
      const result = game.processPlayerMove(null);
      expect(result).toEqual({ continue: false, hit: false, error: 'No input provided' });
    });

    test('should process CPU move', () => {
      const result = game.processCPUMove();
      
      expect(result).toEqual({ continue: true, hit: false });
      expect(mockEventEmitter.notify).toHaveBeenCalledWith('cpuMiss');
    });

    test('should process player turn with validation', () => {
      // Set up spies before calling the method
      const checkGameOverSpy = jest.spyOn(game, 'checkGameOver').mockReturnValue(false);
      const processCPUTurnSpy = jest.spyOn(game, 'processCPUTurn').mockImplementation(() => {});
      // Mock validator to return valid
      mockValidator.validate = jest.fn().mockReturnValue({ isValid: true });
      game.processPlayerTurn('34');
      expect(checkGameOverSpy).toHaveBeenCalled();
      expect(processCPUTurnSpy).toHaveBeenCalled();
    });
  });

  describe('Game State Management', () => {
    test('should detect player win', () => {
      game.cpuNumShips = 0;
      
      const result = game.checkGameOver();
      
      expect(result).toBe(true);
    });

    test('should detect CPU win', () => {
      game.playerNumShips = 0;
      
      const result = game.checkGameOver();
      
      expect(result).toBe(true);
    });

    test('should continue game when no winner', () => {
      game.playerNumShips = 2;
      game.cpuNumShips = 2;
      
      const result = game.checkGameOver();
      
      expect(result).toBe(false);
    });

    test('should set game state', () => {
      const newState = { getName: () => 'NewState', handle: () => {} };
      game.setState(newState);
      
      expect(game.currentState).toBe(newState);
    });
  });

  describe('Game Statistics and Status', () => {
    test('should end game and display statistics', () => {
      game.endGame();
      
      expect(consoleSpy).toHaveBeenCalledWith('\nGame Statistics:');
      expect(consoleSpy).toHaveBeenCalledWith('Player - Hits: 2, Misses: 1');
      expect(consoleSpy).toHaveBeenCalledWith('CPU - Hits: 1, Misses: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Total turns: 3');
      expect(mockReadline.close).toHaveBeenCalled();
    });

    test('should get game status', () => {
      const status = game.getGameStatus();
      
      expect(status).toEqual({
        playerShips: 3,
        cpuShips: 3,
        currentState: 'TestState',
        totalTurns: 3,
        playerMoves: 0,
        cpuMoves: 0
      });
    });

    test('should save game state', () => {
      const savedState = game.saveGame();
      
      expect(savedState).toEqual({
        playerBoard: { ships: 3 },
        cpuBoard: { ships: 3 },
        playerGuesses: [],
        cpuGuesses: [],
        playerNumShips: 3,
        cpuNumShips: 3,
        stats: {
          playerHits: 2,
          playerMisses: 1,
          cpuHits: 1,
          cpuMisses: 2,
          turnsPlayed: 3
        },
        currentState: 'TestState',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Game Reset', () => {
    test('should reset game state', () => {
      // Ensure PlayingState is available
      global.PlayingState = mockPlayingState;
      game.reset();
      expect(mockGameBoard.reset).toHaveBeenCalledTimes(2);
      expect(game.playerGuesses.size).toBe(0);
      expect(game.cpuGuesses.size).toBe(0);
      expect(game.playerNumShips).toBe(3);
      expect(game.cpuNumShips).toBe(3);
      expect(mockEventEmitter.subscribe).toHaveBeenCalled();
    });
  });

  describe('Game Start', () => {
    test('should start game', () => {
      const initializeSpy = jest.spyOn(game, 'initialize');
      const handleSpy = jest.spyOn(game.currentState, 'handle');
      
      game.start();
      
      expect(initializeSpy).toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalled();
    });
  });
}); 