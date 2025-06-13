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
      totalPlayerMoves: 0,
      totalCpuMoves: 0,
      turnsPlayed: 0,
      playerAccuracy: 0,
      cpuAccuracy: 0,
      gameStartTime: null,
      gameEndTime: null,
      gameDurationMs: null,
      gameDurationMinutes: null,
      winner: null
    };
  }
  
  update(event, data) {
    switch (event) {
      case 'gameStart':
        this.stats.gameStartTime = new Date();
        break;
      case 'gameOver':
        this.stats.gameEndTime = new Date();
        this.stats.gameDurationMs = this.stats.gameEndTime.getTime() - this.stats.gameStartTime.getTime();
        this.stats.gameDurationMinutes = this.stats.gameDurationMs / 60000;
        this.stats.winner = data.winner;
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
      gameStartTime: null,
      gameEndTime: null,
      gameDurationMs: null,
      gameDurationMinutes: null,
      winner: null
    };
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