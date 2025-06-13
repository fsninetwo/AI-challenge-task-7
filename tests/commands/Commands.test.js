const {
  Command,
  PlayerMoveCommand,
  CPUMoveCommand,
  InitGameCommand,
  DisplayBoardsCommand,
  AttackCommand,
  PlaceShipCommand,
  QuitCommand,
  CommandInvoker
} = require('../../src/commands/Commands');

const GameConfig = require('../../src/config/GameConfig');
const Ship = require('../../src/entities/Ship');
const GameBoard = require('../../src/entities/GameBoard');

// Mock AI Context
const mockAIContext = {
  makeMove: jest.fn().mockReturnValue({ coordinate: '00', mode: 'hunt' }),
  switchToHunt: jest.fn(),
  switchToTarget: jest.fn(),
  getStats: jest.fn().mockReturnValue({ mode: 'hunt' })
};

describe('Commands', () => {
  let game;
  let consoleSpy;
  let aiContext;

  beforeEach(() => {
    game = {
      playerBoard: new GameBoard(),
      cpuBoard: new GameBoard(),
      playerNumShips: 3,
      cpuNumShips: 3,
      currentState: null,
      notifications: [],
      displayBoardsCalled: false,
      requestPlayerInputCalled: false,
      endGameCalled: false,
      quitCalled: false,
      notify: function(event, data) {
        this.notifications.push({ event, data });
      }
    };

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    aiContext = { ...mockAIContext };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Base Command', () => {
    it('should require execute implementation', () => {
      const command = new Command();
      expect(() => command.execute()).toThrow('execute() must be implemented');
    });

    it('should require undo implementation', () => {
      const command = new Command();
      expect(() => command.undo()).toThrow('undo() must be implemented');
    });

    it('should provide command info', () => {
      const command = new Command();
      const info = command.getInfo();
      expect(info.type).toBe('Command');
      expect(info.canUndo).toBe(true);
    });
  });

  describe('PlayerMoveCommand', () => {
    let gameState;
    let command;

    beforeEach(() => {
      gameState = {
        cpuNumShips: 3,
        playerGuesses: new Set(),
        cpuBoard: new GameBoard()
      };
      const ship = new Ship(['00', '01', '02']);
      gameState.cpuBoard.placeShip(ship, true);
      command = new PlayerMoveCommand('00', gameState);
    });

    it('should execute hit successfully', () => {
      const result = command.execute();
      expect(result).toBe(true);
      expect(gameState.playerGuesses.has('00')).toBe(true);
      expect(gameState.cpuBoard.hits.has('00')).toBe(true);
    });

    it('should execute miss successfully', () => {
      command = new PlayerMoveCommand('55', gameState);
      const result = command.execute();
      expect(result).toBe(false);
      expect(gameState.playerGuesses.has('55')).toBe(true);
      expect(gameState.cpuBoard.misses.has('55')).toBe(true);
    });

    it('should handle ship sinking', () => {
      command.execute();
      command = new PlayerMoveCommand('01', gameState);
      command.execute();
      command = new PlayerMoveCommand('02', gameState);
      const result = command.execute();
      expect(result).toBe(true);
      expect(gameState.cpuNumShips).toBe(2);
    });

    it('should undo move successfully', () => {
      command.execute();
      const undoResult = command.undo();
      expect(undoResult).toBe(true);
      expect(gameState.cpuNumShips).toBe(3);
      expect(gameState.playerGuesses.has('00')).toBe(false);
    });
  });

  describe('CPUMoveCommand', () => {
    let gameState;
    let command;

    beforeEach(() => {
      gameState = {
        playerNumShips: 3,
        cpuGuesses: new Set(),
        playerBoard: new GameBoard()
      };
      const ship = new Ship(['00', '01', '02']);
      gameState.playerBoard.placeShip(ship, true);
      command = new CPUMoveCommand(aiContext, gameState);
    });

    it('should execute hit successfully', () => {
      aiContext.makeMove.mockReturnValue({ coordinate: '00', mode: 'hunt' });
      const result = command.execute();
      expect(result).toBe(true);
      expect(gameState.cpuGuesses.has('00')).toBe(true);
      expect(gameState.playerBoard.hits.has('00')).toBe(true);
      expect(aiContext.switchToTarget).toHaveBeenCalled();
    });

    it('should execute miss successfully', () => {
      aiContext.makeMove.mockReturnValue({ coordinate: '55', mode: 'hunt' });
      const result = command.execute();
      expect(result).toBe(false);
      expect(gameState.cpuGuesses.has('55')).toBe(true);
      expect(gameState.playerBoard.misses.has('55')).toBe(true);
    });

    it('should handle ship sinking', () => {
      // Mock AI to hit all ship positions
      let hitCount = 0;
      aiContext.makeMove.mockImplementation(() => {
        const moves = ['00', '01', '02'];
        return { coordinate: moves[hitCount++], mode: 'hunt' };
      });

      // Execute hits on all ship positions
      command.execute();
      command.execute();
      command.execute();
      
      expect(gameState.playerNumShips).toBe(2);
      expect(aiContext.switchToHunt).toHaveBeenCalled();
    });

    it('should provide move analysis', () => {
      aiContext.makeMove.mockReturnValue({ coordinate: '00', mode: 'hunt' });
      command.execute();
      
      const analysis = command.getMoveAnalysis();
      expect(analysis).toEqual({
        coordinate: '00',
        wasHit: true,
        strategy: 'hunt',
        aiState: { mode: 'hunt' },
        executedAt: expect.any(Date)
      });
    });
  });

  describe('InitializeGameCommand', () => {
    let game;
    let command;

    beforeEach(() => {
      game = {
        playerBoard: new GameBoard(),
        cpuBoard: new GameBoard(),
        playerNumShips: 0,
        cpuNumShips: 0,
        placeShipsRandomly: jest.fn(),
        notify: jest.fn()
      };
      command = new InitializeGameCommand(game);
    });

    it('should initialize game state', () => {
      const result = command.execute();
      expect(result.success).toBe(true);
      expect(game.placeShipsRandomly).toHaveBeenCalled();
      expect(game.notify).toHaveBeenCalledWith('gameInitialized');
    });

    it('should handle initialization errors', () => {
      game.placeShipsRandomly = () => {
        throw new Error('Init failed');
      };
      const result = command.execute();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Init failed');
    });

    it('should undo initialization', () => {
      command.execute();
      const undoResult = command.undo();
      expect(undoResult).toBe(true);
      expect(game.playerBoard.ships).toHaveLength(0);
      expect(game.cpuBoard.ships).toHaveLength(0);
    });
  });

  describe('DisplayBoardsCommand', () => {
    let playerBoard;
    let cpuBoard;
    let command;

    beforeEach(() => {
      playerBoard = new GameBoard();
      cpuBoard = new GameBoard();
      const playerShip = new Ship(['00', '01', '02']);
      const cpuShip = new Ship(['00', '01', '02']);
      playerBoard.placeShip(playerShip, true);
      cpuBoard.placeShip(cpuShip, true);
      command = new DisplayBoardsCommand(playerBoard, cpuBoard);
    });

    it('should display boards', () => {
      command.execute();
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;
      expect(calls.some(call => call[0].includes('OPPONENT BOARD'))).toBe(true);
      expect(calls.some(call => call[0].includes('YOUR BOARD'))).toBe(true);
    });

    it('should handle display errors', () => {
      playerBoard.display = () => {
        throw new Error('Display failed');
      };
      expect(() => command.execute()).toThrow('Display failed');
    });
  });

  describe('AttackCommand', () => {
    let board;
    let command;

    beforeEach(() => {
      board = new GameBoard();
      const ship = new Ship(['00', '01', '02']);
      board.placeShip(ship, true);
      command = new AttackCommand(board, '00');
    });

    it('should execute attack successfully', () => {
      const result = command.execute();
      expect(result.hit).toBe(true);
      expect(board.hits.has('00')).toBe(true);
    });

    it('should handle misses', () => {
      command = new AttackCommand(board, '55');
      const result = command.execute();
      expect(result.hit).toBe(false);
      expect(board.misses.has('55')).toBe(true);
    });

    it('should undo attack', () => {
      command.execute();
      const undoResult = command.undo();
      expect(undoResult).toBe(true);
      expect(board.hits.has('00')).toBe(false);
    });
  });

  describe('PlaceShipCommand', () => {
    let board;
    let ship;
    let command;

    beforeEach(() => {
      board = new GameBoard();
      ship = new Ship(['00', '01', '02']);
      command = new PlaceShipCommand(board, ship);
    });

    it('should place ship successfully', () => {
      const result = command.execute();
      expect(result.success).toBe(true);
      expect(board.ships).toContain(ship);
    });

    it('should handle placement errors', () => {
      board.placeShip(new Ship(['00', '01', '02']), true);
      const result = command.execute();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should undo ship placement', () => {
      command.execute();
      const undoResult = command.undo();
      expect(undoResult).toBe(true);
      expect(board.ships).not.toContain(ship);
    });
  });

  describe('QuitCommand', () => {
    let game;
    let command;

    beforeEach(() => {
      game = {
        notify: jest.fn(),
        cleanup: jest.fn()
      };
      command = new QuitCommand(game);
    });

    it('should execute quit successfully', () => {
      const result = command.execute();
      expect(result).toBe(true);
      expect(game.notify).toHaveBeenCalledWith('gameQuit');
      expect(game.cleanup).toHaveBeenCalled();
    });

    it('should handle quit errors', () => {
      game.cleanup = () => {
        throw new Error('Cleanup failed');
      };
      const result = command.execute();
      expect(result).toBe(false);
    });
  });

  describe('CommandInvoker', () => {
    let invoker;
    let command;

    beforeEach(() => {
      invoker = new CommandInvoker();
      command = {
        execute: jest.fn().mockReturnValue(true),
        undo: jest.fn().mockReturnValue(true)
      };
    });

    it('should execute commands', () => {
      const result = invoker.execute(command);
      expect(result).toBe(true);
      expect(command.execute).toHaveBeenCalled();
    });

    it('should maintain command history', () => {
      invoker.execute(command);
      invoker.execute(command);
      expect(invoker.history).toHaveLength(2);
    });

    it('should undo last command', () => {
      invoker.execute(command);
      const undoResult = invoker.undo();
      expect(undoResult).toBe(true);
      expect(command.undo).toHaveBeenCalled();
    });

    it('should handle undo with empty history', () => {
      const undoResult = invoker.undo();
      expect(undoResult).toBe(false);
    });

    it('should clear command history', () => {
      invoker.execute(command);
      invoker.execute(command);
      invoker.clearHistory();
      expect(invoker.history).toHaveLength(0);
    });
  });
}); 