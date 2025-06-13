const GameConfig = require('../../src/config/GameConfig');
const Ship = require('../../src/entities/Ship');
const GameBoard = require('../../src/entities/GameBoard');

// Mock game class for testing
class MockGame {
  constructor() {
    this.playerBoard = new GameBoard();
    this.cpuBoard = new GameBoard();
    this.playerNumShips = 3;
    this.cpuNumShips = 3;
    this.currentState = null;
    this.notifications = [];
    this.displayBoardsCalled = false;
    this.requestPlayerInputCalled = false;
    this.endGameCalled = false;
    this.quitCalled = false;
    this.placeShipsRandomlyCalled = false;
  }

  setState(state) {
    this.currentState = state;
    if (state && state.enter) {
      state.enter();
    }
  }

  notify(event, data) {
    this.notifications.push({ event, data });
  }

  displayBoards() {
    this.displayBoardsCalled = true;
  }

  requestPlayerInput() {
    this.requestPlayerInputCalled = true;
  }

  endGame() {
    this.endGameCalled = true;
  }

  quit() {
    this.quitCalled = true;
  }

  placeShipsRandomly() {
    this.placeShipsRandomlyCalled = true;
    // Place some ships for testing
    const playerShip = new Ship(['00', '01', '02']);
    const cpuShip = new Ship(['00', '01', '02']);
    this.playerBoard.placeShip(playerShip, true);
    this.cpuBoard.placeShip(cpuShip, true);
  }

  initializeGame() {
    this.placeShipsRandomly();
    return { success: true };
  }

  processPlayerMove(input) {
    if (!input) {
      return { success: false, error: 'No input provided' };
    }
    return { success: true, hit: true };
  }

  processCPUMove() {
    return { success: true, hit: true };
  }

  reset() {
    this.playerBoard.reset();
    this.cpuBoard.reset();
    this.notifications = [];
    this.displayBoardsCalled = false;
    this.requestPlayerInputCalled = false;
    this.endGameCalled = false;
    this.quitCalled = false;
    this.placeShipsRandomlyCalled = false;
  }
}

// Import all game states
const {
  GameState,
  PlayingState,
  GameOverState,
  InitializationState,
  PlayerTurnState,
  CPUTurnState,
  PausedState,
  ErrorState,
  GameStateMachine,
  SetupState,
  PlayState
} = require('../../src/states/GameStates');

