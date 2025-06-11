/**
 * Extended Commands Tests - Additional coverage for Commands module
 * 
 * @module tests/ExtendedCommands
 */

const {
  Command,
  PlayerMoveCommand,
  CPUMoveCommand,
  InitializeGameCommand,
  DisplayBoardsCommand,
  CommandInvoker
} = require('../src/commands/Commands');

const Ship = require('../src/entities/Ship');
const GameBoard = require('../src/entities/GameBoard');

jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => {
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
    }),
    getMessage: (key, params = {}) => {
      const messages = {
        playerHit: 'PLAYER HIT!',
        playerMiss: 'PLAYER MISS.',
        shipSunk: 'You sunk an enemy battleship!',
        cpuHit: `CPU HIT at ${params.coordinate || 'XX'}!`,
        cpuMiss: `CPU MISS at ${params.coordinate || 'XX'}.`,
        cpuShipSunk: 'CPU sunk your battleship!'
      };
      return messages[key] || 'Unknown message';
    }
  }));
});

describe('Extended Commands', () => {
  let originalLog, originalError;

  beforeEach(() => {
    originalLog = console.log;
    originalError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('Command Base Class', () => {
    test('should throw error when execute is not implemented', () => {
      const command = new Command();
      expect(() => command.execute()).toThrow('Command must implement execute method');
    });

    test('should throw error when undo is not implemented', () => {
      const command = new Command();
      expect(() => command.undo()).toThrow('Command must implement undo method');
    });

    test('should return command info', () => {
      const command = new Command();
      command.executedAt = new Date();
      
      const info = command.getInfo();
      expect(info.type).toBe('Command');
      expect(info.executedAt).toBeInstanceOf(Date);
      expect(info.canUndo).toBe(true);
    });
  });

  describe('PlayerMoveCommand', () => {
    let gameState;
    let playerBoard;
    let cpuBoard;
    let ship;

    beforeEach(() => {
      playerBoard = new GameBoard();
      cpuBoard = new GameBoard();
      ship = new Ship(['55', '56', '57']);
      
      cpuBoard.placeShip(ship, false);
      
      gameState = {
        playerGuesses: new Set(),
        cpuBoard: cpuBoard,
        cpuNumShips: 1
      };
    });

    test('should execute hit on ship', () => {
      const command = new PlayerMoveCommand('55', gameState);
      const result = command.execute();
      
      expect(result).toBe(true);
      expect(command.wasHit).toBe(true);
      expect(gameState.playerGuesses.has('55')).toBe(true);
      expect(command.executedAt).toBeInstanceOf(Date);
    });

    test('should execute miss', () => {
      const command = new PlayerMoveCommand('00', gameState);
      const result = command.execute();
      
      expect(result).toBe(false);
      expect(command.wasHit).toBe(false);
      expect(gameState.playerGuesses.has('00')).toBe(true);
    });

    test('should handle ship sunk', () => {
      // Hit all ship positions
      const command1 = new PlayerMoveCommand('55', gameState);
      const command2 = new PlayerMoveCommand('56', gameState);
      const command3 = new PlayerMoveCommand('57', gameState);
      
      command1.execute();
      command2.execute();
      command3.execute();
      
      expect(gameState.cpuNumShips).toBe(0);
      expect(console.log).toHaveBeenCalledWith('You sunk an enemy battleship!');
    });

    test('should undo move successfully', () => {
      const command = new PlayerMoveCommand('55', gameState);
      command.execute();
      
      const undoResult = command.undo();
      
      expect(undoResult).toBe(true);
      expect(gameState.playerGuesses.has('55')).toBe(false);
    });

    test('should fail undo without previous state', () => {
      const command = new PlayerMoveCommand('55', gameState);
      
      const undoResult = command.undo();
      expect(undoResult).toBe(false);
    });

    test('should handle already hit location', () => {
      ship.hit('55');
      const command = new PlayerMoveCommand('55', gameState);
      
      const result = command.execute();
      expect(result).toBe(false);
    });
  });

  describe('CPUMoveCommand', () => {
    let gameState;
    let playerBoard;
    let aiContext;
    let ship;

    beforeEach(() => {
      playerBoard = new GameBoard();
      ship = new Ship(['33', '34', '35']);
      playerBoard.placeShip(ship, true);
      
      aiContext = {
        makeMove: jest.fn(),
        switchToHunt: jest.fn(),
        switchToTarget: jest.fn(),
        getStats: jest.fn().mockReturnValue({})
      };
      
      gameState = {
        cpuGuesses: new Set(),
        playerBoard: playerBoard,
        playerNumShips: 1
      };
    });

    test('should execute CPU hit', () => {
      aiContext.makeMove.mockReturnValue({
        coordinate: '33',
        mode: 'hunt',
        strategy: 'HuntStrategy'
      });
      
      const command = new CPUMoveCommand(aiContext, gameState);
      const result = command.execute();
      
      expect(result).toBe(true);
      expect(command.wasHit).toBe(true);
      expect(gameState.cpuGuesses.has('33')).toBe(true);
      expect(aiContext.switchToTarget).toHaveBeenCalled();
    });

    test('should execute CPU miss', () => {
      aiContext.makeMove.mockReturnValue({
        coordinate: '00',
        mode: 'hunt',
        strategy: 'HuntStrategy'
      });
      
      const command = new CPUMoveCommand(aiContext, gameState);
      const result = command.execute();
      
      expect(result).toBe(false);
      expect(command.wasHit).toBe(false);
      expect(console.log).toHaveBeenCalledWith('CPU MISS at 00.');
    });

    test('should handle ship sunk by CPU', () => {
      // Pre-hit most of the ship
      ship.hit('33');
      ship.hit('34');
      
      aiContext.makeMove.mockReturnValue({
        coordinate: '35',
        mode: 'target',
        strategy: 'TargetStrategy'
      });
      
      const command = new CPUMoveCommand(aiContext, gameState);
      command.execute();
      
      expect(gameState.playerNumShips).toBe(0);
      expect(aiContext.switchToHunt).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('CPU sunk your battleship!');
    });

    test('should get move analysis', () => {
      aiContext.makeMove.mockReturnValue({
        coordinate: '33',
        mode: 'hunt'
      });
      
      const command = new CPUMoveCommand(aiContext, gameState);
      command.execute();
      
      const analysis = command.getMoveAnalysis();
      expect(analysis.coordinate).toBe('33');
      expect(analysis.wasHit).toBe(true);
      expect(analysis.strategy).toBe('hunt');
      expect(analysis.executedAt).toBeInstanceOf(Date);
    });
  });

  describe('InitializeGameCommand', () => {
    let mockGame;

    beforeEach(() => {
      mockGame = {
        placeShipsRandomly: jest.fn(),
        cpuNumShips: 3,
        playerBoard: { reset: jest.fn() },
        cpuBoard: { reset: jest.fn() },
        playerGuesses: new Set(),
        cpuGuesses: new Set()
      };
    });

    test('should execute initialization successfully', () => {
      const command = new InitializeGameCommand(mockGame);
      const result = command.execute();
      
      expect(result).toBe(true);
      expect(command.initialized).toBe(true);
      expect(mockGame.placeShipsRandomly).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Boards created.');
    });

    test('should handle initialization error', () => {
      mockGame.placeShipsRandomly.mockImplementation(() => {
        throw new Error('Placement failed');
      });
      
      const command = new InitializeGameCommand(mockGame);
      const result = command.execute();
      
      expect(result).toBe(false);
      expect(command.initialized).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Failed to initialize game:', 'Placement failed');
    });

    test('should undo initialization', () => {
      const command = new InitializeGameCommand(mockGame);
      command.execute();
      
      const undoResult = command.undo();
      
      expect(undoResult).toBe(true);
      expect(command.initialized).toBe(false);
      expect(mockGame.playerBoard.reset).toHaveBeenCalled();
      expect(mockGame.cpuBoard.reset).toHaveBeenCalled();
    });

    test('should fail undo when not initialized', () => {
      const command = new InitializeGameCommand(mockGame);
      
      const undoResult = command.undo();
      expect(undoResult).toBe(false);
    });
  });

  describe('DisplayBoardsCommand', () => {
    let playerBoard;
    let cpuBoard;

    beforeEach(() => {
      playerBoard = new GameBoard();
      cpuBoard = new GameBoard();
    });

    test('should execute board display', () => {
      const command = new DisplayBoardsCommand(playerBoard, cpuBoard);
      const result = command.execute();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(command.executedAt).toBeInstanceOf(Date);
    });

    test('should undo successfully (no-op)', () => {
      const command = new DisplayBoardsCommand(playerBoard, cpuBoard);
      const result = command.undo();
      
      expect(result).toBe(true);
    });
  });

  describe('CommandInvoker', () => {
    let invoker;
    let mockCommand;

    beforeEach(() => {
      invoker = new CommandInvoker();
      mockCommand = {
        execute: jest.fn().mockReturnValue('result'),
        undo: jest.fn().mockReturnValue(true)
      };
    });

    test('should execute command and add to history', () => {
      const result = invoker.execute(mockCommand);
      
      expect(result).toBe('result');
      expect(mockCommand.execute).toHaveBeenCalled();
      expect(invoker.history.length).toBe(1);
      expect(invoker.currentIndex).toBe(0);
    });

    test('should undo last command', () => {
      invoker.execute(mockCommand);
      
      const undoResult = invoker.undo();
      
      expect(undoResult).toBe(true);
      expect(mockCommand.undo).toHaveBeenCalled();
      expect(invoker.currentIndex).toBe(-1);
    });

    test('should fail undo when no commands', () => {
      const undoResult = invoker.undo();
      expect(undoResult).toBe(false);
    });

    test('should redo command', () => {
      invoker.execute(mockCommand);
      invoker.undo();
      
      const redoResult = invoker.redo();
      
      expect(redoResult).toBe('result');
      expect(mockCommand.execute).toHaveBeenCalledTimes(2);
      expect(invoker.currentIndex).toBe(0);
    });

    test('should fail redo when no commands to redo', () => {
      const redoResult = invoker.redo();
      expect(redoResult).toBe(false);
    });

    test('should get command history', () => {
      invoker.execute(mockCommand);
      
      const history = invoker.getHistory();
      expect(history.length).toBe(1);
      expect(history[0]).toBe(mockCommand);
    });

    test('should clear history', () => {
      invoker.execute(mockCommand);
      
      invoker.clearHistory();
      
      expect(invoker.history.length).toBe(0);
      expect(invoker.currentIndex).toBe(-1);
    });

    test('should handle undo failure', () => {
      mockCommand.undo.mockReturnValue(false);
      invoker.execute(mockCommand);
      
      const undoResult = invoker.undo();
      
      expect(undoResult).toBe(false);
      expect(invoker.currentIndex).toBe(0); // Should not change
    });
  });

  describe('CommandInvoker Extended', () => {
    test('should handle multiple commands', () => {
      const invoker = new CommandInvoker();
      const mockCommand1 = {
        execute: jest.fn().mockReturnValue('result1'),
        undo: jest.fn().mockReturnValue(true)
      };
      const mockCommand2 = {
        execute: jest.fn().mockReturnValue('result2'),
        undo: jest.fn().mockReturnValue(true)
      };
      
      invoker.execute(mockCommand1);
      invoker.execute(mockCommand2);
      
      expect(invoker.history.length).toBe(2);
      expect(invoker.currentIndex).toBe(1);
    });

    test('should redo after undo', () => {
      const invoker = new CommandInvoker();
      const mockCommand = {
        execute: jest.fn().mockReturnValue('result'),
        undo: jest.fn().mockReturnValue(true)
      };
      
      invoker.execute(mockCommand);
      invoker.undo();
      const redoResult = invoker.redo();
      
      expect(redoResult).toBe('result');
      expect(mockCommand.execute).toHaveBeenCalledTimes(2);
    });

    test('should clear history', () => {
      const invoker = new CommandInvoker();
      const mockCommand = {
        execute: jest.fn(),
        undo: jest.fn()
      };
      
      invoker.execute(mockCommand);
      invoker.clearHistory();
      
      expect(invoker.history.length).toBe(0);
      expect(invoker.currentIndex).toBe(-1);
    });
  });
}); 