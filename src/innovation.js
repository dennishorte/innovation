const {
  Game,
  GameFactory,
  GameOverEvent,
  InputRequestEvent,
} = require('./game.js')
const res = require('./resources.js')
const util = require('./util.js')


module.exports = {
  Innovation,
  InnovationFactory,
}


function Innovation(serialized_data) {
  Game.call(this, serialized_data)
}

util.inherit(Game, Innovation)

function InnovationFactory(settings) {
  const data = GameFactory(settings)
  return new Innovation(data)
}

Innovation.prototype._mainProgram = function() {
  this.initialize()
  this.firstPicks()
  this.mainLoop()
}

Innovation.prototype._gameOver = function() {
  throw new Error('not implemented')
}

////////////////////////////////////////////////////////////////////////////////
// Initialization

Innovation.prototype.initialize = function() {
  console.log('initialize')

  this.initializePlayers()
  this.initializeTeams()
  this.initializeZones()
  this.initializeStartingCards()
  this.initializeTransientState()

  this._breakpoint('initialization-complete')
}

Innovation.prototype.initializeTransientState = function() {
  this.mResetDogmaInfo()
  this.mResetMonumentCounts()
}

Innovation.prototype.initializePlayers = function() {
  this.state.players = this.settings.players.map(p => ({
    _id: p._id,
    name: p.name,
    team: p.name,
  }))
  util.array.shuffle(this.state.players)
  this.state.players.forEach((player, index) => {
    player.index = index
  })
}

Innovation.prototype.initializeTeams = function() {
  const players = this.state.players
  let teamMod = players.length
  if (this.settings.teams) {
    util.assert(this.getPlayerAll().length === 4, 'Teams only supported with 4 players')
    teamMod = 2
  }
  for (let i = 0; i < players.length; i++) {
    const teamNumber = i % teamMod
    players[i].team = `team${teamNumber}`
  }
}

Innovation.prototype.initializeZones = function() {
  this.state.zones = {}
  this.initializeZonesDecks()
  this.initializeZonesAchievements()
  this.initializeZonesPlayers()
  this.state.zones.exile = {
    name: 'exile',
    cards: [],
    kind: 'public',
  }
}

Innovation.prototype.initializeZonesDecks = function() {
  const zones = this.state.zones
  zones.decks = {}
  for (const exp of ['base', 'echo', 'figs', 'city', 'arti']) {
    zones.decks[exp] = {}
    const data = res[exp]
    for (const [age, cards] of Object.entries(res[exp].byAge)) {
      if (!cards) {
        throw new Error(`Missing cards for ${exp}-${age}`)
      }
      else if (!Array.isArray(cards)) {
        throw new Error(`Cards for ${exp}-${age} is of type ${typeof cards}`)
      }
      util.array.shuffle(cards)
      zones.decks[exp][age] = {
        name: `decks.${exp}.${age}`,
        cards,
        kind: 'deck',
      }
    }
  }
}

Innovation.prototype.initializeZonesAchievements = function() {
  const zones = this.state.zones

  zones.achievements = {
    name: 'achievements',
    cards: [],
    kind: 'public',
  }

  // Standard achievements
  for (const age of [1,2,3,4,5,6,7,8,9]) {
    this.mMoveTopCard(this.getZoneByDeck('base', age), this.getZoneByName('achievements'))
  }

  // Special achievements
  for (const exp of ['base', 'echo', 'figs', 'city', 'arti']) {
    if (this.getExpansionList().includes(exp)) {
      for (const ach of res[exp].achievements) {
        zones.achievements.cards.push(ach.id)
      }
    }
  }
}

Innovation.prototype.initializeZonesPlayers = function() {
  const zones = this.state.zones
  zones.players = {}

  function _addPlayerZone(player, name, kind, root) {
    root[name] = {
      name: `players.${player.name}.${name}`,
      cards: [],
      kind,
      owner: player.name,
    }
  }

  for (const player of this.getPlayerAll()) {
    const root = {}
    _addPlayerZone(player, 'hand', 'private', root)
    _addPlayerZone(player, 'score', 'private', root)
    _addPlayerZone(player, 'forecast', 'private', root)
    _addPlayerZone(player, 'achievements', 'public', root)
    _addPlayerZone(player, 'red', 'public', root)
    _addPlayerZone(player, 'blue', 'public', root)
    _addPlayerZone(player, 'green', 'public', root)
    _addPlayerZone(player, 'yellow', 'public', root)
    _addPlayerZone(player, 'purple', 'public', root)
    _addPlayerZone(player, 'artifact', 'public', root)
    zones.players[player.name] = root

    for (const color of ['red', 'yellow', 'green', 'blue', 'purple']) {
      root[color].splay = 'none'
    }
  }
}

