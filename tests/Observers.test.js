/**
 * Observers Tests - Comprehensive coverage for Observer module
 * 
 * @module tests/Observers
 */

const {
  Observer,
  GameStatsObserver,
  GameLogObserver,
  PerformanceObserver,
  EventEmitter
} = require('../src/observers/Observers');

describe('Observers', () => {
  describe('Observer Base Class', () => {
    test('should throw error when update is not implemented', () => {
      const observer = new Observer();
      expect(() => observer.update('test', {})).toThrow('Observer must implement update method');
    });

    test('should return correct name', () => {
      const observer = new Observer();
      expect(observer.getName()).toBe('Observer');
    });
  });

  describe('GameStatsObserver', () => {
    let statsObserver;

    beforeEach(() => {
      statsObserver = new GameStatsObserver();
    });

    test('should initialize with default stats', () => {
      const stats = statsObserver.getStats();
      expect(stats.playerHits).toBe(0);
      expect(stats.playerMisses).toBe(0);
      expect(stats.cpuHits).toBe(0);
      expect(stats.cpuMisses).toBe(0);
      expect(stats.turnsPlayed).toBe(0);
    });

    test('should track game events', () => {
      statsObserver.update('gameStart');
      expect(statsObserver.stats.gameStartTime).toBeInstanceOf(Date);

      statsObserver.update('playerHit');
      expect(statsObserver.stats.playerHits).toBe(1);

      statsObserver.update('cpuMiss');
      expect(statsObserver.stats.cpuMisses).toBe(1);
    });

    test('should calculate accuracy', () => {
      statsObserver.update('playerHit');
      statsObserver.update('playerMiss');
      
      const stats = statsObserver.getStats();
      expect(stats.playerAccuracy).toBe(50);
    });

    test('should reset stats', () => {
      statsObserver.update('playerHit');
      statsObserver.reset();
      
      const stats = statsObserver.getStats();
      expect(stats.playerHits).toBe(0);
    });
  });

  describe('GameLogObserver', () => {
    let logObserver;

    beforeEach(() => {
      logObserver = new GameLogObserver();
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    test('should log events', () => {
      logObserver.update('gameStart', { data: 'test' });
      
      expect(logObserver.logs.length).toBe(1);
      expect(logObserver.logs[0].event).toBe('gameStart');
    });

    test('should determine log levels', () => {
      expect(logObserver.getLogLevel('gameStart')).toBe('INFO');
      expect(logObserver.getLogLevel('error')).toBe('ERROR');
    });

    test('should filter by log level', () => {
      logObserver.setLogLevel('ERROR');
      expect(logObserver.shouldLog('DEBUG')).toBe(false);
      expect(logObserver.shouldLog('ERROR')).toBe(true);
    });
  });

  describe('PerformanceObserver', () => {
    let perfObserver;

    beforeEach(() => {
      perfObserver = new PerformanceObserver();
      global.performance = { now: jest.fn() };
    });

    afterEach(() => {
      delete global.performance;
    });

    test('should track move timing', () => {
      performance.now.mockReturnValueOnce(100).mockReturnValueOnce(150);
      
      perfObserver.update('moveStart');
      perfObserver.update('moveComplete');
      
      expect(perfObserver.metrics.moveProcessingTimes).toContain(50);
    });

    test('should calculate averages', () => {
      perfObserver.metrics.moveProcessingTimes = [10, 20, 30];
      perfObserver.update('gameEnd');
      
      expect(perfObserver.metrics.averageMoveTime).toBe(20);
    });
  });

  describe('EventEmitter', () => {
    let emitter;
    let mockObserver;

    beforeEach(() => {
      emitter = new EventEmitter();
      mockObserver = {
        update: jest.fn(),
        getName: () => 'MockObserver'
      };
    });

    test('should manage observers', () => {
      emitter.subscribe(mockObserver);
      expect(emitter.getObservers()).toContain(mockObserver);
      
      emitter.unsubscribe(mockObserver);
      expect(emitter.getObservers()).not.toContain(mockObserver);
    });

    test('should notify observers', () => {
      emitter.subscribe(mockObserver);
      emitter.notify('testEvent', { data: 'test' });
      
      expect(mockObserver.update).toHaveBeenCalledWith('testEvent', { data: 'test' });
    });

    test('should store event history', () => {
      emitter.notify('event1');
      emitter.notify('event2');
      
      expect(emitter.eventHistory.length).toBe(2);
    });
  });
}); 