const {
  Game,
  GameFactory,
  GameOverEvent,
  InputRequestEvent,
} = require('./game.js')
const util = require('./util.js')


////////////////////////////////////////////////////////////////////////////////
// TestGame fixture

function TestGame(serialized_data) {
  Game.call(this, serialized_data)
}

util.inherit(Game, TestGame)

TestGame.prototype._mainProgram = function() {
  this.main()
}

TestGame.prototype._gameOver = function(e) {
  return 'Game Over'
}

TestGame.prototype.main = function() {

  const response = this._getResponse()
  if (response) {
    throw new GameOverEvent({
      message: 'Dennis wins by score',
    })
  }
  else {
    throw new InputRequestEvent({
      actor: 'dennis',
      title: "Choose a Color",
      choices: ['red', 'blue'],
    })
  }
}

function TestFactory() {
  const data = GameFactory('test_game', 'test_seed').serialize()
  return new TestGame(data)
}


////////////////////////////////////////////////////////////////////////////////
// Tests

describe('user input', () => {
  test('game returns user input request', () => {
    const game = TestFactory()
    const result = game.run()
    expect(result).toBeInstanceOf(InputRequestEvent)
  })

  test('game proceeds after receiving input', () => {
    const game = TestFactory()
    const result1 = game.run()
    const result2 = game.respondToInputRequest({
      actor: 'dennis',
      title: 'Choose a Color',
      selection: ['red'],
      key: result1.key
    })

    expect(result2).toBe('Game Over')
  })
})
