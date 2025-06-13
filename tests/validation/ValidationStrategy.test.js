const {
  ValidationStrategy,
  InputFormatValidator,
  CoordinateRangeValidator,
  DuplicateGuessValidator,
  InputValidator,
  AttackInputValidator,
  ShipPlacementValidator
} = require('../../src/validation/ValidationStrategy');
const GameConfig = require('../../src/config/GameConfig');
const GameBoard = require('../../src/entities/GameBoard');

describe('ValidationStrategy', () => {
  test('base class validate() throws error', () => {
    const validator = new ValidationStrategy();
    expect(() => validator.validate('test')).toThrow('validate() must be implemented');
  });
});

describe('InputFormatValidator', () => {
  let validator;
  let config;

  beforeEach(() => {
    validator = new InputFormatValidator();
    config = new GameConfig();
  });

  test('validates correct input format', () => {
    expect(validator.validate('00')).toEqual({ isValid: true });
    expect(validator.validate('99')).toEqual({ isValid: true });
  });

  test('rejects invalid input types', () => {
    expect(validator.validate(null)).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
    expect(validator.validate(undefined)).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
    expect(validator.validate(123)).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
    expect(validator.validate('')).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
  });

  test('rejects wrong length input', () => {
    expect(validator.validate('0')).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
    expect(validator.validate('000')).toEqual({ isValid: false, message: config.getMessage('invalidInput') });
  });
});

describe('CoordinateRangeValidator', () => {
  let validator;
  let config;

  beforeEach(() => {
    validator = new CoordinateRangeValidator();
    config = new GameConfig();
  });

  test('validates coordinates within range', () => {
    expect(validator.validate('00')).toEqual({ isValid: true });
    expect(validator.validate('99')).toEqual({ isValid: true });
  });

  test('rejects coordinates out of range', () => {
    const message = config.getMessage('outOfBounds', { max: config.get('boardSize') - 1 });
    
    // Test non-numeric input
    expect(validator.validate('XX')).toEqual({ isValid: false, message });
    
    // Test negative numbers
    expect(validator.validate('-1')).toEqual({ isValid: false, message });
    
    // Test valid coordinates
    expect(validator.validate('00')).toEqual({ isValid: true });
    expect(validator.validate('09')).toEqual({ isValid: true });
    expect(validator.validate('90')).toEqual({ isValid: true });
    expect(validator.validate('99')).toEqual({ isValid: true });
    
    // Test invalid coordinates
    expect(validator.validate('A0')).toEqual({ isValid: false, message });
    expect(validator.validate('0A')).toEqual({ isValid: false, message });
  });
});

describe('DuplicateGuessValidator', () => {
  let guessHistory;
  let validator;
  let config;

  beforeEach(() => {
    guessHistory = new Set(['00', '11']);
    validator = new DuplicateGuessValidator(guessHistory);
    config = new GameConfig();
  });

  test('validates new guesses', () => {
    expect(validator.validate('22')).toEqual({ isValid: true });
    expect(validator.validate('33')).toEqual({ isValid: true });
  });

  test('rejects duplicate guesses', () => {
    expect(validator.validate('00')).toEqual({ isValid: false, message: config.getMessage('duplicateGuess') });
    expect(validator.validate('11')).toEqual({ isValid: false, message: config.getMessage('duplicateGuess') });
  });
});

describe('InputValidator', () => {
  let validator;
  let formatValidator;
  let rangeValidator;
  let duplicateValidator;
  let guessHistory;

  beforeEach(() => {
    guessHistory = new Set(['00']);
    formatValidator = new InputFormatValidator();
    rangeValidator = new CoordinateRangeValidator();
    duplicateValidator = new DuplicateGuessValidator(guessHistory);
    validator = new InputValidator();
  });

  test('validates with no strategies', () => {
    expect(validator.validate('anything')).toEqual({ isValid: true });
  });

  test('validates with single strategy', () => {
    validator.addStrategy(formatValidator);
    expect(validator.validate('00')).toEqual({ isValid: true });
    expect(validator.validate('xxx')).toEqual({ isValid: false, message: expect.any(String) });
  });

  test('validates with multiple strategies', () => {
    validator
      .addStrategy(formatValidator)
      .addStrategy(rangeValidator)
      .addStrategy(duplicateValidator);

    expect(validator.validate('22')).toEqual({ isValid: true });
    expect(validator.validate('00')).toEqual({ isValid: false, message: expect.any(String) });
    expect(validator.validate('xxx')).toEqual({ isValid: false, message: expect.any(String) });
  });

  test('supports method chaining', () => {
    expect(validator.addStrategy(formatValidator)).toBe(validator);
  });
});

describe('AttackInputValidator', () => {
  let board;
  let validator;

  beforeEach(() => {
    board = new GameBoard(10);
    validator = new AttackInputValidator(board);
  });

  test('validates valid attack coordinates', () => {
    expect(validator.validate('00')).toBe(true);
    expect(validator.validate('99')).toBe(true);
  });

  test('rejects invalid attack coordinates', () => {
    expect(validator.validate('')).toBe(false);
    expect(validator.validate('0')).toBe(false);
    expect(validator.validate('000')).toBe(false);
    expect(validator.validate('XX')).toBe(false);
    expect(validator.validate(null)).toBe(false);
    expect(validator.validate(undefined)).toBe(false);
  });
});

describe('ShipPlacementValidator', () => {
  let board;
  let validator;

  beforeEach(() => {
    board = new GameBoard(10);
    validator = new ShipPlacementValidator(board);
  });

  test('validates valid ship placements', () => {
    expect(validator.validate('00h')).toBe(true);
    expect(validator.validate('00v')).toBe(true);
    expect(validator.validate('55h')).toBe(true);
    expect(validator.validate('55v')).toBe(true);
  });

  test('rejects invalid ship placements', () => {
    expect(validator.validate('')).toBe(false);
    expect(validator.validate('0')).toBe(false);
    expect(validator.validate('00')).toBe(false);
    expect(validator.validate('00x')).toBe(false);
    expect(validator.validate('XXh')).toBe(false);
    expect(validator.validate(null)).toBe(false);
    expect(validator.validate(undefined)).toBe(false);
  });

  test('rejects ship placements that would extend beyond board', () => {
    expect(validator.validate('88h')).toBe(false);
    expect(validator.validate('88v')).toBe(false);
  });

  test('rejects overlapping ship placements', () => {
    board.placeShip({ length: 3, row: 0, col: 0, isHorizontal: true });
    expect(validator.validate('00h')).toBe(false);
    expect(validator.validate('00v')).toBe(false);
  });
}); 