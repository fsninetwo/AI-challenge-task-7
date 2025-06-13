/**
 * Game Observers - Observer Pattern Implementation
 * 
 * Provides event-driven architecture for game events, statistics tracking,
 * logging, and performance monitoring.
 * 
 * @module GameObservers
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
    this.reset();
  }
  
  update(event, data) {
    switch (event) {
      case 'gameStart':
        this.stats.gameStartTime = new Date();
        break;
      case 'gameEnd':
      case 'gameOver':
        this.stats.gameEndTime = new Date();
        this.stats.gameDurationMs = this.stats.gameEndTime.getTime() - this.stats.gameStartTime.getTime();
        this.stats.gameDurationMinutes = Math.round(this.stats.gameDurationMs / 60000 * 100) / 100;
        this.stats.winner = data?.winner;
        break;
      case 'playerHit':
        this.stats.playerHits++;
        this.stats.totalPlayerMoves++;
        this.stats.turnsPlayed++;
        this.updateAccuracy();
        break;
      case 'playerMiss':
        this.stats.playerMisses++;
        this.stats.totalPlayerMoves++;
        this.stats.turnsPlayed++;
        this.updateAccuracy();
        break;
      case 'cpuHit':
        this.stats.cpuHits++;
        this.stats.totalCpuMoves++;
        this.stats.turnsPlayed++;
        this.updateAccuracy();
        break;
      case 'cpuMiss':
        this.stats.cpuMisses++;
        this.stats.totalCpuMoves++;
        this.stats.turnsPlayed++;
        this.updateAccuracy();
        break;
      case 'shipSunk':
        if (data?.player === 'player') {
          this.stats.playerShipsSunk++;
        } else {
          this.stats.cpuShipsSunk++;
        }
        break;
    }
  }
  
  updateAccuracy() {
    if (this.stats.totalPlayerMoves > 0) {
      this.stats.playerAccuracy = Number(((this.stats.playerHits / this.stats.totalPlayerMoves) * 100).toFixed(2));
    }
    if (this.stats.totalCpuMoves > 0) {
      this.stats.cpuAccuracy = Number(((this.stats.cpuHits / this.stats.totalCpuMoves) * 100).toFixed(2));
    }
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  reset() {
    this.stats = {
      playerHits: 0,
      playerMisses: 0,
      cpuHits: 0,
      cpuMisses: 0,
      totalPlayerMoves: 0,
      totalCpuMoves: 0,
      turnsPlayed: 0,
      playerAccuracy: 0,
      cpuAccuracy: 0,
      playerShipsSunk: 0,
      cpuShipsSunk: 0,
      gameStartTime: null,
      gameEndTime: null,
      gameDurationMs: null,
      gameDurationMinutes: null,
      winner: null
    };
  }
}

/**
 * Observer for logging game events
 */
class GameLogObserver extends Observer {
  constructor(options = {}) {
    super();
    this.logs = [];
    this.logLevel = options.logLevel || 'INFO';
    this.maxLogs = options.maxLogs || 1000;
    this.trimSize = Math.min(options.trimSize || 500, this.maxLogs);
  }

  update(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      level: this.getLogLevel(event)
    };

    this.logs.push(logEntry);

    if (this.shouldLog(logEntry.level)) {
      console.log(`[${logEntry.level}] ${logEntry.timestamp}: ${event}`, data || '');
    }

    // Trim logs if they get too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.trimSize);
    }
  }

  getLogLevel(event) {
    const logLevels = {
      'gameStart': 'INFO',
      'gameEnd': 'INFO',
      'gameOver': 'INFO',
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

  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    const currentLevel = levels[this.logLevel] || 0;
    const eventLevel = levels[level] || 0;
    return eventLevel >= currentLevel;
  }

  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  setLogLevel(level) {
    if (['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
      this.logLevel = level;
    }
  }

  clearLogs() {
    this.logs = [];
  }
}

/**
 * Observer for monitoring game performance
 */
class PerformanceObserver extends Observer {
  constructor() {
    super();
    this.moveStartTime = null;
    this.moveTimes = [];
    this.memoryUsage = [];
    this.maxSamples = 100;
  }

  update(event, data) {
    switch (event) {
      case 'moveStart':
        this.recordMoveStart();
        break;
      case 'moveEnd':
        this.recordMoveEnd();
        break;
      case 'turnComplete':
        this.recordMemoryUsage();
        break;
    }
  }

  recordMoveStart() {
    this.moveStartTime = process.hrtime();
  }

  recordMoveEnd() {
    if (this.moveStartTime) {
      const [seconds, nanoseconds] = process.hrtime(this.moveStartTime);
      const milliseconds = seconds * 1000 + nanoseconds / 1e6;
      
      this.moveTimes.push(milliseconds);
      if (this.moveTimes.length > this.maxSamples) {
        this.moveTimes.shift();
      }
      
      this.moveStartTime = null;
    }
  }

  recordMemoryUsage() {
    const usage = this.getCurrentMemoryUsage();
    this.memoryUsage.push(usage);
    if (this.memoryUsage.length > this.maxSamples) {
      this.memoryUsage.shift();
    }
  }

  getMetrics() {
    const moveTimeStats = this.calculateStats(this.moveTimes);
    const memoryStats = this.calculateStats(this.memoryUsage.map(u => u.heapUsed));

    return {
      moves: {
        average: moveTimeStats.average,
        min: moveTimeStats.min,
        max: moveTimeStats.max
      },
      memory: {
        average: memoryStats.average,
        min: memoryStats.min,
        max: memoryStats.max,
        current: this.getCurrentMemoryUsage()
      }
    };
  }

  calculateStats(values) {
    if (values.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      average: Math.round(sum / values.length * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      timestamp: Date.now()
    };
  }

  reset() {
    this.moveStartTime = null;
    this.moveTimes = [];
    this.memoryUsage = [];
  }
}

/**
 * Event emitter for managing observers
 */
class EventEmitter {
  constructor() {
    this.observers = new Map();
    this.eventHistory = [];
    this.maxHistory = 1000;
  }
  
  subscribe(observer, events = null) {
    if (events) {
      events.forEach(event => {
        if (!this.observers.has(event)) {
          this.observers.set(event, new Set());
        }
        this.observers.get(event).add(observer);
      });
    } else {
      if (!this.observers.has('all')) {
        this.observers.set('all', new Set());
      }
      this.observers.get('all').add(observer);
    }
  }
  
  unsubscribe(observer, events = null) {
    if (events) {
      events.forEach(event => {
        const observers = this.observers.get(event);
        if (observers) {
          observers.delete(observer);
        }
      });
    } else {
      this.observers.forEach(observers => observers.delete(observer));
    }
  }
  
  notify(event, data) {
    // Record event in history
    this.eventHistory.push({
      timestamp: Date.now(),
      event,
      data
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    // Notify specific event observers
    const eventObservers = this.observers.get(event);
    if (eventObservers) {
      eventObservers.forEach(observer => observer.update(event, data));
    }

    // Notify general observers
    const allObservers = this.observers.get('all');
    if (allObservers) {
      allObservers.forEach(observer => observer.update(event, data));
    }
  }

  getObservers(event = null) {
    if (event) {
      return Array.from(this.observers.get(event) || []);
    }
    return Array.from(this.observers.values()).flatMap(set => Array.from(set));
  }

  getEventHistory(count = 50) {
    return this.eventHistory.slice(-count);
  }

  clear() {
    this.observers.clear();
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