const Game = require('../src/game/Game');

// Mock all dependencies
jest.mock('../src/config/GameConfig');
jest.mock('../src/entities/GameBoard');
jest.mock('../src/entities/ShipFactory');
jest.mock('../src/ai/AIStrategies');
jest.mock('../src/commands/Commands');
jest.mock('../src/observers/GameObservers');
jest.mock('../src/states/GameStates');
jest.mock('../src/validation/ValidationStrategy');

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game();
  });

  test('should create game instance', () => {
    expect(game).toBeInstanceOf(Game);
    expect(game.playerBoard).toBeDefined();
    expect(game.cpuBoard).toBeDefined();
    expect(game.aiContext).toBeDefined();
  });

  test('should initialize ship counts', () => {
    expect(game.playerNumShips).toBe(3);
    expect(game.cpuNumShips).toBe(3);
  });

  test('should have validation strategies', () => {
    expect(game.inputValidator).toBeDefined();
  });

  test('should have command invoker', () => {
    expect(game.commandInvoker).toBeDefined();
  });

  test('should have event emitter', () => {
    expect(game.eventEmitter).toBeDefined();
  });

  test('should have stats observer', () => {
    expect(game.statsObserver).toBeDefined();
  });

  test('should have state machine', () => {
    expect(game.stateMachine).toBeDefined();
  });
}); 