Innovation.prototype.initializeStartingCards = function() {
  for (const player of this.getPlayerAll()) {
    this.mDraw(player, 'base', 1)

    if (this.getExpansionList().includes('echo')) {
      this.mDraw(player, 'echo', 1)
    }
    else {
      this.mDraw(player, 'base', 1)
    }
  }
}


////////////////////////////////////////////////////////////////////////////////
// Primary game logic

Innovation.prototype.firstPicks = function() {
  console.log('firstPicks')
}

Innovation.prototype.mainLoop = function() {
  console.log('mainLoop')
}


////////////////////////////////////////////////////////////////////////////////
// Getters

Innovation.prototype.getExpansionList = function() {
  return this.settings.expansions
}

Innovation.prototype.getLog = function() {
  return this.state.log
}

Innovation.prototype.getLogIndent = function(msg) {
  return 0
}

Innovation.prototype.getPlayerAll = function() {
  return this.state.players
}

Innovation.prototype.getZoneByDeck = function(exp, age) {
  return this.state.zones.decks[exp][age]
}

Innovation.prototype.getZoneByName = function(name) {
  return this.state.zones[name]
}

Innovation.prototype.getZoneByPlayer = function(player, name) {
  return this.state.zones.players[player.name][name]
}


////////////////////////////////////////////////////////////////////////////////
// Setters

Innovation.prototype.mDraw = function(player, exp, age) {
  const source = this.getZoneByDeck(exp, age)
  const hand = this.getZoneByPlayer(player, 'hand')
  const card = this.mMoveTopCard(source, hand)
  this.mLog({
    template: '{player} draws {card}',
    args: { player, card }
  })
}

Innovation.prototype.mMoveByIndices = function(source, sourceIndex, target, targetIndex) {
  const sourceCards = source.cards
  const targetCards = target.cards
  const card = sourceCards[sourceIndex]
  sourceCards.splice(sourceIndex, 1)
  targetCards.splice(targetIndex, 0, card)
  return card
}

Innovation.prototype.mMoveTopCard = function(source, target) {
  return this.mMoveByIndices(source, 0, target, target.cards.length)
}

Innovation.prototype.mLog = function(msg) {
  if (!msg.template) {
    console.log(msg)
    throw new Error(`Invalid log entry; no template`)
  }

  if (!msg.classes) {
    msg.classes = []
  }
  if (!msg.args) {
    msg.args = {}
  }

  this.utilEnrichLogArgs(msg)
  msg.id = this.getLog().length
  msg.indent = this.getLogIndent(msg)

  // Making a copy here makes sure that the log items are always distinct from
  // wherever their original data came from.
  this.state.log.push(msg)

  return msg.id
}

Innovation.prototype.mResetDogmaInfo = function() {
  this.state.dogmaInfo = util.array.toDict(this.getPlayerAll(), p => ({ [p.name]: {
    acted: false
  }}))
}

Innovation.prototype.mResetMonumentCounts = function() {
  this.state.monument = util.array.toDict(this.getPlayerAll(), p => {
    return { [p.name]: { tuck: 0, score: 0 } }
  })
}


////////////////////////////////////////////////////////////////////////////////
// Utility Functions

Game.prototype.utilEmptyBiscuits = function() {
  return {
    c: 0,
    f: 0,
    i: 0,
    k: 0,
    l: 0,
    s: 0,
  }
}

Game.prototype.utilEnrichLogArgs = function(msg) {
  for (const key of Object.keys(msg.args)) {
    if (key.startsWith('player')) {
      const player = msg.args[key]
      msg.args[key] = {
        value: player.name,
        classes: ['player-name']
      }
    }
    else if (key === 'card') {
      const card = msg.args[key]
      msg.args[key] = {
        value: card.name,
        classes: [`card`],
      }
    }
    else if (key.startsWith('zone')) {
      const zone = msg.args[key]
      msg.args[key] = {
        value: zone.name,
        classes: ['zone-name']
      }
    }
    // Convert string args to a dict
    else if (typeof msg.args[key] !== 'object') {
      msg.args[key] = {
        value: msg.args[key],
      }
    }

    // Ensure the classes key is set for all entries.
    msg.args[key].classes = msg.args[key].classes || []
  }
}

Game.prototype.utilParseBiscuits = function(biscuitString) {
  const counts = this.utilEmptyBiscuits()
  for (const ch of biscuitString) {
    if (counts.hasOwnProperty(ch)) {
      counts[ch] += 1
    }
  }
  return counts
}

Game.prototype.utilSeparateByAge = function(cards) {
  cards = this._adjustCardsParam(cards)
  const byAge = {}
  for (const card of cards) {
    if (byAge.hasOwnProperty(card.age)) {
      byAge[card.age].push(card)
    }
    else {
      byAge[card.age] = [card]
    }
  }
  return byAge
}
