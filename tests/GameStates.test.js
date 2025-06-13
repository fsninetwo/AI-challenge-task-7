const {
  SetupState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState
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
  let mockGame;
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGame = {
      playerBoard: { reset: jest.fn() },
      cpuBoard: { reset: jest.fn() },
      displayBoards: jest.fn(),
      requestPlayerInput: jest.fn().mockResolvedValue('22'),
      processPlayerMove: jest.fn().mockResolvedValue({ success: true, hit: false }),
      processCPUMove: jest.fn().mockResolvedValue({ success: true, hit: false, coordinate: '33' }),
      setState: jest.fn(),
      endGame: jest.fn(),
      playerNumShips: 3,
      cpuNumShips: 3,
      currentState: null,
      getGameStatus: jest.fn().mockReturnValue({
        totalTurns: 10,
        playerMoves: 6,
        cpuMoves: 4
      })
    };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('SetupState', () => {
    let state;

    beforeEach(() => {
      state = new SetupState(mockGame);
    });

    test('should enter setup state with welcome message', async () => {
      await state.enter();
      expect(consoleSpy).toHaveBeenCalledWith("\nLet's play Sea Battle!");
      expect(consoleSpy).toHaveBeenCalledWith('Try to sink the 3 enemy ships.');
    });

    test('should transition to player turn state', async () => {
      await state.handle();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(PlayerTurnState));
    });
  });

  describe('PlayerTurnState', () => {
    let state;

    beforeEach(() => {
      state = new PlayerTurnState(mockGame);
      mockGame.processPlayerMove.mockReset();
      mockGame.requestPlayerInput.mockReset();
    });

    test('should display boards and get player input', async () => {
      mockGame.requestPlayerInput.mockResolvedValueOnce('22');
      mockGame.processPlayerMove.mockResolvedValueOnce({ success: true, hit: false });
      await state.enter();
      expect(mockGame.displayBoards).toHaveBeenCalled();
      await state.handle();
      expect(mockGame.requestPlayerInput).toHaveBeenCalled();
    });

    test('should process valid player move', async () => {
      mockGame.requestPlayerInput.mockResolvedValueOnce('22');
      mockGame.processPlayerMove.mockResolvedValueOnce({ success: true, hit: false });
      await state.handle();
      expect(mockGame.processPlayerMove).toHaveBeenCalledWith('22');
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(CPUTurnState));
    });

    test('should handle invalid move and retry', async () => {
      mockGame.requestPlayerInput
        .mockResolvedValueOnce('22')
        .mockResolvedValueOnce('33');
      mockGame.processPlayerMove
        .mockResolvedValueOnce({ success: false, error: 'Invalid move' })
        .mockResolvedValueOnce({ success: true, hit: false });
      
      await state.handle();
      await state.handle();
      expect(mockGame.processPlayerMove).toHaveBeenCalledTimes(2);
    });

    test('should handle player win condition', async () => {
      mockGame.requestPlayerInput.mockResolvedValueOnce('22');
      mockGame.cpuNumShips = 0;
      mockGame.processPlayerMove.mockResolvedValueOnce({ success: true, hit: true, sunk: true });
      
      await state.handle();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(GameOverState));
    });

    test('should display hit/miss messages', async () => {
      mockGame.requestPlayerInput.mockResolvedValueOnce('22');
      mockGame.processPlayerMove.mockResolvedValueOnce({ success: true, hit: true });
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('PLAYER HIT!');

      mockGame.requestPlayerInput.mockResolvedValueOnce('33');
      mockGame.processPlayerMove.mockResolvedValueOnce({ success: true, hit: false });
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('PLAYER MISS.');
    });
  });

  describe('CPUTurnState', () => {
    let state;

    beforeEach(() => {
      state = new CPUTurnState(mockGame);
    });

    test('should process CPU move', async () => {
      await state.handle();
      expect(mockGame.processCPUMove).toHaveBeenCalled();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(PlayerTurnState));
    });

    test('should handle CPU win condition', async () => {
      mockGame.playerNumShips = 0;
      mockGame.processCPUMove.mockResolvedValue({ success: true, hit: true, sunk: true });
      
      await state.handle();
      expect(mockGame.setState).toHaveBeenCalledWith(expect.any(GameOverState));
    });

    test('should display hit/miss messages', async () => {
      mockGame.processCPUMove.mockResolvedValueOnce({ 
        success: true, 
        hit: true, 
        coordinate: '22' 
      });
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('CPU HIT at 22!');

      mockGame.processCPUMove.mockResolvedValueOnce({ 
        success: true, 
        hit: false, 
        coordinate: '33' 
      });
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('CPU MISS at 33.');
    });
  });

  describe('GameOverState', () => {
    test('should handle player win', async () => {
      const state = new GameOverState(mockGame, 'player');
      await state.enter();
      expect(mockGame.displayBoards).toHaveBeenCalled();
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('\n*** CONGRATULATIONS! You sunk all enemy battleships! ***');
      expect(mockGame.endGame).toHaveBeenCalledWith('player');
    });

    test('should handle CPU win', async () => {
      const state = new GameOverState(mockGame, 'cpu');
      await state.enter();
      expect(mockGame.displayBoards).toHaveBeenCalled();
      await state.handle();
      expect(consoleSpy).toHaveBeenCalledWith('\n*** GAME OVER! The CPU sunk all your battleships! ***');
      expect(mockGame.endGame).toHaveBeenCalledWith('cpu');
    });

    test('should display game statistics', async () => {
      const state = new GameOverState(mockGame, 'player');
      await state.enter();
      expect(mockGame.displayBoards).toHaveBeenCalled();
      await state.handle();
      
      expect(consoleSpy).toHaveBeenCalledWith('\nGame Statistics:');
      expect(consoleSpy).toHaveBeenCalledWith('Total Turns: 10');
      expect(consoleSpy).toHaveBeenCalledWith('Player Moves: 6');
      expect(consoleSpy).toHaveBeenCalledWith('CPU Moves: 4');
    });
  });
}); 