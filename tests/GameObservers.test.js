const { EventEmitter, GameStatsObserver } = require('../src/observers/GameObservers');

describe('Observers', () => {
  test('EventEmitter emits and handles events', () => {
    const emitter = new EventEmitter();
    const mockHandler = jest.fn();
    
    emitter.on('test', mockHandler);
    emitter.emit('test', 'data');
    
    expect(mockHandler).toHaveBeenCalledWith('data');
  });

  test('EventEmitter removes event listeners', () => {
    const emitter = new EventEmitter();
    const mockHandler = jest.fn();
    
    emitter.on('test', mockHandler);
    emitter.off('test', mockHandler);
    emitter.emit('test', 'data');
    
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('GameStatsObserver tracks game statistics', () => {
    const observer = new GameStatsObserver();
    const mockEvent = {
      type: 'player-hit',
      coordinate: '34',
      timestamp: new Date()
    };
    
    observer.onEvent(mockEvent);
    
    const stats = observer.getStats();
    expect(stats.totalEvents).toBe(1);
  });

  test('GameStatsObserver categorizes events correctly', () => {
    const observer = new GameStatsObserver();
    
    observer.onEvent({ type: 'player-hit', coordinate: '34' });
    observer.onEvent({ type: 'player-miss', coordinate: '00' });
    observer.onEvent({ type: 'cpu-hit', coordinate: '55' });
    
    const stats = observer.getStats();
    expect(stats.playerHits).toBe(1);
    expect(stats.playerMisses).toBe(1);
    expect(stats.cpuHits).toBe(1);
  });

  test('GameStatsObserver calculates accuracy', () => {
    const observer = new GameStatsObserver();
    
    observer.onEvent({ type: 'player-hit' });
    observer.onEvent({ type: 'player-hit' });
    observer.onEvent({ type: 'player-miss' });
    
    const stats = observer.getStats();
    expect(stats.playerAccuracy).toBeCloseTo(66.67, 1);
  });
}); 