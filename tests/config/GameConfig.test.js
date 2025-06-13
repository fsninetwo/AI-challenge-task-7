const GameConfig = require('../../src/config/GameConfig');

describe('GameConfig', () => {
  let config;

  beforeEach(() => {
    config = new GameConfig();
  });

  test('should be a singleton', () => {
    const config2 = new GameConfig();
    expect(config).toBe(config2);
  });

  test('should have correct initial settings', () => {
    expect(config.get('boardSize')).toBe(10);
    expect(config.get('numShips')).toBe(3);
    expect(config.get('shipLength')).toBe(3);
  });

  test('should get nested settings using dot notation', () => {
    expect(config.get('symbols.water')).toBe('~');
    expect(config.get('symbols.ship')).toBe('S');
    expect(config.get('symbols.hit')).toBe('X');
    expect(config.get('symbols.miss')).toBe('O');
  });

  test('should format messages with parameters', () => {
    const message = config.getMessage('outOfBounds', { max: 9 });
    expect(message).toBe('Oops, please enter valid row and column numbers between 0 and 9');
  });

  test('should handle missing message parameters', () => {
    const message = config.getMessage('outOfBounds');
    expect(message).toBe('Oops, please enter valid row and column numbers between 0 and {max}');
  });

  test('should handle unknown message keys', () => {
    const message = config.getMessage('nonexistent');
    expect(message).toBeUndefined();
  });
}); 