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

// Mock ShipFactory
const mockShip = { locations: ['00', '01', '02'] };
jest.mock('../src/entities/ShipFactory', () => {
  return {
    createRandomShip: jest.fn().mockReturnValue(mockShip)
  };
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

// Mock States
const mockState = {
  getName: jest.fn().mockReturnValue('TestState'),
  handle: jest.fn()
};

const mockStateMachine = {
  getCurrentState: jest.fn().mockReturnValue(mockState)
};

jest.mock('../src/states/GameStates', () => ({
  InitializationState: jest.fn().mockImplementation(() => mockState),
  GameStateMachine: jest.fn().mockImplementation(() => mockStateMachine),
  GameOverState: jest.fn().mockImplementation(() => mockState)
}));

// Mock Validation
const mockValidator = {
  addStrategy: jest.fn().mockReturnThis(),
  validate: jest.fn().mockReturnValue({ isValid: true })
};

jest.mock('../src/validation/ValidationStrategy', () => ({
  InputValidator: jest.fn().mockImplementation(() => mockValidator),
  InputFormatValidator: jest.fn(),
  CoordinateRangeValidator: jest.fn(),
  DuplicateGuessValidator: jest.fn()
}));

// Mock readline
const mockReadline = {
  question: jest.fn(),
  close: jest.fn()
};

jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue(mockReadline)
}));

describe('Game', () => {
  let game;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    game = new Game();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
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
  });

  describe('Ship Placement', () => {
    test('should place ships randomly', () => {
      const ShipFactory = require('../src/entities/ShipFactory');
      
      game.placeShipsRandomly();
      
      expect(ShipFactory.createRandomShip).toHaveBeenCalled();
      expect(mockGameBoard.placeShip).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('3 ships placed randomly for Player.');
    });

    test('should handle ship placement errors', () => {
      const ShipFactory = require('../src/entities/ShipFactory');
      ShipFactory.createRandomShip.mockImplementation(() => {
        throw new Error('Placement failed');
      });

      expect(() => game.placeShipsRandomly()).not.toThrow();
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
      mockValidator.validate.mockReturnValueOnce({ isValid: false, message: 'Invalid input' });
      
      const result = game.processPlayerMove('invalid');
      
      expect(result).toEqual({ continue: false, hit: false, error: 'Invalid input' });
    });

    test('should process CPU move', () => {
      const result = game.processCPUMove();
      
      expect(result).toEqual({ continue: true, hit: false });
      expect(mockEventEmitter.notify).toHaveBeenCalledWith('cpuMiss');
    });

    test('should process player turn with validation', () => {
      const checkGameOverSpy = jest.spyOn(game, 'checkGameOver').mockReturnValue(false);
      const processCPUTurnSpy = jest.spyOn(game, 'processCPUTurn').mockImplementation(() => {});
      
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

    test('should continue when no winner', () => {
      game.cpuNumShips = 2;
      game.playerNumShips = 2;
      
      const result = game.checkGameOver();
      
      expect(result).toBe(false);
    });

    test('should set game state', () => {
      const newState = { getName: () => 'NewState' };
      
      game.setState(newState);
      
      expect(game.currentState).toBe(newState);
    });
  });

  describe('Game End and Statistics', () => {
    test('should end game and display statistics', () => {
      game.endGame();
      
      expect(mockEventEmitter.notify).toHaveBeenCalledWith('gameEnd');
      expect(consoleSpy).toHaveBeenCalledWith('\nGame Statistics:');
      expect(mockReadline.close).toHaveBeenCalled();
    });

    test('should start game', () => {
      const initializeSpy = jest.spyOn(game, 'initialize');
      const handleSpy = jest.spyOn(game.currentState, 'handle');
      
      game.start();
      
      expect(initializeSpy).toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalled();
    });

    test('should return game status', () => {
      const status = game.getGameStatus();
      
      expect(status).toHaveProperty('playerShips', 3);
      expect(status).toHaveProperty('cpuShips', 3);
      expect(status).toHaveProperty('currentState', 'TestState');
    });

    test('should save game state', () => {
      const saveData = game.saveGame();
      
      expect(saveData).toHaveProperty('playerNumShips', 3);
      expect(saveData).toHaveProperty('cpuNumShips', 3);
      expect(saveData).toHaveProperty('timestamp');
    });

    test('should reset game', () => {
      game.playerGuesses.add('34');
      game.cpuGuesses.add('55');
      
      game.reset();
      
      expect(mockGameBoard.reset).toHaveBeenCalledTimes(2);
      expect(game.playerGuesses.size).toBe(0);
      expect(game.cpuGuesses.size).toBe(0);
    });

    test('should setup observers', () => {
      game.setupObservers();
      
      expect(mockEventEmitter.subscribe).toHaveBeenCalledWith(game.statsObserver);
    });
  });
}); 