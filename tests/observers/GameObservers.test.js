const {
  Observer,
  GameStatsObserver,
  GameLogObserver,
  PerformanceObserver,
  EventEmitter
} = require('../../src/observers/GameObservers');

describe('Observer Pattern Implementation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Base Observer', () => {
    it('should require update method implementation', () => {
      const observer = new Observer();
      expect(() => observer.update('test', {})).toThrow('Observer must implement update method');
    });

    it('should return class name from getName', () => {
      class TestObserver extends Observer {
        update() {}
      }
      const observer = new TestObserver();
      expect(observer.getName()).toBe('TestObserver');
    });
  });

  describe('GameStatsObserver', () => {
    let statsObserver;

    beforeEach(() => {
      statsObserver = new GameStatsObserver();
    });

    it('should initialize with default values', () => {
      const stats = statsObserver.getStats();
      expect(stats).toEqual({
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
      });
    });

    it('should track game start and end times', () => {
      statsObserver.update('gameStart');
      expect(statsObserver.getStats().gameStartTime).toBeInstanceOf(Date);

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      statsObserver.update('gameEnd', { winner: 'player' });
      const stats = statsObserver.getStats();
      expect(stats.gameEndTime).toBeInstanceOf(Date);
      expect(stats.gameDurationMs).toBe(1000);
      expect(stats.gameDurationMinutes).toBe(0.02);
      expect(stats.winner).toBe('player');
    });

    it('should calculate player statistics correctly', () => {
      statsObserver.update('playerHit');
      statsObserver.update('playerHit');
      statsObserver.update('playerMiss');

      const stats = statsObserver.getStats();
      expect(stats.playerHits).toBe(2);
      expect(stats.playerMisses).toBe(1);
      expect(stats.totalPlayerMoves).toBe(3);
      expect(stats.playerAccuracy).toBe(66.67);
    });

    it('should calculate CPU statistics correctly', () => {
      statsObserver.update('cpuHit');
      statsObserver.update('cpuMiss');
      statsObserver.update('cpuMiss');

      const stats = statsObserver.getStats();
      expect(stats.cpuHits).toBe(1);
      expect(stats.cpuMisses).toBe(2);
      expect(stats.totalCpuMoves).toBe(3);
      expect(stats.cpuAccuracy).toBe(33.33);
    });

    it('should track ships sunk', () => {
      statsObserver.update('shipSunk', { player: 'player' });
      statsObserver.update('shipSunk', { player: 'cpu' });
      statsObserver.update('shipSunk', { player: 'player' });

      const stats = statsObserver.getStats();
      expect(stats.playerShipsSunk).toBe(2);
      expect(stats.cpuShipsSunk).toBe(1);
    });

    it('should reset statistics', () => {
      statsObserver.update('playerHit');
      statsObserver.update('cpuHit');
      statsObserver.update('shipSunk', { player: 'player' });
      
      statsObserver.reset();
      expect(statsObserver.getStats()).toEqual({
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
      });
    });
  });

  describe('GameLogObserver', () => {
    let logObserver;
    let consoleSpy;

    beforeEach(() => {
      logObserver = new GameLogObserver();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should initialize with default options', () => {
      expect(logObserver.logLevel).toBe('INFO');
      expect(logObserver.maxLogs).toBe(1000);
      expect(logObserver.trimSize).toBe(500);
    });

    it('should accept custom options', () => {
      const custom = new GameLogObserver({
        logLevel: 'DEBUG',
        maxLogs: 100,
        trimSize: 50
      });
      expect(custom.logLevel).toBe('DEBUG');
      expect(custom.maxLogs).toBe(100);
      expect(custom.trimSize).toBe(50);
    });

    it('should log events with correct levels', () => {
      const events = [
        { event: 'gameStart', expectedLevel: 'INFO' },
        { event: 'error', expectedLevel: 'ERROR' },
        { event: 'invalidMove', expectedLevel: 'WARN' },
        { event: 'playerHit', expectedLevel: 'DEBUG' },
        { event: 'unknown', expectedLevel: 'DEBUG' }
      ];

      events.forEach(({ event, expectedLevel }) => {
        logObserver.update(event, { test: true });
        const lastLog = logObserver.getRecentLogs(1)[0];
        expect(lastLog.level).toBe(expectedLevel);
        expect(lastLog.event).toBe(event);
      });
    });

    it('should respect log level filtering', () => {
      logObserver.setLogLevel('WARN');
      logObserver.update('gameStart', {}); // INFO - should not log
      logObserver.update('error', {}); // ERROR - should log
      logObserver.update('invalidMove', {}); // WARN - should log
      logObserver.update('playerHit', {}); // DEBUG - should not log

      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should trim logs when exceeding maxLogs', () => {
      const custom = new GameLogObserver({
        maxLogs: 3,
        trimSize: 3
      });

      for (let i = 0; i < 5; i++) {
        custom.update('test', { id: i });
      }

      const logs = custom.getRecentLogs(10);
      expect(logs).toHaveLength(3);
      expect(logs[0].data.id).toBe(2);
      expect(logs[1].data.id).toBe(3);
      expect(logs[2].data.id).toBe(4);
    });

    it('should clear logs', () => {
      logObserver.update('test', {});
      logObserver.update('test', {});
      expect(logObserver.getRecentLogs()).toHaveLength(2);

      logObserver.clearLogs();
      expect(logObserver.getRecentLogs()).toHaveLength(0);
    });
  });

  describe('PerformanceObserver', () => {
    let perfObserver;

    beforeEach(() => {
      perfObserver = new PerformanceObserver();
    });

    it('should track move timing', () => {
      perfObserver.update('moveStart');
      jest.advanceTimersByTime(100);
      perfObserver.update('moveEnd');

      const metrics = perfObserver.getMetrics();
      expect(metrics.moves.average).toBeGreaterThan(0);
      expect(metrics.moves.min).toBeLessThanOrEqual(metrics.moves.max);
    });

    it('should track memory usage', () => {
      perfObserver.update('turnComplete');
      perfObserver.update('turnComplete');

      const metrics = perfObserver.getMetrics();
      expect(metrics.memory.current).toBeDefined();
      expect(metrics.memory.average).toBeGreaterThan(0);
      expect(metrics.memory.min).toBeLessThanOrEqual(metrics.memory.max);
    });

    it('should limit sample size', () => {
      for (let i = 0; i < 150; i++) {
        perfObserver.update('moveStart');
        perfObserver.update('moveEnd');
      }

      expect(perfObserver.moveTimes.length).toBeLessThanOrEqual(perfObserver.maxSamples);
    });

    it('should reset metrics', () => {
      perfObserver.update('moveStart');
      perfObserver.update('moveEnd');
      perfObserver.update('turnComplete');

      perfObserver.reset();
      expect(perfObserver.moveStartTime).toBeNull();
      expect(perfObserver.moveTimes).toHaveLength(0);
      expect(perfObserver.memoryUsage).toHaveLength(0);
    });
  });

  describe('EventEmitter', () => {
    let emitter;
    let observer1;
    let observer2;

    beforeEach(() => {
      emitter = new EventEmitter();
      observer1 = { update: jest.fn() };
      observer2 = { update: jest.fn() };
    });

    it('should support event-specific subscriptions', () => {
      emitter.subscribe(observer1, ['event1']);
      emitter.subscribe(observer2, ['event2']);

      emitter.notify('event1', { data: 1 });
      expect(observer1.update).toHaveBeenCalledWith('event1', { data: 1 });
      expect(observer2.update).not.toHaveBeenCalled();

      emitter.notify('event2', { data: 2 });
      expect(observer2.update).toHaveBeenCalledWith('event2', { data: 2 });
    });

    it('should support global observers', () => {
      emitter.subscribe(observer1);
      emitter.notify('anyEvent', { data: 1 });
      expect(observer1.update).toHaveBeenCalledWith('anyEvent', { data: 1 });
    });

    it('should maintain event history', () => {
      emitter.notify('event1', { data: 1 });
      emitter.notify('event2', { data: 2 });

      const history = emitter.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe('event1');
      expect(history[1].event).toBe('event2');
    });

    it('should limit event history size', () => {
      for (let i = 0; i < 2000; i++) {
        emitter.notify('test', { i });
      }
      expect(emitter.eventHistory.length).toBeLessThanOrEqual(emitter.maxHistory);
    });

    it('should unsubscribe observers correctly', () => {
      emitter.subscribe(observer1, ['event1', 'event2']);
      emitter.subscribe(observer2);

      emitter.unsubscribe(observer1, ['event1']);
      emitter.notify('event1', {});
      expect(observer1.update).not.toHaveBeenCalled();
      
      observer1.update.mockClear();
      emitter.notify('event2', {});
      expect(observer1.update).toHaveBeenCalled();

      observer2.update.mockClear();
      emitter.unsubscribe(observer2);
      emitter.notify('anyEvent', {});
      expect(observer2.update).not.toHaveBeenCalled();
    });

    it('should clear all observers and history', () => {
      emitter.subscribe(observer1);
      emitter.subscribe(observer2, ['event']);
      emitter.notify('test', {});

      emitter.clear();
      expect(emitter.getObservers()).toHaveLength(0);
      expect(emitter.getEventHistory()).toHaveLength(0);
    });
  });
}); 