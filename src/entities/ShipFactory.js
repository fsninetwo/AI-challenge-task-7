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
  constructor() {
    this.config = new GameConfig();
  }

  /**
   * Create a ship from given locations (string coordinates)
   * @param {string[]} locations - Array of string coordinates like ['00', '01', '02']
   * @returns {Ship} New ship instance
   */
  createShip(locations) {
    if (!this.isValidPlacement(locations)) {
      throw new Error('Invalid ship placement');
    }
    return new Ship(locations);
  }

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
      const { row, col } = board.parseCoordinate(location);
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

  /**
   * Generate all ships for the game
   * @returns {Ship[]} Array of ships
   */
  generateShips() {
    const numShips = this.config.get('numShips');
    const shipLength = this.config.get('shipLength');
    const ships = [];

    for (let i = 0; i < numShips; i++) {
      const locations = this.generateShipLocations(shipLength);
      ships.push(this.createShip(locations));
    }

    return ships;
  }

  /**
   * Generate valid locations for a ship
   * @param {number} length - Length of ship
   * @returns {string[]} Array of valid locations
   */
  generateShipLocations(length) {
    const boardSize = this.config.get('boardSize');
    const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    let startRow, startCol;

    if (orientation === 'horizontal') {
      startRow = Math.floor(Math.random() * boardSize);
      startCol = Math.floor(Math.random() * (boardSize - length + 1));
      return Array.from({length}, (_, i) => `${startRow}${startCol + i}`);
    } else {
      startRow = Math.floor(Math.random() * (boardSize - length + 1));
      startCol = Math.floor(Math.random() * boardSize);
      return Array.from({length}, (_, i) => `${startRow + i}${startCol}`);
    }
  }

  /**
   * Check if ship placement is valid
   * @param {string[]} locations - Array of locations to check
   * @returns {boolean} True if placement is valid
   */
  isValidPlacement(locations) {
    const maxLength = this.config.get('shipLength');
    const boardSize = this.config.get('boardSize');

    // Check length
    if (locations.length > maxLength) {
      return false;
    }

    // Check bounds and format
    for (const loc of locations) {
      const row = parseInt(loc[0]);
      const col = parseInt(loc[1]);
      if (isNaN(row) || isNaN(col) || row >= boardSize || col >= boardSize || row < 0 || col < 0) {
        return false;
      }
    }

    // Check consecutive placement
    const rows = locations.map(loc => parseInt(loc[0]));
    const cols = locations.map(loc => parseInt(loc[1]));
    const isHorizontal = new Set(rows).size === 1;
    const isVertical = new Set(cols).size === 1;

    if (!isHorizontal && !isVertical) {
      return false;
    }

    if (isHorizontal) {
      cols.sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) {
        if (cols[i] !== cols[i - 1] + 1) {
          return false;
        }
      }
    }

    if (isVertical) {
      rows.sort((a, b) => a - b);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] !== rows[i - 1] + 1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if ship locations overlap with existing ships
   * @param {string[]} locations - Array of locations to check
   * @param {Ship[]} existingShips - Array of existing ships
   * @returns {boolean} True if there is overlap
   */
  hasOverlap(locations, existingShips) {
    const existingLocations = new Set(existingShips.flatMap(ship => ship.locations));
    return locations.some(loc => existingLocations.has(loc));
  }
}

module.exports = ShipFactory;