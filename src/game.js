const seedrandom = require('seedrandom')
const util = require('./util.js')

module.exports = {
  Game,
  GameFactory,
  GameOverEvent,
  InputRequestEvent,
}


function Game(serialized_data) {
  // State will be reset each time the game is run
  this.state = {}

  // Settings are immutable data
  this.settings = serialized_data.settings

  // Responses are the history of choices made by users.
  // This should never be reset.
  this.responses = serialized_data.responses

  this.random = 'uninitialized'
  this.key = 'uninitialized'
}

function GameFactory(name, seed) {
  const data = {
    responses: [],
    settings: {
      name: '',
      players: [],
      seed,
    },
    state: {
      responseIndex: -1,
    },
  }

  return new Game(data)
}

function GameOverEvent(data) {
  this.data = data
}

function InputRequestEvent(selector) {
  this.selector = selector
}

Game.prototype.setInputRequestKey = function(event) {
  this.key = this.random.int32()
  event.key = this.key
}

Game.prototype.run = function() {
  try {
    this._reset()
    this._mainProgram()
  }
  catch (e) {
    if (e instanceof InputRequestEvent) {
      this.setInputRequestKey(e)
      return e
    }
    else if (e instanceof GameOverEvent) {
      return this._gameOver(e)
    }
    else {
      throw e
    }
  }
}

Game.prototype.respondToInputRequest = function(response) {
  util.assert(response.key === this.key, "Invalid response. State has updated.")
  this.responses.push(response)
  return this.run()
}

Game.prototype.serialize = function() {
  return {
    settings: this.settings,
    responses: this.responses,
  }
}


////////////////////////////////////////////////////////////////////////////////
// Protected Methods

Game.prototype._gameOver = function(e) {
  throw new Error('Please implement _gameOver')
}

Game.prototype._mainProgram = function() {
  throw new Error('Please implement _mainProgram')
}

// When overriding, always call super before doing any additional state updates.
Game.prototype._reset = function() {
  this.key = 0
  this.random = seedrandom(this.settings.seed)
  this.state = {
    responseIndex: -1,
  }
}


////////////////////////////////////////////////////////////////////////////////
// Private Methods

Game.prototype._getResponse = function() {
  this.state.responseIndex += 1
  return this.responses[this.state.responseIndex]
}
