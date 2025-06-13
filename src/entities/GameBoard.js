/**
 * GameBoard Entity
 * 
 * Represents the game board with ship placement and visual representation.
 * Manages the grid state and provides methods for board manipulation.
 * 
 * @module GameBoard
 */

const GameConfig = require('../config/GameConfig');

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
    this.hitCount = 0;
    this.missCount = 0;
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
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {boolean} True if coordinates are valid
   */
  isValidCoordinate(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  /**
   * Place a ship on the board
   * @param {Ship} ship - Ship to place
   * @param {boolean} isVisible - Whether to show ship on grid (for player board)
   */
  placeShip(ship, isVisible = false) {
    const config = new GameConfig();
    this.ships.push(ship);
    
    if (isVisible) {
      ship.locations.forEach(location => {
        const [row, col] = this.parseCoordinate(location);
        this.grid[row][col] = config.get('symbols').ship;
      });
    }
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
    return [parseInt(coordinate[0]), parseInt(coordinate[1])];
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
    return this.ships.find(ship => ship.locations.includes(coordinate));
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
  areAllShipsSunk() {
    return this.ships.every(ship => ship.isSunk());
  }

  /**
   * Reset the board to initial state
   */
  reset() {
    this.grid = this.initializeGrid();
    this.ships = [];
    this.hitCount = 0;
    this.missCount = 0;
  }
}

module.exports = GameBoard; 