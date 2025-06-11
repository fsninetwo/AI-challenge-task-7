/**
 * Observers - Observer Pattern Implementation
 * 
 * Provides event-driven architecture for game events and statistics tracking.
 * Implements Observer pattern for loose coupling between game components.
 * 
 * @module Observers
 */

/**
 * Abstract base class for observers
 */
class Observer {
  /**
   * Update method called when an event occurs
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  update(event, data) {
    throw new Error('Observer must implement update method');
  }

  /**
   * Get observer name for debugging
   * @returns {string} Observer name
   */
  getName() {
    return this.constructor.name;
  }
}

/**
 * Observer for tracking game statistics
 */
class GameStatsObserver extends Observer {
  constructor() {
    super();
    this.stats = {
      playerHits: 0,
      playerMisses: 0,
      cpuHits: 0,
      cpuMisses: 0,
      turnsPlayed: 0,
      gameStartTime: null,
      gameEndTime: null,
      winner: null
    };
  }
  
  /**
   * Update statistics based on game events
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  update(event, data) {
    switch(event) {
      case 'gameStart':
        this.stats.gameStartTime = new Date();
        break;
      case 'gameEnd':
        this.stats.gameEndTime = new Date();
        this.stats.winner = data?.winner;
        break;
      case 'playerHit':
        this.stats.playerHits++;
        break;
      case 'playerMiss':
        this.stats.playerMisses++;
        break;
      case 'cpuHit':
        this.stats.cpuHits++;
        break;
      case 'cpuMiss':
        this.stats.cpuMisses++;
        break;
      case 'turnComplete':
        this.stats.turnsPlayed++;
        break;
    }
  }
  
  /**
   * Get current statistics
   * @returns {Object} Game statistics
   */
  getStats() {
    const totalPlayerMoves = this.stats.playerHits + this.stats.playerMisses;
    const totalCpuMoves = this.stats.cpuHits + this.stats.cpuMisses;
    const gameDuration = this.stats.gameEndTime && this.stats.gameStartTime 
      ? this.stats.gameEndTime - this.stats.gameStartTime 
      : null;

    return {
      ...this.stats,
      playerAccuracy: totalPlayerMoves > 0 ? (this.stats.playerHits / totalPlayerMoves * 100) : 0,
      cpuAccuracy: totalCpuMoves > 0 ? (this.stats.cpuHits / totalCpuMoves * 100) : 0,
      totalPlayerMoves,
      totalCpuMoves,
      gameDurationMs: gameDuration,
      gameDurationMinutes: gameDuration ? Math.round(gameDuration / 60000 * 100) / 100 : null
    };
  }

  /**
   * Reset statistics to initial state
   */
  reset() {
    this.stats = {
      playerHits: 0,
      playerMisses: 0,
      cpuHits: 0,
      cpuMisses: 0,
      turnsPlayed: 0,
      gameStartTime: null,
      gameEndTime: null,
      winner: null
    };
  }
}

/**
 * Observer for logging game events
 */
class GameLogObserver extends Observer {
  constructor() {
    super();
    this.logs = [];
    this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
  }

  /**
   * Update method to log game events
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  update(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      level: this.getLogLevel(event)
    };

    this.logs.push(logEntry);

    // Console output for important events
    if (this.shouldLog(logEntry.level)) {
      console.log(`[${logEntry.level}] ${logEntry.timestamp}: ${event}`, data || '');
    }

    // Trim logs if they get too large
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  /**
   * Determine log level for an event
   * @param {string} event - Event type
   * @returns {string} Log level
   */
  getLogLevel(event) {
    const logLevels = {
      'gameStart': 'INFO',
      'gameEnd': 'INFO',
      'error': 'ERROR',
      'shipSunk': 'INFO',
      'invalidMove': 'WARN',
      'playerHit': 'DEBUG',
      'playerMiss': 'DEBUG',
      'cpuHit': 'DEBUG',
      'cpuMiss': 'DEBUG'
    };

    return logLevels[event] || 'DEBUG';
  }

