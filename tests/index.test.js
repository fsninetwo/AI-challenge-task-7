/**
 * Index Tests - Coverage for main entry point
 * 
 * @module tests/index
 */

const { main } = require('../src/index');

jest.mock('../src/game/Game', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn()
  }));
});

describe('Index Main Entry Point', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    process.exit.mockRestore();
  });

  test('should start game successfully', () => {
    const Game = require('../src/game/Game');
    
    main();
    
    expect(Game).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('='.repeat(50));
    expect(console.log).toHaveBeenCalledWith('      🚢 Sea Battle Game v2.0 🚢');
  });

  test('should handle game creation error', () => {
    const Game = require('../src/game/Game');
    Game.mockImplementation(() => {
      throw new Error('Game creation failed');
    });
    
    main();
    
    expect(console.error).toHaveBeenCalledWith('Failed to start game:', 'Game creation failed');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should handle game start error', () => {
    const Game = require('../src/game/Game');
    const mockGame = { start: jest.fn() };
    mockGame.start.mockImplementation(() => {
      throw new Error('Start failed');
    });
    Game.mockImplementation(() => mockGame);
    
    main();
    
    expect(console.error).toHaveBeenCalledWith('Failed to start game:', 'Start failed');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 