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
      turnsPlayed: 0
    };
  }
  
  update(event, data) {
    switch(event) {
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
  
  getStats() {
    return { ...this.stats };
  }
}

class EventEmitter {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  notify(event, data) {
    this.observers.forEach(observer => observer.update(event, data));
  }
}

module.exports = { Observer, GameStatsObserver, EventEmitter }; 