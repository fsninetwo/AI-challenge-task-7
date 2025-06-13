const { Command, CommandInvoker } = require('../src/commands/Commands');

describe('Commands', () => {
  test('Command base class throws when not implemented', () => {
    const command = new Command();
    expect(() => command.execute()).toThrow('Command must implement execute method');
    expect(() => command.undo()).toThrow('Command must implement undo method');
  });

  test('CommandInvoker executes commands', () => {
    const invoker = new CommandInvoker();
    const mockCommand = {
      execute: jest.fn().mockReturnValue(true),
      undo: jest.fn()
    };
    
    const result = invoker.execute(mockCommand);
    
    expect(mockCommand.execute).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(invoker.history).toContain(mockCommand);
  });

  test('CommandInvoker undos commands', () => {
    const invoker = new CommandInvoker();
    const mockCommand = {
      execute: jest.fn(),
      undo: jest.fn().mockReturnValue(true)
    };
    
    invoker.execute(mockCommand);
    const result = invoker.undo();
    
    expect(mockCommand.undo).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('CommandInvoker clears history', () => {
    const invoker = new CommandInvoker();
    const mockCommand = { execute: jest.fn(), undo: jest.fn() };
    
    invoker.execute(mockCommand);
    expect(invoker.history).toHaveLength(1);
    
    invoker.clearHistory();
    expect(invoker.history).toHaveLength(0);
  });
}); 