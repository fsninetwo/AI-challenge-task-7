const {
  GameState,
  InitializationState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState,
  GameStateMachine
} = require('../src/states/GameStates');

jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    getMessage: (key) => ({
      playerWin: 'Congratulations! You won!',
      cpuWin: 'CPU wins! Better luck next time.'
    }[key] || 'Message not found')
  }));
});

describe('Game States', () => {
  describe('GameState Base Class', () => {
    test('should throw error when handle is not implemented', () => {
      const state = new GameState();
      expect(() => state.handle()).toThrow('State must implement handle method');
    });

    test('should have a name property', () => {
      const state = new GameState();
      expect(state.name).toBe('BaseState');
    });
  });

  describe('InitializationState', () => {
    let state;
    let mockGame;

    beforeEach(() => {
      state = new InitializationState();
      mockGame = {
        playerBoard: { reset: jest.fn() },
        cpuBoard: { reset: jest.fn() },
        initializeGame: jest.fn(),
        setState: jest.fn()
      };
    });

    test('should have correct name', () => {
      expect(state.name).toBe('Initialization');
    });

    test('should handle initialization properly', () => {
      const result = state.handle(mockGame);
      
      expect(mockGame.playerBoard.reset).toHaveBeenCalled();
      expect(mockGame.cpuBoard.reset).toHaveBeenCalled();
      expect(mockGame.initializeGame).toHaveBeenCalled();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(PlayerTurnState));
      expect(result).toEqual({ continue: true });
    });
  });

  describe('PlayerTurnState', () => {
    let state;
    let mockGame;

    beforeEach(() => {
      state = new PlayerTurnState();
      mockGame = {
        processPlayerMove: jest.fn().mockReturnValue({ continue: true }),
        setState: jest.fn(),
        cpuNumShips: 1
      };
    });

    test('should have correct name', () => {
      expect(state.name).toBe('PlayerTurn');
    });

    test('should handle player turn and continue to CPU turn', () => {
      const result = state.handle(mockGame, '34');
      
      expect(mockGame.processPlayerMove).toHaveBeenCalledWith('34');
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(CPUTurnState));
      expect(result.continue).toBe(true);
    });

    test('should handle player win condition', () => {
      mockGame.cpuNumShips = 0;
      mockGame.processPlayerMove.mockReturnValue({ continue: false, hit: true });
      
      const result = state.handle(mockGame, '34');
      
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(GameOverState));
      expect(result.continue).toBe(false);
      expect(result.winner).toBe('player');
    });

    test('should handle player miss', () => {
      mockGame.processPlayerMove.mockReturnValue({ continue: true, hit: false });
      
      const result = state.handle(mockGame, '00');
      
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(CPUTurnState));
      expect(result.continue).toBe(true);
    });
  });

  describe('CPUTurnState', () => {
    let state;
    let mockGame;

    beforeEach(() => {
      state = new CPUTurnState();
      mockGame = {
        processCPUMove: jest.fn().mockReturnValue({ continue: true }),
        setState: jest.fn(),
        playerNumShips: 1
      };
    });

    test('should have correct name', () => {
      expect(state.name).toBe('CPUTurn');
    });

    test('should handle CPU turn and continue to player turn', () => {
      const result = state.handle(mockGame);
      
      expect(mockGame.processCPUMove).toHaveBeenCalled();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(PlayerTurnState));
      expect(result.continue).toBe(true);
    });

    test('should handle CPU win condition', () => {
      mockGame.playerNumShips = 0;
      mockGame.processCPUMove.mockReturnValue({ continue: false, hit: true });
      
      const result = state.handle(mockGame);
      
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(GameOverState));
      expect(result.continue).toBe(false);
      expect(result.winner).toBe('cpu');
    });

    test('should handle CPU miss', () => {
      mockGame.processCPUMove.mockReturnValue({ continue: true, hit: false });
      
      const result = state.handle(mockGame);
      
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(PlayerTurnState));
      expect(result.continue).toBe(true);
    });
  });

  describe('GameOverState', () => {
    test('should have correct name and handle player win', () => {
      const state = new GameOverState('player');
      const mockGame = {};
      
      expect(state.name).toBe('GameOver');
      expect(state.winner).toBe('player');
      
      const result = state.handle(mockGame);
      expect(result.continue).toBe(false);
      expect(result.winner).toBe('player');
      expect(result.message).toBe('Congratulations! You won!');
    });

    test('should handle CPU win', () => {
      const state = new GameOverState('cpu');
      const mockGame = {};
      
      const result = state.handle(mockGame);
      expect(result.continue).toBe(false);
      expect(result.winner).toBe('cpu');
      expect(result.message).toBe('CPU wins! Better luck next time.');
    });
  });

  describe('GameStateMachine', () => {
    let stateMachine;

    beforeEach(() => {
      stateMachine = new GameStateMachine();
    });

    test('should start in initialization state', () => {
      expect(stateMachine.currentState).toBeInstanceOf(InitializationState);
    });

    test('should change state correctly', () => {
      const newState = new PlayerTurnState();
      stateMachine.setState(newState);
      
      expect(stateMachine.currentState).toBe(newState);
    });

    test('should handle state transitions', () => {
      // Create a mock function that explicitly expects 2 parameters
      const mockHandleFunction = function(context, input) { return { result: 'test' }; };
      const mockState = {
        handle: jest.fn(mockHandleFunction)
      };
      
      stateMachine.setState(mockState);
      const result = stateMachine.handle({}, 'input');
      
      expect(mockState.handle).toHaveBeenCalledWith({}, 'input');
      expect(result.result).toBe('test');
    });

    test('should get current state name', () => {
      expect(stateMachine.getStateName()).toBe('Initialization');
      
      stateMachine.setState(new PlayerTurnState());
      expect(stateMachine.getStateName()).toBe('PlayerTurn');
      
      stateMachine.setState(new CPUTurnState());
      expect(stateMachine.getStateName()).toBe('CPUTurn');
      
      stateMachine.setState(new GameOverState('player'));
      expect(stateMachine.getStateName()).toBe('GameOver');
    });
  });

  describe('State Flow Integration', () => {
    test('should transition from initialization through game flow', () => {
      const stateMachine = new GameStateMachine();
      const mockGame = {
        playerBoard: { reset: jest.fn() },
        cpuBoard: { reset: jest.fn() },
        initializeGame: jest.fn(),
        setState: jest.fn(),
        processPlayerMove: jest.fn().mockReturnValue({ continue: true, hit: false }),
        processCPUMove: jest.fn().mockReturnValue({ continue: true, hit: false }),
        cpuNumShips: 1,
        playerNumShips: 1
      };

      // Capture setState calls to update state machine
      mockGame.setState.mockImplementation((newState) => {
        stateMachine.setState(newState);
      });

      // Start with initialization
      expect(stateMachine.getStateName()).toBe('Initialization');
      
      // Initialize game
      stateMachine.handle(mockGame);
      expect(stateMachine.getStateName()).toBe('PlayerTurn');
      
      // Player turn
      stateMachine.handle(mockGame, '34');
      expect(stateMachine.getStateName()).toBe('CPUTurn');
      
      // CPU turn
      stateMachine.handle(mockGame);
      expect(stateMachine.getStateName()).toBe('PlayerTurn');
    });

    test('should handle win conditions correctly', () => {
      const stateMachine = new GameStateMachine();
      const mockGame = {
        processPlayerMove: jest.fn().mockReturnValue({ continue: false, hit: true }),
        setState: jest.fn(),
        cpuNumShips: 0, // Player wins
        playerNumShips: 1
      };

      mockGame.setState.mockImplementation((newState) => {
        stateMachine.setState(newState);
      });

      stateMachine.setState(new PlayerTurnState());
      const result = stateMachine.handle(mockGame, '99');
      
      expect(stateMachine.getStateName()).toBe('GameOver');
      expect(result.winner).toBe('player');
    });
  });
}); 