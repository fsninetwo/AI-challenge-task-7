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

  /**
   * Generate all valid moves for the current game state
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of valid coordinates
   */
  getValidMoves(gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    const moves = [];
    
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const coordinate = `${row}${col}`;
        if (!gameState.cpuGuesses.has(coordinate)) {
          moves.push(coordinate);
        }
      }
    }
    
    return moves;
  }

  /**
   * Check if a coordinate is valid for the current game state
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if valid coordinate
   */
  isValidCoordinate(row, col, gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    return row >= 0 && row < boardSize && 
           col >= 0 && col < boardSize && 
           !gameState.cpuGuesses.has(`${row}${col}`);
  }
}

/**
 * Random strategy - Makes random moves across the board
 */
class RandomStrategy extends AIStrategy {
  makeMove(gameState) {
    const moves = this.getValidMoves(gameState);
    if (moves.length === 0) {
      throw new Error('No valid moves remaining');
    }
    
    const randomIndex = Math.floor(Math.random() * moves.length);
    return {
      coordinate: moves[randomIndex],
      mode: 'random',
      strategy: this.getName(),
      confidence: 0.1
    };
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
    const moves = this.getValidMoves(gameState);
    if (moves.length === 0) {
      throw new Error('No valid moves remaining');
    }
    
    const randomIndex = Math.floor(Math.random() * moves.length);
    const guess = moves[randomIndex];
    
    this.previousMoves.add(guess);
    
    return { 
      coordinate: guess, 
      mode: 'hunt',
      strategy: 'HuntStrategy',
      confidence: 0.1
    };
  }

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
  
  addTargets(row, col, gameState) {
    const adjacentCells = [
      { r: row - 1, c: col, direction: 'north' },
      { r: row + 1, c: col, direction: 'south' },
      { r: row, c: col - 1, direction: 'west' },
      { r: row, c: col + 1, direction: 'east' }
    ];
    
    adjacentCells
      .filter(({r, c}) => this.isValidCoordinate(r, c, gameState))
      .forEach(({r, c, direction}) => {
        const coord = `${r}${c}`;
        if (!this.targetQueue.some(target => target.coordinate === coord)) {
          let priority = 1;
          if (this.hitHistory.length >= 2) {
            const lastHits = this.hitHistory.slice(-2);
            const [row1, col1] = lastHits[0].coordinate.split('').map(Number);
            const [row2, col2] = lastHits[1].coordinate.split('').map(Number);
            
            if (row1 === row2 && r === row1) {
              priority = 3;
            }
            else if (col1 === col2 && c === col1) {
              priority = 3;
            }
          }
          
          this.targetQueue.push({
            coordinate: coord,
            direction,
            priority,
            addedAt: Date.now()
          });
        }
      });

    this.targetQueue.sort((a, b) => b.priority - a.priority);
  }
  
  makeMove(gameState) {
    if (this.targetQueue.length === 0) {
      const huntStrategy = new HuntStrategy();
      const move = huntStrategy.makeMove(gameState);
      return {
        ...move,
        mode: 'hunt',
        strategy: 'HuntStrategy'
      };
    }
    
    let target;
    do {
      target = this.targetQueue.shift();
      if (!target || gameState.cpuGuesses.has(target.coordinate)) {
        if (this.targetQueue.length === 0) {
          const huntStrategy = new HuntStrategy();
          const move = huntStrategy.makeMove(gameState);
          return {
            ...move,
            mode: 'hunt',
            strategy: 'HuntStrategy'
          };
        }
        continue;
      }
    } while (target && gameState.cpuGuesses.has(target.coordinate) && this.targetQueue.length > 0);
    
    if (!target) {
      const huntStrategy = new HuntStrategy();
      const move = huntStrategy.makeMove(gameState);
      return {
        ...move,
        mode: 'hunt',
        strategy: 'HuntStrategy'
      };
    }
    
    return { 
      coordinate: target.coordinate, 
      mode: 'target',
      strategy: 'TargetStrategy',
      direction: target.direction,
      confidence: 0.8
    };
  }

  updateStrategy(coordinate, wasHit, wasSunk) {
    if (wasHit && !wasSunk) {
      this.hitHistory.push({ coordinate, timestamp: Date.now() });
    }
    if (wasSunk) {
      this.targetQueue = [];
      this.hitHistory = [];
    }
  }

  prioritizeDirectionalTargets(row, col) {
    const [lastHitRow, lastHitCol] = this.hitHistory[this.hitHistory.length - 1].coordinate.split('').map(Number);
    
    if (row === lastHitRow) {
      this.targetQueue = this.targetQueue.filter(t => {
        const [tRow] = t.coordinate.split('').map(Number);
        return tRow === row;
      });
    }
    else if (col === lastHitCol) {
      this.targetQueue = this.targetQueue.filter(t => {
        const [_, tCol] = t.coordinate.split('').map(Number);
        return tCol === col;
      });
    }
  }

  reset() {
    this.targetQueue = [];
    this.hitHistory = [];
  }

  getState() {
    return {
      targetQueue: [...this.targetQueue],
      hitHistory: [...this.hitHistory]
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
    this.lastMove = null;
  }

  switchToHunt() {
    this.currentStrategy = this.huntStrategy;
  }

  switchToTarget(row, col, gameState) {
    this.currentStrategy = this.targetStrategy;
    this.targetStrategy.addTargets(row, col, gameState);
  }

  makeMove(gameState) {
    const move = this.currentStrategy.makeMove(gameState);
    this.lastMove = {
      coordinate: move.coordinate,
      wasHit: false,
      strategy: move.mode,
      executedAt: new Date()
    };
    return this.lastMove;
  }

  updateResult(coordinate, wasHit, wasSunk) {
    if (this.lastMove) {
      this.lastMove.wasHit = wasHit;
    }
    
    if (this.currentStrategy instanceof TargetStrategy) {
      this.currentStrategy.updateStrategy(coordinate, wasHit, wasSunk);
      if (wasSunk) {
        this.switchToHunt();
      }
    }
  }

  getMoveAnalysis() {
    return {
      coordinate: this.lastMove?.coordinate,
      wasHit: this.lastMove?.wasHit,
      strategy: this.lastMove?.strategy,
      executedAt: this.lastMove?.executedAt,
      aiState: {
        mode: this.lastMove?.strategy || 'hunt'
      }
    };
  }

  getStats() {
    return {
      mode: this.currentStrategy instanceof HuntStrategy ? 'hunt' : 'target',
      targetState: this.currentStrategy instanceof TargetStrategy ? this.currentStrategy.getState() : null
    };
  }

  reset() {
    this.huntStrategy.reset();
    this.targetStrategy.reset();
    this.currentStrategy = this.huntStrategy;
    this.lastMove = null;
  }
}

module.exports = {
  AIStrategy,
  RandomStrategy,
  HuntStrategy,
  TargetStrategy,
  AIContext
}; 