  /**
   * Check if event should be logged based on log level
   * @param {string} level - Log level to check
   * @returns {boolean} True if should log
   */
  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    const currentLevel = levels[this.logLevel] || 0;
    const eventLevel = levels[level] || 0;
    return eventLevel >= currentLevel;
  }

  /**
   * Get recent log entries
   * @param {number} count - Number of recent entries to return
   * @returns {Object[]} Array of log entries
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Set logging level
   * @param {string} level - New log level (DEBUG, INFO, WARN, ERROR)
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }
}

/**
 * Observer for tracking performance metrics
 */
class PerformanceObserver extends Observer {
  constructor() {
    super();
    this.metrics = {
      moveProcessingTimes: [],
      averageMoveTime: 0,
      slowestMove: 0,
      fastestMove: Infinity,
      memoryUsage: []
    };
    this.moveStartTime = null;
  }

  /**
   * Update performance metrics
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  update(event, data) {
    switch(event) {
      case 'moveStart':
        this.moveStartTime = performance.now();
        break;
      case 'moveComplete':
        this.recordMoveTime();
        this.recordMemoryUsage();
        break;
      case 'gameEnd':
        this.calculateAverages();
        break;
    }
  }

  /**
   * Record time taken for a move
   */
  recordMoveTime() {
    if (this.moveStartTime) {
      const moveTime = performance.now() - this.moveStartTime;
      this.metrics.moveProcessingTimes.push(moveTime);
      
      if (moveTime > this.metrics.slowestMove) {
        this.metrics.slowestMove = moveTime;
      }
      
      if (moveTime < this.metrics.fastestMove) {
        this.metrics.fastestMove = moveTime;
      }
      
      this.moveStartTime = null;
    }
  }

  /**
   * Record current memory usage
   */
  recordMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss
      });

      // Keep only last 100 memory readings
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
      }
    }
  }

  /**
   * Calculate performance averages
   */
  calculateAverages() {
    if (this.metrics.moveProcessingTimes.length > 0) {
      const total = this.metrics.moveProcessingTimes.reduce((sum, time) => sum + time, 0);
      this.metrics.averageMoveTime = total / this.metrics.moveProcessingTimes.length;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalMoves: this.metrics.moveProcessingTimes.length,
      currentMemoryMB: this.getCurrentMemoryUsage()
    };
  }

  /**
   * Get current memory usage in MB
   * @returns {number|null} Memory usage in MB or null if unavailable
   */
  getCurrentMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
    }
    return null;
  }
}

/**
 * Event emitter for managing observers
 */
class EventEmitter {
  constructor() {
    this.observers = [];
    this.eventHistory = [];
  }
  
  /**
   * Subscribe an observer to events
   * @param {Observer} observer - Observer to subscribe
   */
  subscribe(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }
  
  /**
   * Unsubscribe an observer from events
   * @param {Observer} observer - Observer to unsubscribe
   */
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  /**
   * Notify all observers of an event
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notify(event, data) {
    const eventData = {
      event,
      data,
      timestamp: new Date()
    };

    // Store event in history
    this.eventHistory.push(eventData);

    // Notify all observers
    this.observers.forEach(observer => {
      try {
        observer.update(event, data);
      } catch (error) {
        console.error(`Error in observer ${observer.getName()}:`, error);
      }
    });

    // Trim event history if it gets too large
    if (this.eventHistory.length > 500) {
      this.eventHistory = this.eventHistory.slice(-250);
    }
  }

  /**
   * Get all subscribed observers
   * @returns {Observer[]} Array of observers
   */
  getObservers() {
    return [...this.observers];
  }

  /**
   * Get recent event history
   * @param {number} count - Number of recent events to return
   * @returns {Object[]} Array of recent events
   */
  getEventHistory(count = 50) {
    return this.eventHistory.slice(-count);
  }

  /**
   * Clear all observers and event history
   */
  clear() {
    this.observers = [];
    this.eventHistory = [];
  }
}

module.exports = {
  Observer,
  GameStatsObserver,
  GameLogObserver,
  PerformanceObserver,
  EventEmitter
}; 