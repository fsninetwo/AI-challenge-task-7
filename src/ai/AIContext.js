const RandomStrategy = require('./RandomStrategy');
const HuntTargetStrategy = require('./HuntTargetStrategy');
const ProbabilityStrategy = require('./ProbabilityStrategy');

class AIContext {
  constructor() {
    this.strategy = new RandomStrategy();
    this.consecutiveMisses = 0;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  getNextMove(gameState) {
    return this.strategy.getNextMove(gameState);
  }

  updateStrategy(gameState) {
    const lastMove = Array.from(gameState.cpuGuesses).pop();
    if (!lastMove) return;

    const wasHit = gameState.playerBoard.getShipAt(lastMove) !== null;

    if (wasHit) {
      this.consecutiveMisses = 0;
      if (!(this.strategy instanceof HuntTargetStrategy)) {
        this.setStrategy(new HuntTargetStrategy());
      }
    } else {
      this.consecutiveMisses++;
      if (this.consecutiveMisses >= 3 && !(this.strategy instanceof ProbabilityStrategy)) {
        this.setStrategy(new ProbabilityStrategy());
      }
    }
  }
}

module.exports = AIContext; 