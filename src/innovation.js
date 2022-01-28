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
    id: p.name,
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

  // Set an id that can be used to quickly fetch a zone.
  this._walkZones(this.state.zones, (zone, path) => {
    zone.id = path.join('.')
    for (const card of zone.cards) {
      card.home = zone.id
      card.zone = zone.id
    }
  })
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
      const cardsCopy = [...cards]
      util.array.shuffle(cardsCopy)
      zones.decks[exp][age] = {
        name: `decks.${exp}.${age}`,
        cards: cardsCopy,
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
    this.mMoveTopCard(this.getZoneByDeck('base', age), this.getZoneById('achievements'))
  }

  // Special achievements
  for (const exp of ['base', 'echo', 'figs', 'city', 'arti']) {
    if (this.getExpansionList().includes(exp)) {
      for (const ach of res[exp].achievements) {
        zones.achievements.cards.push(ach)
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
  const requests = this
    .getPlayerAll()
    .map(p => ({
      actor: this.utilSerializeObject(p),
      title: 'Choose First Card',
      choices: this.getZoneByPlayer(p, 'hand').cards.map(this.utilSerializeObject),
    }))

  const picks = this
    .requestInputMany(requests)
    .map(resp => [
      this.getPlayerByName(resp.actor),
      this.getCardByName(resp.selection[0])
    ])
    .sort((l, r) => l[1].name.localeCompare(r[1].name))
  for (const [player, card] of picks) {
    this.mMeldCard(player, card)
  }

  this.state.currentPlayer = picks[0][0]
}

Innovation.prototype.mainLoop = function() {
}


////////////////////////////////////////////////////////////////////////////////
// Getters

Innovation.prototype.getCardByName = function(name) {
  return res.all.byName[name]
}

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

Innovation.prototype.getPlayerCurrent = function() {
  return this.state.currentPlayer
}

Innovation.prototype.getPlayerByName = function(name) {
  const player = this.getPlayerAll().find(p => p.name === name)
  util.assert(!!player, `Player with name '${name}' not found.`)
  return player
}

Innovation.prototype.getZoneByCard = function(card) {
  return this.getZoneById(card.zone)
}

Innovation.prototype.getZoneByCardHome = function(card) {
  return this.getZoneById(card.home)
}

Innovation.prototype.getZoneByDeck = function(exp, age) {
  return this.state.zones.decks[exp][age]
}

Innovation.prototype.getZoneById = function(id) {
  const tokens = id.split('.')
  let curr = this.state.zones
  for (const token of tokens) {
    util.assert(curr.hasOwnProperty(token), `Invalid zone id ${id} at token ${token}`)
    curr = curr[token]
  }
  return curr
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

Innovation.prototype.mMeldCard = function(player, card) {
  const source = this.getZoneByCard(card)
  const target = this.getZoneByPlayer(player, card.color)
  const sourceIndex = source.cards.indexOf(card)

  this.mMoveByIndices(source, sourceIndex, target, 0)
  this.mLog({
    template: '{player} melds {card}',
    args: { player, card }
  })
}

Innovation.prototype.mMoveByIndices = function(source, sourceIndex, target, targetIndex) {
  util.assert(sourceIndex >= 0 && sourceIndex <= source.cards.length - 1, `Invalid source index ${sourceIndex}`)
  const sourceCards = source.cards
  const targetCards = target.cards
  const card = sourceCards[sourceIndex]
  sourceCards.splice(sourceIndex, 1)
  targetCards.splice(targetIndex, 0, card)
  card.zone = target.id
  return card
}

Innovation.prototype.mMoveCardTo = function(card, target) {
  if (card.zone === target.id) {
    // Card is already in the target zone.
    return
  }
  const source = this.getZoneByCard(card)
  const sourceIndex = source.cards.findIndex(c => c === card)
  return this.mMoveByIndices(source, sourceIndex, target, target.cards.length)
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

Innovation.prototype.mReturnCard = function(player, card, opts) {
  opts = opts || {}
  const source = this.getZoneByCard(card)
  const target = this.getZoneByCardHome(card)
  const sourceIndex = source.cards.indexOf(card)
  const targetIndex = target.cards.length

  util.assert(sourceIndex !== -1, 'Did not find card in its supposed source.')

  this.mMoveByIndices(source, sourceIndex, target, targetIndex)

  if (!opts.silent) {
    this.mLog({
      template: '{player} returns {card}',
      args: { player, card }
    })
  }

  return card
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

Game.prototype.utilSerializeObject = function(obj) {
  if (typeof obj === 'object') {
    util.assert(obj.id !== undefined, 'Object has no id. Cannot serialize.')
    return obj.id
  }
  else if (typeof obj === 'string') {
    return obj
  }
  else {
    throw new Error(`Cannot serialize element of type ${typeof obj}`)
  }
}

////////////////////////////////////////////////////////////////////////////////
// Private functions

Innovation.prototype._walkZones = function(root, fn, path=[]) {
  for (const [key, obj] of Object.entries(root)) {
    const thisPath = [...path, key]
    if (obj.cards) {
      fn(obj, thisPath)
    }
    else {
      this._walkZones(obj, fn, thisPath)
    }
  }
}
