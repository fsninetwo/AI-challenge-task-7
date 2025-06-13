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
  enter: jest.fn(),
  handle: jest.fn(),
  exit: jest.fn(),
  getName: jest.fn().mockReturnValue('TestState')
};

jest.mock('../src/states/GameStates', () => ({
  SetupState: jest.fn().mockImplementation(() => mockState),
  PlayerTurnState: jest.fn().mockImplementation(() => mockState),
  CPUTurnState: jest.fn().mockImplementation(() => mockState),
  GameOverState: jest.fn().mockImplementation(() => mockState)
}));

// Define mockShip before using it in jest.mock
const mockShip = { 
  locations: ['00', '01', '02'],
  hit: jest.fn(),
  isSunk: jest.fn().mockReturnValue(false)
};

// Mock ShipFactory as a class
class MockShipFactory {
  static createRandomShip() { return mockShip; }
}

jest.mock('../src/entities/ShipFactory', () => MockShipFactory);

const Game = require('../src/game/Game');

// Mock all dependencies with comprehensive mocks
jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => {
      const config = {
        boardSize: 10,
        numShips: 3,
        shipLength: 3,
        shipPatterns: [
          { length: 3, pattern: 'horizontal' },
          { length: 3, pattern: 'horizontal' },
          { length: 3, pattern: 'horizontal' }
        ]
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
  placeShip: jest.fn().mockReturnValue(true),
  display: jest.fn().mockReturnValue(['  0 1 2', '0 ~ ~ ~', '1 ~ ~ ~']),
  getStats: jest.fn().mockReturnValue({ ships: 3 }),
  parseCoordinate: jest.fn().mockReturnValue({ row: 0, col: 0 }),
  markHit: jest.fn(),
  markMiss: jest.fn(),
  getShipAt: jest.fn().mockReturnValue(mockShip),
  isValidCoordinate: jest.fn().mockReturnValue(true),
  grid: Array(10).fill(null).map(() => Array(10).fill('~'))
};

jest.mock('../src/entities/GameBoard', () => {
  return jest.fn().mockImplementation(() => mockGameBoard);
});

// Mock AI Strategies
const mockAIContext = {
  makeMove: jest.fn().mockReturnValue({ coordinate: '55', mode: 'hunt', strategy: 'HuntStrategy' }),
  updateResult: jest.fn()
};

jest.mock('../src/ai/AIStrategy', () => ({
  AIContext: jest.fn().mockImplementation(() => mockAIContext)
}));

// Mock Observers
const mockStatsObserver = {
  update: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    playerHits: 2,
    playerMisses: 1,
    cpuHits: 1,
    cpuMisses: 2,
    turnsPlayed: 3
  })
};

jest.mock('../src/observers/GameObservers', () => ({
  GameStatsObserver: jest.fn().mockImplementation(() => mockStatsObserver)
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
    test('should create game instance with all components', () => {
      expect(game).toBeInstanceOf(Game);
      expect(game.playerBoard).toBeDefined();
      expect(game.cpuBoard).toBeDefined();
      expect(game.aiContext).toBeDefined();
      expect(game.observers).toBeDefined();
      expect(game.playerGuesses).toBeDefined();
      expect(game.cpuGuesses).toBeDefined();
    });

    test('should initialize game successfully', async () => {
      await game.initialize();
      expect(game.playerNumShips).toBe(3);
      expect(game.cpuNumShips).toBe(3);
      expect(mockState.enter).toHaveBeenCalled();
    });

    test('should place ships randomly', async () => {
      await game.placeShipsRandomly();
      expect(mockGameBoard.placeShip).toHaveBeenCalledTimes(6); // 3 for player, 3 for CPU
    });
  });

  describe('Game Actions', () => {
    test('should process valid player move', async () => {
      const result = await game.processPlayerMove('22');
      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(mockGameBoard.markHit).toHaveBeenCalled();
    });

    test('should process CPU move', async () => {
      const result = await game.processCPUMove();
      expect(result.success).toBe(true);
      expect(mockAIContext.makeMove).toHaveBeenCalled();
      expect(mockAIContext.updateResult).toHaveBeenCalled();
    });

    test('should handle duplicate player move', async () => {
      game.playerGuesses.add('22');
      const result = await game.processPlayerMove('22');
      expect(result.success).toBe(false);
      expect(result.error).toBe('You already guessed that location!');
    });

    test('should handle ship sinking', async () => {
      mockShip.isSunk.mockReturnValueOnce(true);
      game.cpuNumShips = 3;
      const result = await game.processPlayerMove('22');
      expect(result.success).toBe(true);
      expect(result.sunk).toBe(true);
      expect(game.cpuNumShips).toBe(2);
    });
  });

  describe('Game State Management', () => {
    test('should change state correctly', () => {
      const newState = { enter: jest.fn(), handle: jest.fn(), exit: jest.fn() };
      game.setState(newState);
      expect(game.currentState).toBe(newState);
    });

    test('should handle game over condition', () => {
      game.endGame('player');
      expect(mockReadline.close).toHaveBeenCalled();
    });

    test('should quit game gracefully', () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      game.quit();
      expect(mockReadline.close).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
    });
  });

  describe('Game Status and Display', () => {
    test('should display boards correctly', () => {
      game.displayBoards();
      expect(mockGameBoard.display).toHaveBeenCalledTimes(2);
    });

    test('should return correct game status', () => {
      game.currentState = mockState;
      const status = game.getGameStatus();
      expect(status).toEqual({
        playerBoard: mockGameBoard,
        cpuBoard: mockGameBoard,
        currentState: 'TestState',
        playerNumShips: expect.any(Number),
        cpuNumShips: expect.any(Number),
        playerGuesses: expect.any(Array),
        cpuGuesses: expect.any(Array),
        totalTurns: expect.any(Number),
        playerMoves: expect.any(Number),
        cpuMoves: expect.any(Number)
      });
    });

    test('should handle player input correctly', async () => {
      mockReadline.question.mockImplementationOnce((_, callback) => callback('22'));
      const input = await game.requestPlayerInput();
      expect(input).toBe('22');
    });
  });
}); 