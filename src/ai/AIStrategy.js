/**
 * AI Strategy Layer - Strategy Pattern Implementation
 * 
 * Provides intelligent AI decision-making for the CPU opponent.
 * Implements Strategy pattern for pluggable AI algorithms.
 * 
 * @module AIStrategy
 */

const GameConfig = require('../config/GameConfig');

/**
 * Abstract base class for AI strategies
 */
class AIStrategy {
  /**
   * Make a move decision based on current game state
   * @param {Object} gameState - Current game state
   * @returns {Object} Move decision with coordinate and mode
   */
  makeMove(gameState) {
    throw new Error('AI Strategy must implement makeMove method');
  }

  /**
   * Get strategy name for debugging/logging
   * @returns {string} Strategy name
   */
  getName() {
    return this.constructor.name;
  }
}

/**
 * Hunt strategy - Random search until a ship is found
 */
class HuntStrategy extends AIStrategy {
  constructor() {
    super();
    this.previousMoves = new Set();
  }

  makeMove(gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    let guess;
    
    // Generate random guess that hasn't been made before
    do {
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      guess = `${row}${col}`;
    } while (gameState.cpuGuesses.has(guess));
    
    this.previousMoves.add(guess);
    
    return { 
      coordinate: guess, 
      mode: 'hunt',
      strategy: this.getName(),
      confidence: 0.1 // Low confidence for random moves
    };
  }

  /**
   * Reset strategy state
   */
  reset() {
    this.previousMoves.clear();
  }
}

/**
 * Target strategy - Focused attack after finding a ship
 */
class TargetStrategy extends AIStrategy {
  constructor() {
    super();
    this.targetQueue = [];
    this.hitHistory = [];
  }
  
  /**
   * Add adjacent targets after a successful hit
   * @param {number} row - Row of the hit
   * @param {number} col - Column of the hit
   * @param {Object} gameState - Current game state
   */
  addTargets(row, col, gameState) {
    const adjacentCells = [
      { r: row - 1, c: col, direction: 'north' },
      { r: row + 1, c: col, direction: 'south' },
      { r: row, c: col - 1, direction: 'west' },
      { r: row, c: col + 1, direction: 'east' }
    ];
    
    // Add valid adjacent cells to target queue
    adjacentCells
      .filter(({r, c}) => this.isValidTarget(r, c, gameState))
      .forEach(({r, c, direction}) => {
        const coord = `${r}${c}`;
        if (!this.targetQueue.some(target => target.coordinate === coord)) {
          this.targetQueue.push({
            coordinate: coord,
            direction,
            priority: 1,
            addedAt: Date.now()
          });
        }
      });

    // Sort by priority (higher priority first)
    this.targetQueue.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Check if a coordinate is a valid target
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if valid target
   */
  isValidTarget(row, col, gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    return row >= 0 && row < boardSize && 
           col >= 0 && col < boardSize && 
           !gameState.cpuGuesses.has(`${row}${col}`);
  }
  
  makeMove(gameState) {
    // If no targets in queue, fall back to hunt strategy
    if (this.targetQueue.length === 0) {
      return new HuntStrategy().makeMove(gameState);
    }
    
    // Get highest priority target
    let target;
    do {
      target = this.targetQueue.shift();
      if (this.targetQueue.length === 0 && gameState.cpuGuesses.has(target?.coordinate)) {
        return new HuntStrategy().makeMove(gameState);
      }
    } while (target && gameState.cpuGuesses.has(target.coordinate) && this.targetQueue.length > 0);
    
    return { 
      coordinate: target.coordinate, 
      mode: 'target',
      strategy: this.getName(),
      direction: target.direction,
      confidence: 0.8 // High confidence for targeted moves
    };
  }
  
  /**
   * Update strategy based on hit result
   * @param {string} coordinate - Coordinate that was attacked
   * @param {boolean} wasHit - Whether the attack was a hit
   * @param {boolean} wasSunk - Whether a ship was sunk
   */
  updateStrategy(coordinate, wasHit, wasSunk) {
    if (wasHit) {
      this.hitHistory.push({
        coordinate,
        timestamp: Date.now(),
        wasSunk
      });

      // If ship was sunk, clear targets and history
      if (wasSunk) {
        this.reset();
      } else {
        // Increase priority of targets in same direction as successful hits
        const [row, col] = coordinate.split('').map(Number);
        this.prioritizeDirectionalTargets(row, col);
      }
    }
  }

  /**
   * Increase priority of targets in promising directions
   * @param {number} row - Row of successful hit
   * @param {number} col - Column of successful hit
   */
  prioritizeDirectionalTargets(row, col) {
    // Analyze hit pattern to determine ship orientation
    if (this.hitHistory.length >= 2) {
      const lastHits = this.hitHistory.slice(-2);
      const [row1, col1] = lastHits[0].coordinate.split('').map(Number);
      const [row2, col2] = lastHits[1].coordinate.split('').map(Number);
      
      let orientation = null;
      if (row1 === row2) orientation = 'horizontal';
      if (col1 === col2) orientation = 'vertical';
      
      // Boost priority for targets that align with detected orientation
      this.targetQueue.forEach(target => {
        const [targetRow, targetCol] = target.coordinate.split('').map(Number);
        if (orientation === 'horizontal' && targetRow === row) {
          target.priority += 2;
        } else if (orientation === 'vertical' && targetCol === col) {
          target.priority += 2;
        }
      });
      
      // Re-sort queue
      this.targetQueue.sort((a, b) => b.priority - a.priority);
    }
  }
  
  /**
   * Reset strategy state
   */
  reset() {
    this.targetQueue = [];
    this.hitHistory = [];
  }

  /**
   * Get current strategy state for debugging
   * @returns {Object} Strategy state information
   */
  getState() {
    return {
      targetQueueLength: this.targetQueue.length,
      hitHistoryLength: this.hitHistory.length,
      nextTarget: this.targetQueue[0]?.coordinate,
      recentHits: this.hitHistory.slice(-3)
    };
  }
}

/**
 * AI Context - Manages strategy switching and state
 */
class AIContext {
  constructor() {
    this.huntStrategy = new HuntStrategy();
    this.targetStrategy = new TargetStrategy();
    this.currentStrategy = this.huntStrategy;
    this.moveHistory = [];
    this.performanceStats = {
      hits: 0,
      misses: 0,
      shipsFound: 0,
      shipsSunk: 0
    };
  }
  
