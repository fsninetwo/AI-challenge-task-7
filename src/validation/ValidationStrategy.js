/**
 * Validation Layer - Strategy Pattern Implementation
 * 
 * Provides composable validation strategies for input validation.
 * Implements Strategy pattern for flexible validation rules.
 * 
 * @module ValidationStrategy
 */

const GameConfig = require('../config/GameConfig');

/**
 * Abstract base class for validation strategies
 */
class ValidationStrategy {
  /**
   * Validate input according to strategy rules
   * @param {*} input - Input to validate
   * @returns {Object} Validation result with isValid boolean and optional message
   */
  validate(input) {
    throw new Error('Validation strategy must implement validate method');
  }
}

/**
 * Validates input format (must be exactly 2 digits)
 */
class InputFormatValidator extends ValidationStrategy {
  validate(input) {
    const config = new GameConfig();
    if (typeof input !== 'string' || !input || input.length !== 2) {
      return { isValid: false, message: config.getMessage('invalidInput') };
    }
    return { isValid: true };
  }
}

/**
 * Validates coordinate range (must be within board bounds)
 */
class CoordinateRangeValidator extends ValidationStrategy {
  validate(input) {
    const config = new GameConfig();
    const [row, col] = [parseInt(input[0]), parseInt(input[1])];
    const boardSize = config.get('boardSize');
    
    if (isNaN(row) || isNaN(col) || row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      return { 
        isValid: false, 
        message: config.getMessage('outOfBounds', { max: boardSize - 1 })
      };
    }
    return { isValid: true };
  }
}

/**
 * Validates that guess hasn't been made before
 */
class DuplicateGuessValidator extends ValidationStrategy {
  constructor(guessHistory) {
    super();
    this.guessHistory = guessHistory;
  }
  
  validate(input) {
    const config = new GameConfig();
    if (this.guessHistory.has(input)) {
      return { isValid: false, message: config.getMessage('duplicateGuess') };
    }
    return { isValid: true };
  }
}

/**
 * Composite validator that chains multiple validation strategies
 */
class InputValidator {
  constructor() {
    this.strategies = [];
  }
  
  /**
   * Add a validation strategy to the chain
   * @param {ValidationStrategy} strategy - Strategy to add
   * @returns {InputValidator} This validator for chaining
   */
  addStrategy(strategy) {
    this.strategies.push(strategy);
    return this;
  }
  
  /**
   * Validate input using all configured strategies
   * @param {*} input - Input to validate
   * @returns {Object} Validation result (first failure or success)
   */
  validate(input) {
    for (const strategy of this.strategies) {
      const result = strategy.validate(input);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  }
}

module.exports = {
  ValidationStrategy,
  InputFormatValidator,
  CoordinateRangeValidator,
  DuplicateGuessValidator,
  InputValidator
}; 