describe('Game States', () => {
  let game;

  beforeEach(() => {
    game = {
      playerBoard: { reset: jest.fn() },
      cpuBoard: { reset: jest.fn() },
      initializeGame: jest.fn(),
      processPlayerMove: jest.fn(),
      processCPUMove: jest.fn(),
      displayBoards: jest.fn(),
      requestPlayerInput: jest.fn(),
      endGame: jest.fn(),
      setState: jest.fn(),
      quit: jest.fn(),
      notify: jest.fn(),
      notifications: [],
      playerNumShips: 3,
      cpuNumShips: 3
    };
  });

  describe('Base GameState', () => {
    it('should require game object', () => {
      expect(() => new GameState()).toThrow('Game object is required');
    });

    it('should return state name', () => {
      const state = new GameState(game);
      expect(state.getName()).toBe('GameState');
    });

    it('should have default empty methods', () => {
      const state = new GameState(game);
      expect(() => state.handle()).toThrow('GameState must implement handle method');
      expect(() => state.enter()).not.toThrow();
      expect(() => state.exit()).not.toThrow();
      expect(() => state.handleInput()).not.toThrow();
    });
  });

  describe('PlayingState', () => {
    let playingState;

    beforeEach(() => {
      playingState = new PlayingState(game);
    });

    it('should handle basic gameplay', () => {
      const result = playingState.handle();
      expect(result.continue).toBe(true);
      expect(game.displayBoards).toHaveBeenCalled();
      expect(game.requestPlayerInput).toHaveBeenCalled();
    });

    it('should check game over conditions', () => {
      game.cpuNumShips = 0;
      const nextState = playingState.checkTransition();
      expect(nextState).toBeInstanceOf(GameOverState);
      expect(nextState.winner).toBe('player');
    });
  });

  describe('GameOverState', () => {
    let gameOverState;

    beforeEach(() => {
      gameOverState = new GameOverState(game, 'player');
    });

    it('should handle game over', () => {
      const result = gameOverState.handle();
      expect(result.continue).toBe(false);
      expect(result.winner).toBe('player');
      expect(game.displayBoards).toHaveBeenCalled();
      expect(game.endGame).toHaveBeenCalled();
    });

    it('should provide game over info', () => {
      const info = gameOverState.getGameOverInfo();
      expect(info.winner).toBe('player');
      expect(info.endTime).toBeInstanceOf(Date);
      expect(info.state).toBe('GameOver');
    });

    it('should notify on enter', () => {
      gameOverState.enter();
      expect(game.notify).toHaveBeenCalledWith('gameOver', { winner: 'player' });
    });

    it('should handle restart command', () => {
      gameOverState.handleInput('restart');
      expect(game.setState).toHaveBeenCalled();
    });
  });

  describe('InitializationState', () => {
    let initState;

    beforeEach(() => {
      initState = new InitializationState(game);
    });

    it('should initialize game', () => {
      const result = initState.handle();
      expect(result.continue).toBe(true);
      expect(game.playerBoard.reset).toHaveBeenCalled();
      expect(game.cpuBoard.reset).toHaveBeenCalled();
      expect(game.initializeGame).toHaveBeenCalled();
    });

    it('should handle initialization errors', () => {
      game.initializeGame.mockImplementation(() => {
        throw new Error('Init failed');
      });
      const result = initState.handle();
      expect(result.continue).toBe(false);
      expect(result.error).toBe('Init failed');
    });
  });

  describe('PlayerTurnState', () => {
    let playerTurnState;

    beforeEach(() => {
      playerTurnState = new PlayerTurnState(game);
    });

    it('should handle valid moves', () => {
      game.processPlayerMove.mockReturnValue({ success: true });
      const result = playerTurnState.handle('00');
      expect(result.continue).toBe(true);
      expect(game.setState).toHaveBeenCalled();
    });

    it('should handle invalid moves', () => {
      game.processPlayerMove.mockReturnValue({ success: false });
      const result = playerTurnState.handle('invalid');
      expect(result.continue).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('CPUTurnState', () => {
    let cpuTurnState;

    beforeEach(() => {
      cpuTurnState = new CPUTurnState(game);
    });

    it('should handle CPU moves', () => {
      game.processCPUMove.mockReturnValue({ success: true });
      const result = cpuTurnState.handle();
      expect(result.continue).toBe(true);
      expect(game.setState).toHaveBeenCalled();
    });

    it('should handle move errors', () => {
      game.processCPUMove.mockImplementation(() => {
        throw new Error('Move failed');
      });
      const result = cpuTurnState.handle();
      expect(result.continue).toBe(true);
      expect(result.error).toBe('Move failed');
    });
  });

  describe('GameStateMachine', () => {
    let stateMachine;
    let initialState;

    beforeEach(() => {
      initialState = new InitializationState(game);
      stateMachine = new GameStateMachine(initialState);
    });

    it('should maintain state history', () => {
      const playingState = new PlayingState(game);
      const gameOverState = new GameOverState(game, 'player');
      
      stateMachine.setState(playingState);
      stateMachine.setState(gameOverState);
      
      const history = stateMachine.getStateHistory();
      expect(history).toHaveLength(3); // initial + 2 transitions
      expect(history[0].name).toBe('InitializationState');
      expect(history[1].name).toBe('PlayingState');
      expect(history[2].name).toBe('GameOverState');
    });

    it('should check current state type', () => {
      expect(stateMachine.isInState(InitializationState)).toBe(true);
      expect(stateMachine.isInState(PlayingState)).toBe(false);
    });

    it('should get current state name', () => {
      expect(stateMachine.getStateName()).toBe('InitializationState');
    });
  });

  describe('SetupState', () => {
    let setupState;

    beforeEach(() => {
      setupState = new SetupState(game);
    });

    it('should notify on enter', () => {
      setupState.enter();
      expect(game.notify).toHaveBeenCalledWith('setup', { message: 'Place your ships' });
    });

    it('should handle start command', () => {
      setupState.handleInput('start');
      expect(game.setState).toHaveBeenCalled();
    });

    it('should handle invalid commands', () => {
      setupState.handleInput('invalid');
      expect(game.notify).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('PlayState', () => {
    let playState;

    beforeEach(() => {
      playState = new PlayState(game);
    });

    it('should notify on enter', () => {
      playState.enter();
      expect(game.notify).toHaveBeenCalledWith('play', { message: 'Your turn to attack' });
    });

    it('should handle valid moves', () => {
      game.processPlayerMove.mockReturnValue({ success: true, hit: true, sunk: false });
      playState.handleInput('A1');
      expect(game.notify).toHaveBeenCalledWith('hit', expect.any(Object));
      expect(game.setState).toHaveBeenCalled();
    });

    it('should handle invalid moves', () => {
      playState.handleInput('invalid');
      expect(game.notify).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });
}); 