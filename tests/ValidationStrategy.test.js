const {
  ValidationStrategy,
  InputFormatValidator,
  CoordinateRangeValidator,
  DuplicateGuessValidator,
  InputValidator
} = require('../src/validation/ValidationStrategy');

describe('ValidationStrategy', () => {
  describe('Abstract ValidationStrategy', () => {
    test('should throw error when validate method is not implemented', () => {
      const strategy = new ValidationStrategy();
      expect(() => strategy.validate('test')).toThrow('Validation strategy must implement validate method');
    });
  });

  describe('InputFormatValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new InputFormatValidator();
    });

    test('should accept valid 2-digit input', () => {
      expect(validator.validate('00')).toEqual({ isValid: true });
      expect(validator.validate('34')).toEqual({ isValid: true });
      expect(validator.validate('99')).toEqual({ isValid: true });
      expect(validator.validate('12')).toEqual({ isValid: true });
    });

    test('should reject input with wrong length', () => {
      const result1 = validator.validate('1');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('exactly two digits');

      const result2 = validator.validate('123');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('exactly two digits');

      const result3 = validator.validate('');
      expect(result3.isValid).toBe(false);
      expect(result3.message).toContain('exactly two digits');
    });

    test('should reject null or undefined input', () => {
      const result1 = validator.validate(null);
      expect(result1.isValid).toBe(false);

      const result2 = validator.validate(undefined);
      expect(result2.isValid).toBe(false);
    });

    test('should reject non-string input', () => {
      const result1 = validator.validate(123);
      expect(result1.isValid).toBe(false);

      const result2 = validator.validate([1, 2]);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('CoordinateRangeValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new CoordinateRangeValidator();
    });

    test('should accept valid coordinates within bounds', () => {
      expect(validator.validate('00')).toEqual({ isValid: true });
      expect(validator.validate('55')).toEqual({ isValid: true });
      expect(validator.validate('99')).toEqual({ isValid: true });
      expect(validator.validate('09')).toEqual({ isValid: true });
      expect(validator.validate('90')).toEqual({ isValid: true });
    });

    test('should reject coordinates outside bounds', () => {
      const result1 = validator.validate('AA');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('valid row and column numbers');

      const result2 = validator.validate('A0');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('valid row and column numbers');

      const result3 = validator.validate('0A');
      expect(result3.isValid).toBe(false);
      expect(result3.message).toContain('valid row and column numbers');
    });

    test('should handle boundary values correctly', () => {
      expect(validator.validate('00')).toEqual({ isValid: true });
      expect(validator.validate('99')).toEqual({ isValid: true });
    });
  });

  describe('DuplicateGuessValidator', () => {
    let guessHistory;
    let validator;

    beforeEach(() => {
      guessHistory = new Set(['00', '11', '22']);
      validator = new DuplicateGuessValidator(guessHistory);
    });

    test('should accept new coordinates', () => {
      expect(validator.validate('33')).toEqual({ isValid: true });
      expect(validator.validate('44')).toEqual({ isValid: true });
      expect(validator.validate('99')).toEqual({ isValid: true });
    });

    test('should reject duplicate coordinates', () => {
      const result1 = validator.validate('00');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('already guessed');

      const result2 = validator.validate('11');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('already guessed');
    });

    test('should work with empty guess history', () => {
      const emptyValidator = new DuplicateGuessValidator(new Set());
      expect(emptyValidator.validate('00')).toEqual({ isValid: true });
      expect(emptyValidator.validate('99')).toEqual({ isValid: true });
    });

    test('should update when guess history is modified', () => {
      expect(validator.validate('33')).toEqual({ isValid: true });
      
      guessHistory.add('33');
      
      const result = validator.validate('33');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('already guessed');
    });
  });

  describe('InputValidator (Composite)', () => {
    let validator;
    let guessHistory;

    beforeEach(() => {
      guessHistory = new Set(['00', '11']);
      validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator())
        .addStrategy(new DuplicateGuessValidator(guessHistory));
    });

    test('should accept valid, unique coordinates', () => {
      expect(validator.validate('22')).toEqual({ isValid: true });
      expect(validator.validate('99')).toEqual({ isValid: true });
      expect(validator.validate('05')).toEqual({ isValid: true });
    });

    test('should reject on first failed validation (format)', () => {
      const result1 = validator.validate('1');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('exactly two digits');

      const result2 = validator.validate('123');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('exactly two digits');
    });

    test('should reject on second failed validation (range)', () => {
      const result1 = validator.validate('AA');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('valid row and column numbers');

      const result2 = validator.validate('A0');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('valid row and column numbers');
    });

    test('should reject on third failed validation (duplicate)', () => {
      const result1 = validator.validate('00');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('already guessed');

      const result2 = validator.validate('11');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('already guessed');
    });

    test('should support method chaining', () => {
      const chainedValidator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator());
      
      expect(chainedValidator).toBeInstanceOf(InputValidator);
      expect(chainedValidator.strategies.length).toBe(2);
    });

    test('should validate strategies in order', () => {
      // Format validation should fail before range validation
      const formatFailValidator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator());
      
      const result = formatFailValidator.validate('A'); // Too short AND invalid range
      expect(result.message).toContain('exactly two digits'); // Format error comes first
    });

    test('should work with no strategies', () => {
      const emptyValidator = new InputValidator();
      expect(emptyValidator.validate('anything')).toEqual({ isValid: true });
    });
  });

  describe('Integration Tests', () => {
    test('should validate complete game input flow', () => {
      const gameGuesses = new Set();
      const validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator())
        .addStrategy(new DuplicateGuessValidator(gameGuesses));

      // First move should be valid
      expect(validator.validate('05')).toEqual({ isValid: true });
      gameGuesses.add('05');

      // Second move should be valid
      expect(validator.validate('37')).toEqual({ isValid: true });
      gameGuesses.add('37');

      // Duplicate move should be invalid
      const duplicateResult = validator.validate('05');
      expect(duplicateResult.isValid).toBe(false);
      expect(duplicateResult.message).toContain('already guessed');

      // Invalid format should be caught
      const formatResult = validator.validate('5');
      expect(formatResult.isValid).toBe(false);
      expect(formatResult.message).toContain('exactly two digits');

      // Invalid range should be caught
      const rangeResult = validator.validate('AA');
      expect(rangeResult.isValid).toBe(false);
      expect(rangeResult.message).toContain('valid row and column numbers');
    });

    test('should handle rapid validation requests', () => {
      const gameGuesses = new Set();
      const validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator())
        .addStrategy(new DuplicateGuessValidator(gameGuesses));

      const validCoordinates = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
      
      validCoordinates.forEach(coord => {
        expect(validator.validate(coord)).toEqual({ isValid: true });
        gameGuesses.add(coord);
      });

      // All should now be duplicates
      validCoordinates.forEach(coord => {
        const result = validator.validate(coord);
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('already guessed');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed input gracefully', () => {
      const validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator());

      const malformedInputs = [null, undefined, '', 'abc', '!@#', '   '];
      
      malformedInputs.forEach(input => {
        expect(() => validator.validate(input)).not.toThrow();
        const result = validator.validate(input);
        expect(result.isValid).toBe(false);
        expect(result).toHaveProperty('message');
      });
    });

    test('should handle edge case coordinates', () => {
      const validator = new InputValidator()
        .addStrategy(new InputFormatValidator())
        .addStrategy(new CoordinateRangeValidator());

      const edgeCases = ['00', '09', '90', '99'];
      
      edgeCases.forEach(coord => {
        expect(validator.validate(coord)).toEqual({ isValid: true });
      });
    });
  });
}); 