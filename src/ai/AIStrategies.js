/**
 * AI Strategy Layer - Strategy Pattern Implementation
 * 
 * Provides intelligent AI decision-making for the CPU opponent.
 * Implements Strategy pattern for pluggable AI algorithms.
 * 
 * @module AIStrategies
 */

const GameConfig = require('../config/GameConfig');

/**
 * Abstract base class for AI strategies
 */
class AIStrategy {
  makeMove(gameState) {
    throw new Error('AI Strategy must implement makeMove method');
  }
}

/**
 * Hunt strategy - Random search until a ship is found
 */
class HuntStrategy extends AIStrategy {
  makeMove(gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    let guess;
    
    do {
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      guess = `${row}${col}`;
    } while (gameState.cpuGuesses.has(guess));
    
    return { coordinate: guess, mode: 'hunt' };
  }
}

/**
 * Target strategy - Focused attack after finding a ship
 */
class TargetStrategy extends AIStrategy {
  constructor() {
    super();
    this.targetQueue = [];
  }
  
  addTargets(row, col, gameState) {
    const adjacentCells = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 }
    ];
    
    adjacentCells
      .filter(({r, c}) => this.isValidTarget(r, c, gameState))
      .map(({r, c}) => `${r}${c}`)
      .filter(coord => !this.targetQueue.includes(coord))
      .forEach(coord => this.targetQueue.push(coord));
  }
  
  isValidTarget(row, col, gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    return row >= 0 && row < boardSize && 
           col >= 0 && col < boardSize && 
           !gameState.cpuGuesses.has(`${row}${col}`);
  }
  
  makeMove(gameState) {
    if (this.targetQueue.length === 0) {
      return new HuntStrategy().makeMove(gameState);
    }
    
    let guess;
    do {
      guess = this.targetQueue.shift();
      if (this.targetQueue.length === 0) {
        return new HuntStrategy().makeMove(gameState);
      }
    } while (gameState.cpuGuesses.has(guess) && this.targetQueue.length > 0);
    
    return { coordinate: guess, mode: 'target' };
  }
  
  reset() {
    this.targetQueue = [];
  }
}

/**
 * AI Context - Manages strategy switching
 */
class AIContext {
  constructor() {
    this.huntStrategy = new HuntStrategy();
    this.targetStrategy = new TargetStrategy();
    this.currentStrategy = this.huntStrategy;
  }
  
  switchToHunt() {
    this.currentStrategy = this.huntStrategy;
    this.targetStrategy.reset();
  }
  
  switchToTarget(row, col, gameState) {
    this.currentStrategy = this.targetStrategy;
    this.targetStrategy.addTargets(row, col, gameState);
  }
  
  makeMove(gameState) {
    return this.currentStrategy.makeMove(gameState);
  }
}

module.exports = { AIStrategy, HuntStrategy, TargetStrategy, AIContext }; 