const GameConfig = require('../../src/config/GameConfig');

describe('GameConfig', () => {
  let config;

  beforeEach(() => {
    // Clear singleton instance before each test
    GameConfig.instance = null;
    config = new GameConfig();
  });

  describe('singleton pattern', () => {
    test('returns same instance on multiple instantiations', () => {
      const config2 = new GameConfig();
      expect(config2).toBe(config);
    });

    test('maintains same settings across instances', () => {
      const config2 = new GameConfig();
      expect(config2.get('boardSize')).toBe(config.get('boardSize'));
      expect(config2.get('symbols')).toBe(config.get('symbols'));
      expect(config2.get('messages')).toBe(config.get('messages'));
    });
  });

  describe('settings immutability', () => {
    test('settings object is frozen', () => {
      expect(Object.isFrozen(config.settings)).toBe(true);
    });

    test('nested objects are frozen', () => {
      expect(Object.isFrozen(config.settings.symbols)).toBe(true);
      expect(Object.isFrozen(config.settings.messages)).toBe(true);
    });

    test('instance is frozen', () => {
      expect(Object.isFrozen(config)).toBe(true);
    });
  });

  describe('get method', () => {
    test('retrieves top-level settings', () => {
      expect(config.get('boardSize')).toBe(10);
      expect(config.get('numShips')).toBe(3);
      expect(config.get('shipLength')).toBe(3);
    });

    test('retrieves nested settings using dot notation', () => {
      expect(config.get('symbols.water')).toBe('~');
      expect(config.get('symbols.ship')).toBe('S');
      expect(config.get('symbols.hit')).toBe('X');
      expect(config.get('symbols.miss')).toBe('O');
    });

    test('returns undefined for non-existent keys', () => {
      expect(config.get('nonexistent')).toBeUndefined();
      expect(config.get('nonexistent.nested')).toBeUndefined();
      expect(config.get('symbols.nonexistent')).toBeUndefined();
    });
  });

  describe('getMessage method', () => {
    test('retrieves messages without parameters', () => {
      expect(config.getMessage('playerWin')).toBe('*** CONGRATULATIONS! You sunk all enemy battleships! ***');
      expect(config.getMessage('cpuWin')).toBe('*** GAME OVER! The CPU sunk all your battleships! ***');
      expect(config.getMessage('invalidInput')).toBe('Oops, input must be exactly two digits (e.g., 00, 34, 98).');
    });

    test('interpolates message parameters', () => {
      expect(config.getMessage('outOfBounds', { max: 9 }))
        .toBe('Oops, please enter valid row and column numbers between 0 and 9');
    });

    test('handles multiple parameter interpolation', () => {
      const message = config.getMessage('outOfBounds', { max: 9, min: 0 });
      expect(message).toBe('Oops, please enter valid row and column numbers between 0 and 9');
    });

    test('handles missing parameters', () => {
      const message = config.getMessage('outOfBounds');
      expect(message).toBe('Oops, please enter valid row and column numbers between 0 and {max}');
    });

    test('returns undefined for non-existent message keys', () => {
      expect(config.getMessage('nonexistent')).toBeUndefined();
    });

    test('ignores extra parameters', () => {
      const message = config.getMessage('playerWin', { extra: 'param' });
      expect(message).toBe('*** CONGRATULATIONS! You sunk all enemy battleships! ***');
    });
  });

  describe('default settings', () => {
    test('has correct board size', () => {
      expect(config.get('boardSize')).toBe(10);
    });

    test('has correct ship settings', () => {
      expect(config.get('numShips')).toBe(3);
      expect(config.get('shipLength')).toBe(3);
    });

    test('has correct symbols', () => {
      const symbols = config.get('symbols');
      expect(symbols.water).toBe('~');
      expect(symbols.ship).toBe('S');
      expect(symbols.hit).toBe('X');
      expect(symbols.miss).toBe('O');
    });

    test('has correct messages', () => {
      const messages = config.get('messages');
      expect(messages.playerWin).toBe('*** CONGRATULATIONS! You sunk all enemy battleships! ***');
      expect(messages.cpuWin).toBe('*** GAME OVER! The CPU sunk all your battleships! ***');
      expect(messages.invalidInput).toBe('Oops, input must be exactly two digits (e.g., 00, 34, 98).');
      expect(messages.outOfBounds).toBe('Oops, please enter valid row and column numbers between 0 and {max}');
      expect(messages.duplicateGuess).toBe('You already guessed that location!');
    });
  });
}); 