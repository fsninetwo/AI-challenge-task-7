/**
 * Ship Entity
 * 
 * Represents a ship in the Sea Battle game with hit tracking and status management.
 * Encapsulates ship-specific behavior and state.
 * 
 * @module Ship
 */

/**
 * Ship class representing a battleship with location and hit tracking
 */
class Ship {
  /**
   * Create a new ship
   * @param {string[]|number} locations - Array of locations or ship length
   * @param {number} [row] - Row position of the ship (if length provided)
   * @param {number} [col] - Column position of the ship (if length provided)
   * @param {boolean} [isHorizontal] - Whether the ship is horizontal (if length provided)
   */
  constructor(locations, row, col, isHorizontal) {
    this.hits = new Set();
    this.createdAt = new Date();
    this.id = Math.random().toString(36).substr(2, 9);

    if (Array.isArray(locations)) {
      this.locations = [...locations];
      this.length = locations.length;
    } else {
      this.length = locations;
      this.row = row;
      this.col = col;
      this.isHorizontal = isHorizontal;
      this.locations = this.calculateCoordinates();
    }
  }

  calculateCoordinates() {
    const coords = [];
    for (let i = 0; i < this.length; i++) {
      if (this.isHorizontal) {
        coords.push(`${this.row}${this.col + i}`);
      } else {
        coords.push(`${this.row + i}${this.col}`);
      }
    }
    return coords;
  }

  /**
   * Get ship coordinates
   * @returns {string[]} Array of coordinate strings (e.g., ['00', '01', '02'])
   */
  getCoordinates() {
    return [...this.locations];
  }

  /**
   * Attempt to hit the ship at a specific coordinate
   * @param {string} coordinate - Coordinate to hit (e.g., '05')
   * @returns {boolean} True if hit was successful, false otherwise
   */
  hit(coordinate) {
    if (this.locations.includes(coordinate)) {
      this.hits.add(coordinate);
      return true;
    }
    return false;
  }

  /**
   * Check if a coordinate has already been hit on this ship
   * @param {string} coordinate - Coordinate to check
   * @returns {boolean} True if coordinate has been hit
   */
  isHit(coordinate) {
    return this.hits.has(coordinate);
  }

  /**
   * Check if the ship is completely sunk
   * @returns {boolean} True if all ship locations have been hit
   */
  isSunk() {
    return this.hits.size === this.length;
  }

  /**
   * Check if the coordinate is valid for this ship
   * @param {string} coordinate - Coordinate to check
   * @returns {boolean} True if the coordinate is valid for this ship
   */
  isValidCoordinate(coordinate) {
    return this.locations.includes(coordinate);
  }

  /**
   * Get comprehensive status information for the ship
   * @returns {Object} Ship status including ID, locations, hits, and statistics
   */
  getStatus() {
    return {
      id: this.id,
      locations: [...this.locations],
      hits: Array.from(this.hits),
      isSunk: this.isSunk(),
      hitPercentage: (this.hits.size / this.locations.length) * 100,
      remainingHits: this.locations.length - this.hits.size,
      createdAt: this.createdAt
    };
  }

  /**
   * Get ship length
   * @returns {number} Number of coordinates the ship occupies
   */
  getLength() {
    return this.locations.length;
  }

  /**
   * Get unhit locations
   * @returns {string[]} Array of coordinates that haven't been hit
   */
  getUnhitLocations() {
    return this.locations.filter(location => !this.hits.has(location));
  }

  clone() {
    const cloned = new Ship(this.length, this.row, this.col, this.isHorizontal);
    cloned.id = this.id;
    cloned.hits = new Set([...this.hits]);
    cloned.createdAt = new Date(this.createdAt);
    cloned.locations = [...this.locations];
    return cloned;
  }
}

module.exports = Ship; 