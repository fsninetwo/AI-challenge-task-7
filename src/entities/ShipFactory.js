/**
 * ShipFactory - Factory Pattern Implementation
 * 
 * Handles ship creation with placement validation and collision detection.
 * Implements Factory pattern for consistent ship creation.
 * 
 * @module ShipFactory
 */

const Ship = require('./Ship');
const GameConfig = require('../config/GameConfig');

/**
 * Factory class for creating ships with placement logic
 */
class ShipFactory {
  /**
   * Create a ship from given positions
   * @param {number[][]} positions - Array of [row, col] positions
   * @returns {Ship} New ship instance
   */
  static createShip(positions) {
    const locations = positions.map(([row, col]) => `${row}${col}`);
    return new Ship(locations);
  }
  
  /**
   * Create a randomly placed ship on the board
   * @param {GameBoard} board - Board to place ship on
   * @param {number} shipLength - Length of ship to create
   * @returns {Ship} New randomly placed ship
   * @throws {Error} If unable to place ship after maximum attempts
   */
  static createRandomShip(board, shipLength) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const { startRow, startCol } = this.generateRandomStart(orientation, boardSize, shipLength);
      const positions = this.getShipPositions(startRow, startCol, orientation, shipLength);
      
      if (this.canPlaceShip(board, positions)) {
        return this.createShip(positions);
      }
      attempts++;
    }
    
    throw new Error('Unable to place ship after maximum attempts');
  }
  
  /**
   * Generate random starting position for ship placement
   * @param {string} orientation - 'horizontal' or 'vertical'
   * @param {number} boardSize - Size of the board
   * @param {number} shipLength - Length of the ship
   * @returns {Object} Object with startRow and startCol properties
   */
  static generateRandomStart(orientation, boardSize, shipLength) {
    if (orientation === 'horizontal') {
      return {
        startRow: Math.floor(Math.random() * boardSize),
        startCol: Math.floor(Math.random() * (boardSize - shipLength + 1))
      };
    } else {
      return {
        startRow: Math.floor(Math.random() * (boardSize - shipLength + 1)),
        startCol: Math.floor(Math.random() * boardSize)
      };
    }
  }
  
  /**
   * Calculate all positions for a ship given start position and orientation
   * @param {number} startRow - Starting row
   * @param {number} startCol - Starting column
   * @param {string} orientation - 'horizontal' or 'vertical'
   * @param {number} shipLength - Length of the ship
   * @returns {number[][]} Array of [row, col] positions
   */
  static getShipPositions(startRow, startCol, orientation, shipLength) {
    return Array.from({length: shipLength}, (_, i) => {
      if (orientation === 'horizontal') {
        return [startRow, startCol + i];
      } else {
        return [startRow + i, startCol];
      }
    });
  }
  
  /**
   * Check if a ship can be placed at given positions
   * @param {GameBoard} board - Board to check placement on
   * @param {number[][]} positions - Array of [row, col] positions
   * @returns {boolean} True if ship can be placed
   */
  static canPlaceShip(board, positions) {
    const config = new GameConfig();
    const waterSymbol = config.get('symbols').water;
    
    return positions.every(([row, col]) => 
      board.isValidCoordinate(row, col) && 
      board.grid[row][col] === waterSymbol
    );
  }

  /**
   * Create a ship with specific pattern (for testing or special scenarios)
   * @param {string} pattern - Pattern type ('line', 'L-shape', etc.)
   * @param {number} startRow - Starting row
   * @param {number} startCol - Starting column
   * @param {number} length - Ship length
   * @returns {Ship} New ship with specified pattern
   */
  static createShipWithPattern(pattern, startRow, startCol, length) {
    let positions = [];
    
    switch (pattern) {
      case 'horizontal':
        positions = Array.from({length}, (_, i) => [startRow, startCol + i]);
        break;
      case 'vertical':
        positions = Array.from({length}, (_, i) => [startRow + i, startCol]);
        break;
      case 'diagonal':
        positions = Array.from({length}, (_, i) => [startRow + i, startCol + i]);
        break;
      default:
        throw new Error(`Unknown pattern: ${pattern}`);
    }
    
    return this.createShip(positions);
  }

  /**
   * Validate ship placement against game rules
   * @param {Ship} ship - Ship to validate
   * @param {GameBoard} board - Board to validate against
   * @returns {Object} Validation result with isValid and reasons
   */
  static validateShipPlacement(ship, board) {
    const config = new GameConfig();
    const validationResult = {
      isValid: true,
      reasons: []
    };

    // Check bounds
    for (const location of ship.locations) {
      const [row, col] = board.parseCoordinate(location);
      if (!board.isValidCoordinate(row, col)) {
        validationResult.isValid = false;
        validationResult.reasons.push(`Position ${location} is out of bounds`);
      }
    }

    // Check for overlaps
    for (const location of ship.locations) {
      const existingShip = board.getShipAt(location);
      if (existingShip) {
        validationResult.isValid = false;
        validationResult.reasons.push(`Position ${location} overlaps with ship ${existingShip.id}`);
      }
    }

    // Check ship length
    const maxLength = config.get('shipLength');
    if (ship.locations.length > maxLength) {
      validationResult.isValid = false;
      validationResult.reasons.push(`Ship length ${ship.locations.length} exceeds maximum ${maxLength}`);
    }

    return validationResult;
  }
}

module.exports = ShipFactory; 