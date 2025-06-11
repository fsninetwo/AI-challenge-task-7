/**
 * GameConfig - Singleton Configuration Manager
 * 
 * Provides centralized configuration management for the Sea Battle game.
 * Implements Singleton pattern to ensure single source of truth.
 * 
 * @module GameConfig
 */

class GameConfig {
  constructor() {
    if (GameConfig.instance) {
      return GameConfig.instance;
    }
    
    this.settings = {
      boardSize: 10,
      numShips: 3,
      shipLength: 3,
      symbols: {
        water: '~',
        ship: 'S',
        hit: 'X',
        miss: 'O'
      },
      messages: {
        playerHit: 'PLAYER HIT!',
        playerMiss: 'PLAYER MISS.',
        cpuHit: 'CPU HIT at {coordinate}!',
        cpuMiss: 'CPU MISS at {coordinate}.',
        shipSunk: 'You sunk an enemy battleship!',
        cpuShipSunk: 'CPU sunk your battleship!',
        playerWin: '*** CONGRATULATIONS! You sunk all enemy battleships! ***',
        cpuWin: '*** GAME OVER! The CPU sunk all your battleships! ***',
        invalidInput: 'Oops, input must be exactly two digits (e.g., 00, 34, 98).',
        outOfBounds: 'Oops, please enter valid row and column numbers between 0 and {max}.',
        duplicateGuess: 'You already guessed that location!'
      }
    };
    
    // Make settings deeply immutable
    Object.freeze(this.settings.symbols);
    Object.freeze(this.settings.messages);
    Object.freeze(this.settings);
    
    GameConfig.instance = this;
    Object.freeze(this);
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    return this.settings[key];
  }
  
  /**
   * Get a localized message with parameter interpolation
   * @param {string} key - Message key
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Formatted message
   */
  getMessage(key, params = {}) {
    let message = this.settings.messages[key];
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
    return message;
  }
}

module.exports = GameConfig; 