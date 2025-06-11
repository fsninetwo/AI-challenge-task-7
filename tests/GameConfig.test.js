const GameConfig = require('../src/config/GameConfig');

describe('GameConfig', () => {
  beforeEach(() => {
    delete GameConfig.instance;
  });

  test('should implement singleton pattern', () => {
    const config1 = new GameConfig();
    const config2 = new GameConfig();
    expect(config1).toBe(config2);
  });

  test('should return correct configuration values', () => {
    const config = new GameConfig();
    expect(config.get('boardSize')).toBe(10);
    expect(config.get('numShips')).toBe(3);
    expect(config.get('shipLength')).toBe(3);
  });

  test('should return correct symbols', () => {
    const config = new GameConfig();
    const symbols = config.get('symbols');
    expect(symbols.water).toBe('~');
    expect(symbols.ship).toBe('S');
    expect(symbols.hit).toBe('X');
    expect(symbols.miss).toBe('O');
  });

  test('should interpolate message parameters', () => {
    const config = new GameConfig();
    const message = config.getMessage('cpuHit', { coordinate: '34' });
    expect(message).toBe('CPU HIT at 34!');
  });

  test('should return static messages', () => {
    const config = new GameConfig();
    expect(config.getMessage('playerHit')).toBe('PLAYER HIT!');
    expect(config.getMessage('playerMiss')).toBe('PLAYER MISS.');
    expect(config.getMessage('shipSunk')).toBe('You sunk an enemy battleship!');
  });

  test('should handle multiple parameter interpolation', () => {
    const config = new GameConfig();
    const outOfBoundsMsg = config.getMessage('outOfBounds', { max: 9 });
    expect(outOfBoundsMsg).toBe('Oops, please enter valid row and column numbers between 0 and 9.');
  });

  test('should return undefined for non-existent keys', () => {
    const config = new GameConfig();
    expect(config.get('nonExistentKey')).toBeUndefined();
  });

  test('should be immutable', () => {
    const config = new GameConfig();
    const originalBoardSize = config.get('boardSize');
    
    // Attempt to modify (should not work due to Object.freeze)
    config.settings.boardSize = 20;
    
    // Verify that the value hasn't changed (Object.freeze prevents modification)
    expect(config.get('boardSize')).toBe(originalBoardSize);
    
    // Attempt to modify nested objects
    const originalWaterSymbol = config.get('symbols').water;
    config.settings.symbols.water = 'X';
    expect(config.get('symbols').water).toBe(originalWaterSymbol);
  });
}); 