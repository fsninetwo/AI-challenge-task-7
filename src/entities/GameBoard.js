/**
 * GameBoard Entity
 * 
 * Represents the game board with ship placement and visual representation.
 * Manages the grid state and provides methods for board manipulation.
 * 
 * @module GameBoard
 */

const GameConfig = require('../config/GameConfig');
const Ship = require('./Ship');

/**
 * GameBoard class representing the game board grid and ship management
 */
class GameBoard {
  /**
   * Create a new game board
   * @param {number} size - Board size (defaults to configuration value)
   */
  constructor(size) {
    const config = new GameConfig();
    this.size = size || config.get('boardSize');
    this.grid = this.initializeGrid();
    this.ships = [];
    this.misses = new Set();
    this.hits = new Set();
    this.hitCount = 0;
    this.missCount = 0;
    this.visibleShips = new Set();
  }

  /**
   * Initialize the game board grid with water symbols
   * @returns {string[][]} 2D array representing the board
   */
  initializeGrid() {
    const config = new GameConfig();
    const waterSymbol = config.get('symbols').water;
    return Array(this.size).fill(null).map(() => Array(this.size).fill(waterSymbol));
  }

  /**
   * Check if coordinates are within board bounds
   * @param {number|string} rowOrCoordinate - Row coordinate or coordinate string (e.g., '05')
   * @param {number} [col] - Column coordinate (optional if first param is coordinate string)
   * @returns {boolean} True if coordinates are valid
   */
  isValidCoordinate(rowOrCoordinate, col) {
    if (typeof rowOrCoordinate === 'string') {
      const { row, col } = this.parseCoordinate(rowOrCoordinate);
      return row !== null && col !== null;
    }
    const row = rowOrCoordinate;
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  /**
   * Place a ship on the board
   * @param {Ship} ship - Ship to place
   * @param {boolean} isVisible - Whether to show ship on grid (for player board)
   */
  placeShip(ship, isVisible = false) {
    const config = new GameConfig();
    if (!(ship instanceof Ship)) {
      ship = new Ship(ship.length || 3, ship.row, ship.col, ship.isHorizontal);
    }
    if (!this.canPlaceShip(ship)) {
      throw new Error('Invalid ship placement');
    }
    
    // Add ship to board
    const newShip = ship.clone();
    this.ships.push(newShip);
    
    // Mark ship on grid if visible
    if (isVisible) {
      this.visibleShips.add(newShip.id);
      const coords = newShip.getCoordinates();
      coords.forEach(coord => {
        const { row, col } = this.parseCoordinate(coord);
        if (row !== null && col !== null) {
          this.grid[row][col] = config.get('symbols').ship;
        }
      });
    }
  }

  canPlaceShip(ship) {
    if (!(ship instanceof Ship)) {
      ship = new Ship(ship.length || 3, ship.row, ship.col, ship.isHorizontal);
    }
    const coords = ship.getCoordinates();
    
    // Check if ship is within board boundaries
    for (const coord of coords) {
      const { row, col } = this.parseCoordinate(coord);
      if (row === null || col === null) {
        return false;
      }
    }

    // Check if ship overlaps with other ships or is too close
    for (const existingShip of this.ships) {
      const existingCoords = existingShip.getCoordinates();
      for (const coord of coords) {
        const { row, col } = this.parseCoordinate(coord);
        
        // Check surrounding cells (including diagonals)
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
              const adjacentCoord = this.formatCoordinate(r, c);
              if (existingCoords.includes(adjacentCoord)) {
                return false;
              }
            }
          }
        }
      }
    }

    // Check if ship extends beyond board boundaries
    if (ship.isHorizontal) {
      if (ship.col + ship.length > this.size) {
        return false;
      }
    } else {
      if (ship.row + ship.length > this.size) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark a coordinate as hit on the board
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   */
  markHit(row, col) {
    const config = new GameConfig();
    this.grid[row][col] = config.get('symbols').hit;
    this.hitCount++;
  }

  /**
   * Mark a coordinate as miss on the board
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   */
  markMiss(row, col) {
    const config = new GameConfig();
    this.grid[row][col] = config.get('symbols').miss;
    this.missCount++;
  }

  /**
   * Parse a coordinate string into row and column integers
   * @param {string} coordinate - Coordinate string (e.g., '05')
   * @returns {number[]} Array containing [row, col]
   */
  parseCoordinate(coordinate) {
    if (!coordinate || typeof coordinate !== 'string' || coordinate.length !== 2) {
      return { row: null, col: null };
    }
    const row = parseInt(coordinate[0]);
    const col = parseInt(coordinate[1]);
    if (isNaN(row) || isNaN(col) || 
        row < 0 || row >= this.size || 
        col < 0 || col >= this.size) {
      return { row: null, col: null };
    }
    return { row, col };
  }

  /**
   * Get display representation of the board
   * @returns {string[]} Array of strings representing board rows
   */
  display() {
    const header = '  ' + Array.from({length: this.size}, (_, i) => i).join(' ');
    const rows = this.grid.map((row, i) => `${i} ${row.join(' ')}`);
    return [header, ...rows];
  }
  
  /**
   * Find ship at specific coordinate
   * @param {string} coordinate - Coordinate to check
   * @returns {Ship|undefined} Ship at coordinate or undefined
   */
  getShipAt(coordinate) {
    return this.ships.find(ship => ship.getCoordinates().includes(coordinate)) || null;
  }

  /**
   * Get all ships on the board
   * @returns {Ship[]} Array of ships
   */
  getShips() {
    return [...this.ships];
  }

  /**
   * Get board statistics
   * @returns {Object} Statistics about the board state
   */
  getStats() {
    const totalShips = this.ships.length;
    const sunkShips = this.ships.filter(ship => ship.isSunk()).length;
    const totalHits = this.ships.reduce((acc, ship) => acc + ship.hits.size, 0);
    
    return {
      size: this.size,
      totalShips,
      sunkShips,
      remainingShips: totalShips - sunkShips,
      totalHits,
      totalMisses: this.missCount,
      accuracy: totalHits / (totalHits + this.missCount) * 100 || 0
    };
  }

  /**
   * Check if all ships on the board are sunk
   * @returns {boolean} True if all ships are sunk
   */
  allShipsSunk() {
    return this.ships.every(ship => ship.isSunk());
  }

  /**
   * Reset the board to initial state
   */
  reset() {
    this.grid = this.initializeGrid();
    this.ships = [];
    this.hits = new Set();
    this.misses = new Set();
    this.hitCount = 0;
    this.missCount = 0;
    this.visibleShips = new Set();
  }

  receiveAttack(coordinate) {
    const { row, col } = this.parseCoordinate(coordinate);
    if (row === null || col === null) {
      throw new Error('Invalid coordinate');
    }

    if (this.hits.has(coordinate) || this.misses.has(coordinate)) {
      throw new Error('Coordinate already attacked');
    }

    const ship = this.getShipAt(coordinate);
    if (ship) {
      ship.hit(coordinate);
      this.hits.add(coordinate);
      this.markHit(row, col);
      return true;
    } else {
      this.misses.add(coordinate);
      this.markMiss(row, col);
      return false;
    }
  }

  formatCoordinate(row, col) {
    return `${row}${col}`;
  }

  restoreState(state) {
    const config = new GameConfig();
    this.grid = state.boardState.map(row => [...row]);
    this.ships = state.ships.map(ship => ship.clone());
    this.hits = new Set([...state.hits]);
    this.misses = new Set([...state.misses]);
    this.hitCount = this.hits.size;
    this.missCount = this.misses.size;
    this.visibleShips = new Set([...state.visibleShips]);

    // Restore visible ships
    this.ships.forEach(ship => {
      if (this.visibleShips.has(ship.id)) {
        const coords = ship.getCoordinates();
        coords.forEach(coord => {
          const { row, col } = this.parseCoordinate(coord);
          if (row !== null && col !== null && !this.hits.has(coord)) {
            this.grid[row][col] = config.get('symbols').ship;
          }
        });
      }
    });
  }
}

module.exports = GameBoard; 