  /**
   * Switch to hunt mode
   */
  switchToHunt() {
    this.currentStrategy = this.huntStrategy;
    this.targetStrategy.reset();
  }
  
  /**
   * Switch to target mode after a hit
   * @param {number} row - Row of the hit
   * @param {number} col - Column of the hit
   * @param {Object} gameState - Current game state
   */
  switchToTarget(row, col, gameState) {
    this.currentStrategy = this.targetStrategy;
    this.targetStrategy.addTargets(row, col, gameState);
  }
  
  /**
   * Make a move using current strategy
   * @param {Object} gameState - Current game state
   * @returns {Object} Move decision
   */
  makeMove(gameState) {
    const move = this.currentStrategy.makeMove(gameState);
    
    // Log move for analysis
    this.moveHistory.push({
      ...move,
      timestamp: Date.now(),
      gameState: {
        playerShips: gameState.playerNumShips,
        cpuShips: gameState.cpuNumShips
      }
    });
    
    return move;
  }

  /**
   * Update AI context based on move result
   * @param {string} coordinate - Coordinate that was attacked
   * @param {boolean} wasHit - Whether the attack was a hit
   * @param {boolean} wasSunk - Whether a ship was sunk
   */
  updateResult(coordinate, wasHit, wasSunk) {
    // Update performance stats
    if (wasHit) {
      this.performanceStats.hits++;
      if (wasSunk) {
        this.performanceStats.shipsSunk++;
      }
    } else {
      this.performanceStats.misses++;
    }

    // Update current strategy
    if (this.currentStrategy instanceof TargetStrategy) {
      this.currentStrategy.updateStrategy(coordinate, wasHit, wasSunk);
    }

    // Update last move result
    if (this.moveHistory.length > 0) {
      const lastMove = this.moveHistory[this.moveHistory.length - 1];
      lastMove.result = { wasHit, wasSunk };
    }
  }

  /**
   * Get AI performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const totalMoves = this.performanceStats.hits + this.performanceStats.misses;
    return {
      ...this.performanceStats,
      totalMoves,
      accuracy: totalMoves > 0 ? (this.performanceStats.hits / totalMoves * 100) : 0,
      currentStrategy: this.currentStrategy.getName(),
      moveHistory: this.moveHistory.slice(-10) // Last 10 moves
    };
  }

  /**
   * Reset AI context to initial state
   */
  reset() {
    this.huntStrategy.reset();
    this.targetStrategy.reset();
    this.currentStrategy = this.huntStrategy;
    this.moveHistory = [];
    this.performanceStats = {
      hits: 0,
      misses: 0,
      shipsFound: 0,
      shipsSunk: 0
    };
  }
}

module.exports = {
  AIStrategy,
  HuntStrategy,
  TargetStrategy,
  AIContext
}; 