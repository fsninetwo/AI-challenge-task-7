/**
 * AI Strategy Module
 * 
 * Implements the Strategy pattern for AI behavior.
 * Provides different strategies for CPU moves.
 * 
 * @module AIStrategy
 */

const GameConfig = require('../config/GameConfig');

/**
 * Base AI strategy class
 */
class AIStrategy {
  constructor() {
    this.previousMoves = new Set();
  }

  makeMove(previousGuesses, playerBoard) {
    throw new Error('AI Strategy must implement makeMove method');
  }

  getName() {
    return 'AIStrategy';
  }

  reset() {
    this.previousMoves.clear();
  }
}

/**
 * Hunt strategy - random searching
 */
class HuntStrategy extends AIStrategy {
  getName() {
    return 'HuntStrategy';
  }

  makeMove(previousGuesses, playerBoard) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    let guess;

    do {
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      guess = `${row}${col}`;
    } while (previousGuesses.has(guess));

    this.previousMoves.add(guess);
    return {
      coordinate: guess,
      mode: 'hunt',
      strategy: this.getName(),
      confidence: 0.1
    };
  }
}

/**
 * Target strategy - focused targeting
 */
class TargetStrategy extends AIStrategy {
  constructor() {
    super();
    this.targetQueue = [];
    this.hitHistory = [];
  }

  getName() {
    return 'TargetStrategy';
  }

  addTargets(row, col, previousGuesses) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    const directions = [
      { row: -1, col: 0 }, // north
      { row: 1, col: 0 },  // south
      { row: 0, col: -1 }, // west
      { row: 0, col: 1 }   // east
    ];

    for (const dir of directions) {
      const newRow = row + dir.row;
      const newCol = col + dir.col;
      const coordinate = `${newRow}${newCol}`;

      if (this.isValidTarget(newRow, newCol, boardSize, previousGuesses)) {
        this.targetQueue.push({
          coordinate,
          direction: dir,
          confidence: 0.8
        });
      }
    }
  }

  isValidTarget(row, col, boardSize, previousGuesses) {
    return row >= 0 && row < boardSize && 
           col >= 0 && col < boardSize && 
           !previousGuesses.has(`${row}${col}`);
  }

  makeMove(previousGuesses, playerBoard) {
    if (this.targetQueue.length === 0) {
      const huntStrategy = new HuntStrategy();
      return huntStrategy.makeMove(previousGuesses, playerBoard);
    }

    const target = this.targetQueue.shift();
    this.previousMoves.add(target.coordinate);
    return {
      coordinate: target.coordinate,
      mode: 'target',
      strategy: this.getName(),
      confidence: target.confidence
    };
  }

  updateStrategy(coordinate, wasHit, wasSunk) {
    if (wasHit) {
      const [row, col] = coordinate.split('').map(Number);
      this.hitHistory.push({ coordinate, wasSunk });

      if (!wasSunk) {
        // Add adjacent targets if ship wasn't sunk
        this.addTargets(row, col, this.previousMoves);
      }
    }
  }

  reset() {
    super.reset();
    this.targetQueue = [];
    this.hitHistory = [];
  }
}

/**
 * AI Context - manages current strategy
 */
class AIContext {
  constructor() {
    this.currentStrategy = new HuntStrategy();
    this.moveHistory = [];
    this.performanceStats = {
      hits: 0,
      misses: 0,
      shipsFound: 0,
      shipsSunk: 0
    };
  }

  makeMove(previousGuesses, playerBoard) {
    const move = this.currentStrategy.makeMove(previousGuesses, playerBoard);
    this.moveHistory.push(move);
    return move;
  }

  updateResult(wasHit, coordinate, wasSunk = false) {
    if (wasHit) {
      this.performanceStats.hits++;
      if (wasSunk) {
        this.performanceStats.shipsSunk++;
      }
      if (!(this.currentStrategy instanceof TargetStrategy)) {
        this.switchToTarget();
      }
      this.currentStrategy.updateStrategy(coordinate, wasHit, wasSunk);
    } else {
      this.performanceStats.misses++;
      if (this.currentStrategy instanceof TargetStrategy && 
          this.currentStrategy.targetQueue.length === 0) {
        this.switchToHunt();
      }
    }
  }

  switchToHunt() {
    this.currentStrategy = new HuntStrategy();
  }

  switchToTarget() {
    this.currentStrategy = new TargetStrategy();
  }

  getStats() {
    const totalMoves = this.performanceStats.hits + this.performanceStats.misses;
    return {
      totalMoves,
      hits: this.performanceStats.hits,
      misses: this.performanceStats.misses,
      accuracy: totalMoves > 0 ? this.performanceStats.hits / totalMoves : 0,
      shipsFound: this.performanceStats.shipsFound,
      shipsSunk: this.performanceStats.shipsSunk,
      currentStrategy: this.currentStrategy.getName()
    };
  }

  reset() {
    this.currentStrategy = new HuntStrategy();
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