const Game = require('../../src/game/Game');
const GameConfig = require('../../src/config/GameConfig');
const Ship = require('../../src/entities/Ship');
const GameBoard = require('../../src/entities/GameBoard');
const { AIContext } = require('../../src/ai/AIStrategy');
const { GameStatsObserver } = require('../../src/observers/GameObservers');

jest.mock('../../src/config/GameConfig');
jest.mock('../../src/entities/Ship');
jest.mock('../../src/entities/GameBoard');
jest.mock('../../src/ai/AIStrategy');
jest.mock('../../src/observers/GameObservers');

describe('Game', () => {
  let game;
  let mockConfig;
  let mockPlayerBoard;
  let mockCPUBoard;
  let mockAIContext;
  let mockStatsObserver;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      get: jest.fn(),
      getMessage: jest.fn()
    };
    GameConfig.mockImplementation(() => mockConfig);
    mockConfig.get.mockImplementation((key) => {
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
    });

    // Setup mock boards
    mockPlayerBoard = {
      placeShip: jest.fn(),
      display: jest.fn(),
      getShipAt: jest.fn(),
      markHit: jest.fn(),
      markMiss: jest.fn(),
      ships: []
    };
    mockCPUBoard = {
      placeShip: jest.fn(),
      display: jest.fn(),
      getShipAt: jest.fn(),
      markHit: jest.fn(),
      markMiss: jest.fn(),
      ships: []
    };
    GameBoard.mockImplementation(() => mockPlayerBoard);
    GameBoard.mockImplementationOnce(() => mockPlayerBoard)
             .mockImplementationOnce(() => mockCPUBoard);

    // Setup mock AI
    mockAIContext = {
      makeMove: jest.fn(),
      updateResult: jest.fn(),
      switchToHunt: jest.fn(),
      switchToTarget: jest.fn()
    };
    AIContext.mockImplementation(() => mockAIContext);

    // Setup mock observer
    mockStatsObserver = {
      update: jest.fn(),
      getStats: jest.fn()
    };
    GameStatsObserver.mockImplementation(() => mockStatsObserver);

    // Create game instance
    game = new Game();
  });

  describe('initialization', () => {
    test('should initialize game with correct configuration', () => {
      expect(game.playerBoard).toBeDefined();
      expect(game.cpuBoard).toBeDefined();
      expect(game.aiContext).toBeDefined();
      expect(GameConfig).toHaveBeenCalled();
      expect(GameBoard).toHaveBeenCalledTimes(2);
      expect(AIContext).toHaveBeenCalled();
    });

    test('should setup observers correctly', () => {
      game.setupObservers();
      expect(GameStatsObserver).toHaveBeenCalled();
      expect(game.observers.length).toBeGreaterThan(0);
    });

    test('should initialize game state correctly', async () => {
      const initSpy = jest.spyOn(game, 'initializeGame');
      await game.initialize();
      expect(initSpy).toHaveBeenCalled();
      expect(game.state).toBeDefined();
    });
  });

  describe('ship placement', () => {
    test('should place ships randomly on both boards', () => {
      game.placeShipsRandomly();
      expect(mockPlayerBoard.placeShip).toHaveBeenCalled();
      expect(mockCPUBoard.placeShip).toHaveBeenCalled();
    });
  });

  describe('game flow', () => {
    test('should process player move correctly', async () => {
      const input = '00';
      const mockShip = { hit: jest.fn(), isSunk: jest.fn() };
      mockCPUBoard.getShipAt.mockReturnValue(mockShip);
      
      await game.processPlayerMove(input);
      expect(mockCPUBoard.getShipAt).toHaveBeenCalled();
      expect(mockStatsObserver.update).toHaveBeenCalled();
    });

    test('should process CPU move correctly', async () => {
      const mockMove = { coordinate: '00', strategy: 'hunt' };
      mockAIContext.makeMove.mockReturnValue(mockMove);
      const mockShip = { hit: jest.fn(), isSunk: jest.fn() };
      mockPlayerBoard.getShipAt.mockReturnValue(mockShip);

      await game.processCPUMove();
      expect(mockAIContext.makeMove).toHaveBeenCalled();
      expect(mockPlayerBoard.getShipAt).toHaveBeenCalled();
      expect(mockStatsObserver.update).toHaveBeenCalled();
    });

    test('should check game over conditions', () => {
      const mockShip1 = { isSunk: jest.fn().mockReturnValue(true) };
      const mockShip2 = { isSunk: jest.fn().mockReturnValue(false) };
      game.playerBoard.ships = [mockShip1, mockShip1];
      game.cpuBoard.ships = [mockShip2, mockShip2];

      const result = game.checkGameOver();
      expect(result).toBe(true);
      expect(mockShip1.isSunk).toHaveBeenCalled();
      expect(mockShip2.isSunk).toHaveBeenCalled();
    });
  });

  describe('game state management', () => {
    test('should change game state correctly', () => {
      const mockState = { handle: jest.fn(), enter: jest.fn() };
      game.setState(mockState);
      expect(game.state).toBe(mockState);
    });

    test('should handle game over correctly', () => {
      const endGameSpy = jest.spyOn(game, 'endGame');
      game.endGame('player');
      expect(endGameSpy).toHaveBeenCalled();
      expect(mockStatsObserver.update).toHaveBeenCalled();
    });
  });

  describe('game persistence', () => {
    test('should save game state correctly', () => {
      const gameStatus = game.getGameStatus();
      expect(gameStatus).toHaveProperty('playerBoard');
      expect(gameStatus).toHaveProperty('cpuBoard');
      expect(gameStatus).toHaveProperty('gameState');
    });

    test('should reset game state correctly', () => {
      game.reset();
      expect(mockAIContext.switchToHunt).toHaveBeenCalled();
      expect(GameBoard).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle invalid input correctly', async () => {
      const invalidInput = 'invalid';
      await expect(game.processPlayerMove(invalidInput)).rejects.toThrow();
    });

    test('should handle duplicate moves correctly', async () => {
      const input = '00';
      game.playerGuesses.add(input);
      await expect(game.processPlayerMove(input)).rejects.toThrow();
    });
  });
}); 