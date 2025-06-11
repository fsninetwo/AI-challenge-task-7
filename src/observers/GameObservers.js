/**
 * Game Observers - Observer Pattern Implementation
 * 
 * @module GameObservers
 */

class Observer {
  update(event, data) {
    throw new Error('Observer must implement update method');
  }
}

class GameStatsObserver extends Observer {
  constructor() {
    super();
    this.stats = {
      playerHits: 0,
      playerMisses: 0,
      cpuHits: 0,
      cpuMisses: 0,
      turnsPlayed: 0,
      totalEvents: 0
    };
  }
  
  update(event, data) {
    this.stats.totalEvents++;
    switch(event) {
      case 'player-hit':
      case 'playerHit':
        this.stats.playerHits++;
        break;
      case 'player-miss':
      case 'playerMiss':
        this.stats.playerMisses++;
        break;
      case 'cpu-hit':
      case 'cpuHit':
        this.stats.cpuHits++;
        break;
      case 'cpu-miss':
      case 'cpuMiss':
        this.stats.cpuMisses++;
        break;
      case 'turnComplete':
        this.stats.turnsPlayed++;
        break;
    }
  }
  
  // Alias method for tests
  onEvent(event) {
    this.update(event.type, event);
  }
  
  getStats() {
    const stats = { ...this.stats };
    
    // Calculate accuracy
    const playerTotal = this.stats.playerHits + this.stats.playerMisses;
    const cpuTotal = this.stats.cpuHits + this.stats.cpuMisses;
    
    stats.playerAccuracy = playerTotal > 0 ? (this.stats.playerHits / playerTotal) * 100 : 0;
    stats.cpuAccuracy = cpuTotal > 0 ? (this.stats.cpuHits / cpuTotal) * 100 : 0;
    
    return stats;
  }
  
  getAccuracy(player) {
    if (player === 'player') {
      const total = this.stats.playerHits + this.stats.playerMisses;
      return total > 0 ? this.stats.playerHits / total : 0;
    } else if (player === 'cpu') {
      const total = this.stats.cpuHits + this.stats.cpuMisses;
      return total > 0 ? this.stats.cpuHits / total : 0;
    }
    return 0;
  }
}

class EventEmitter {
  constructor() {
    this.observers = [];
    this.listeners = new Map();
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  notify(event, data) {
    this.observers.forEach(observer => observer.update(event, data));
    
    // Also notify listeners
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
  
  // Methods expected by tests
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    this.notify(event, data);
  }
}

module.exports = { Observer, GameStatsObserver, EventEmitter }; 