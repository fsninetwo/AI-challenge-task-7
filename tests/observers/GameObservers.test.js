const { GameStatsObserver } = require('../../src/observers/GameObservers');

describe('GameStatsObserver', () => {
  let observer;

  beforeEach(() => {
    observer = new GameStatsObserver();
  });

  test('should initialize with default stats', () => {
    const stats = observer.getStats();
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
      gameStartTime: null,
      gameEndTime: null,
      gameDurationMs: null,
      gameDurationMinutes: null,
      winner: null
    });
  });

  test('should track player hits', () => {
    observer.update('playerHit');
    const stats = observer.getStats();
    expect(stats.playerHits).toBe(1);
    expect(stats.totalPlayerMoves).toBe(1);
    expect(stats.playerAccuracy).toBe(100);
  });

  test('should track player misses', () => {
    observer.update('playerMiss');
    const stats = observer.getStats();
    expect(stats.playerMisses).toBe(1);
    expect(stats.totalPlayerMoves).toBe(1);
    expect(stats.playerAccuracy).toBe(0);
  });

  test('should track CPU hits', () => {
    observer.update('cpuHit');
    const stats = observer.getStats();
    expect(stats.cpuHits).toBe(1);
    expect(stats.totalCpuMoves).toBe(1);
    expect(stats.cpuAccuracy).toBe(100);
  });

  test('should track CPU misses', () => {
    observer.update('cpuMiss');
    const stats = observer.getStats();
    expect(stats.cpuMisses).toBe(1);
    expect(stats.totalCpuMoves).toBe(1);
    expect(stats.cpuAccuracy).toBe(0);
  });

  test('should track game start and end', async () => {
    observer.update('gameStart');
    expect(observer.getStats().gameStartTime).toBeInstanceOf(Date);

    // Add a small delay to ensure duration is measurable
    await new Promise(resolve => setTimeout(resolve, 10));

    observer.update('gameOver', { winner: 'player' });
    const stats = observer.getStats();
    expect(stats.gameEndTime).toBeInstanceOf(Date);
    expect(stats.gameDurationMs).toBeGreaterThan(0);
    expect(stats.gameDurationMinutes).toBeGreaterThanOrEqual(0);
    expect(stats.winner).toBe('player');
  });

  test('should calculate accurate statistics', () => {
    // Player: 2 hits, 1 miss
    observer.update('playerHit');
    observer.update('playerHit');
    observer.update('playerMiss');

    // CPU: 1 hit, 2 misses
    observer.update('cpuHit');
    observer.update('cpuMiss');
    observer.update('cpuMiss');

    const stats = observer.getStats();
    expect(stats.playerAccuracy).toBe(66.67); // 2/3 * 100
    expect(stats.cpuAccuracy).toBe(33.33); // 1/3 * 100
    expect(stats.totalPlayerMoves).toBe(3);
    expect(stats.totalCpuMoves).toBe(3);
    expect(stats.turnsPlayed).toBe(6);
  });

  test('should reset all stats', () => {
    // Add some stats
    observer.update('playerHit');
    observer.update('cpuMiss');
    observer.update('gameStart');

    // Reset
    observer.reset();

    // Verify reset
    const stats = observer.getStats();
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
      gameStartTime: null,
      gameEndTime: null,
      gameDurationMs: null,
      gameDurationMinutes: null,
      winner: null
    });
  });
}); 