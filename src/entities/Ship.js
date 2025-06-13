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
   * @param {string[]} locations - Array of coordinate strings (e.g., ['00', '01', '02'])
   */
  constructor(locations = []) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.locations = locations;
    this.hits = new Set();
    this.createdAt = new Date();
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
    return this.locations.every(location => this.hits.has(location));
  }
  
  /**
   * Get comprehensive status information for the ship
   * @returns {Object} Ship status including ID, locations, hits, and statistics
   */
  getStatus() {
    return {
      id: this.id,
      locations: this.locations,
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
}

module.exports = Ship; 