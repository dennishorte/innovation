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
  this.state.turn = 1
  this.state.round = 1
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

  this.mLog({
    template: 'Round 1',
  })


  this._breakpoint('before-first-player')
}

Innovation.prototype.mainLoop = function() {
  while (true) {
    this.mLog({
      template: "{player}'s turn",
      args: {
        player: this.getPlayerCurrent()
      }
    })

    this.artifact()
    this.action(1)
    this.action(2)
    this.endTurn()
  }
}

Innovation.prototype.artifact = function() {
  const player = this.getPlayerCurrent()
  const artifact = this.getZoneByPlayer(player, 'artifact').cards[0]
  if (artifact) {
    this.mLog({
      template: 'Free Artifact Action',
    })

    const action = this.requestInputSingle({
      actor: player.name,
      title: 'Free Artifact Action',
      choices: ['dogma', 'return', 'skip']
    })

    switch (action) {
      case 'dogma':
        return this.aDogma(player, card, { artifact: true })
      case 'return':
        return this.aReturn(player, card)
      case 'skip':
        game.mLog({
          template: '{player} skips the free artifact action',
          args: { player },
        })
        return
    }
  }
}

Innovation.prototype.action = function(count) {
  const player = this.getPlayerCurrent()

  // The first player (or two) only gets one action
  const numFirstPlayers = this.getPlayerAll().length >= 4 ? 2 : 1
  if (this.state.turn <= numFirstPlayers) {
    if (count === 1) {
      this.mLog({
        template: '{player} gets only 1 action on first turn',
        args: { player }
      })
    }
    else if (count === 2) {
      return
    }
  }

  const countTerm = count === 1 ? 'First' : 'Second'
  const chosenAction = this.requestInputSingle({
    actor: player.name,
    title: `Choose ${countTerm} Action`,
    choices: this._generateActionChoices(),
  })[0]

  const name = chosenAction.name
  const arg = chosenAction.selection[0]

  if (name === 'Draw') {
    this.aDraw(player)
  }
  else {
    throw new Error(`Unhandled action type ${name}`)
  }
}

Innovation.prototype.endTurn = function() {
  const players = this.getPlayerAll()

  // Set next player
  const playerIndex = players.findIndex(p => this.getPlayerCurrent())
  const nextIndex = (playerIndex + 1) % players.length
  this.state.currentPlayer = players[nextIndex]

  // Track number of turns
  this.state.turn += 1
  this.state.round = Math.floor((this.state.turn + players.length - 1) / players.length)
  if (this.state.round % players.length === 0) {
    game.mLog({ template: `Round ${this.state.round}` })
  }

  // Reset various turn-centric state
  this.state.didEnsorse = false
  this.state.didInspire = false
  this.mResetDogmaInfo()
  this.mResetMonumentCounts()
}


////////////////////////////////////////////////////////////////////////////////
// Actions

Innovation.prototype.aDogma = function(player, card, opts) {
  this.mLog({
    template: '{player} activates the dogma effects of {card}',
    args: { player, card }
  })

  this.state.shared = false

  const color = this.getZoneByPlayer(player, color)

  // Store the biscuits now because changes caused by the dogma action should
  // not affect the number of biscuits used for evaluting the effect.
  const biscuits = this.getBiscuits()

  // Store the planned effects now, because changes caused by the dogma action
  // should not affect which effects are executed.
  const effectCards = color
    .cards
    .filter(card => card.echoIsVisible(color.splay))
    .reverse()  // Start from the bottom of the stack when executing effects


  if (opts.artifact) {
    // Artifact biscuits are used only when taking the free dogma action.
    const extraBiscuits = this.getBiscuitsByCard(card)
    biscuits[player.name] = this.utilCombineBiscuits(biscuits[player.name], extraBiscuits)

    // This card is treated as being on top of the stack.
    effectCards.push(card)
  }

  for (const ecard of effectCards) {
    for (const player of this.getPlayersStartingNext()) {
      this.aCardEffects(player, ecard, 'echo', biscuits)

      // Only the top card (or the artifact card for free artifact dogma actions)
      // get to do their dogma effects.
      if (ecard === card) {
        this.aCardEffects(player, ecard, 'dogma', biscuits)
      }
    }
  }

  // Share bonus
  if (this.state.shared) {
    this.aDraw(player, { share: true })
  }
}

Innovation.prototype.aDraw = function(player, opts={}) {
  const karmaKind = this.aKarma(player, 'draw', opts)
  if (karmaKind === 'would-instead') {
    return
  }

  const { age, share } = opts

  // Expansion the user should draw from, before looking at empty decks.
  const baseExp = this._determineBaseDrawExpansion(player, share)

  // If age is not specified, draw based on player's current highest top card.
  const highestTopCard = this.getHighestTopCard(player) || {}
  const baseAge = age || highestTopCard.age || 1

  // Adjust age based on empty decks.
  const [ adjustedAge, adjustedExp ] = this._adjustedDrawDeck(baseAge, baseExp)

  return this.mDraw(player, adjustedExp, adjustedAge)
}

Innovation.prototype.aDrawAndReveal = function(player, opts={}) {
  const card = this.aDraw(player, opts)
  if (card) {
    return this.mReveal(card)
  }
}

Innovation.prototype.aKarma = function(player, kind, opts={}) {

}

Innovation.prototype.aReturn = function(player, card, opts={}) {
  const karmaKind = this.aKarma(player, 'return', { ...opts, card })
  if (karmaKind === 'would-instead') {
    return
  }

  this.mReturn(player, card)
  this.aAchievementCheck()
  return card
}


////////////////////////////////////////////////////////////////////////////////
// Checkers

Innovation.prototype.checkCardIsTop = function(card) {
  return this.getZoneByCard(card).cards[0] === card
}

Innovation.prototype.checkZoneHasVisibileDogmaOrEcho = function(zone) {
  if (zone.cards.length === 0) {
    return false
  }
  else if (zone.cards[0].dogma.length > 0) {
    return true
  }
  else {
    return zone.cards.some(card => card.checkEchoIsVisible(zone.splay))
  }
}


////////////////////////////////////////////////////////////////////////////////
// Getters

Innovation.prototype.getBiscuits = function() {
  const biscuits = this
    .getPlayerAll()
    .map(player => [player.name, this.getBiscuitsByPlayer(player)])
  return util.array.toDict(biscuits)
}

Innovation.prototype.getBiscuitsByPlayer = function(player) {
  const boardBiscuits = this
    .utilColors()
    .map(color => this.getZoneByPlayer(player, color))
    .map(zone => this.getBiscuitsByZone(zone))
    .reduce(this.utilCombineBiscuits)

  return this
    .getCardsByKarmaTrigger(player, 'calculate-biscuits')
    .map(card => this.utilApplyKarma(card, 'calculate-biscuits', this, player, board))
    .reduce(this.utilCombineBiscuits, boardBiscuits)
}

Innovation.prototype.getBiscuitsByCard = function(card) {
  return this.utilParseBiscuits(card.getBiscuits())
}

Innovation.prototype.getBiscuitsByZone = function(zone) {
  return zone
    .cards
    .map(card => this.getBiscuitsRaw(card, zone.splay))
    .map(this.utilParseBiscuits)
    .reduce(this.utilCombineBiscuits)
}

Innovation.prototype.getBiscuitsRaw = function(card, splay) {
  return this.checkCardIsTop(card)
       ? card.getBiscuits('top')
       : card.getBiscuits(splay)
}

Innovation.prototype.getCardByName = function(name) {
  util.assert(res.all.byName.hasOwnProperty(name), `Unknown card: ${name}`)
  return res.all.byName[name]
}

Innovation.prototype.getExpansionList = function() {
  return this.settings.expansions
}

Innovation.prototype.getHighestTopCard = function(player) {
  const topCards = this
    .utilColors()
    .map(color => this.getZoneByPlayer(player, color).cards[0])
    .filter(card => card !== undefined)
    .sort((l, r) => r.age - l.age)

  return topCards[0]
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
  const emptyInfo = this
    .getPlayerAll()
    .map(p => [p.name, { acted: false }])
  this.state.dogmaInfo = util.array.toDict(emptyInfo)
}

Innovation.prototype.mResetMonumentCounts = function() {
  const emptyInfo = this
    .getPlayerAll()
    .map(p => [p.name, { tuck: 0, score: 0 }])
  this.state.monument = util.array.toDict(emptyInfo)
}

Innovation.prototype.mReturn = function(player, card, opts) {
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

Innovation.prototype.mReveal = function(player, card) {
  this.mLog({
    template: '{player} reveals {card}',
    args: { player, card }
  })
}


////////////////////////////////////////////////////////////////////////////////
// Utility Functions

Game.prototype.utilColors = function() {
  return [
    'red',
    'yellow',
    'green',
    'blue',
    'purple',
  ]
}

Innovation.prototype.utilCombineBiscuits = function(left, right) {
  const combined = this.utilEmptyBiscuits()
  for (const biscuit of Object.keys(combined)) {
    combined[biscuit] += left[biscuit]
    combined[biscuit] += right[biscuit]
  }
  return combined
}

Innovation.prototype.utilEmptyBiscuits = function() {
  return {
    c: 0,
    f: 0,
    i: 0,
    k: 0,
    l: 0,
    s: 0,
  }
}

Innovation.prototype.utilEnrichLogArgs = function(msg) {
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

Innovation.prototype.utilParseBiscuits = function(biscuitString) {
  const counts = this.utilEmptyBiscuits()
  for (const ch of biscuitString) {
    if (counts.hasOwnProperty(ch)) {
      counts[ch] += 1
    }
  }
  return counts
}

Innovation.prototype.utilSeparateByAge = function(cards) {
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

Innovation.prototype.utilSerializeObject = function(obj) {
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


Innovation.prototype._adjustedDrawDeck = function(age, exp) {
  const baseDeck = this.getZoneByDeck('base', age)
  if (baseDeck.cards.length === 0) {
    return this._adjustedDrawDeck(age + 1, exp)
  }

  if (exp === 'base') {
    return [age, 'base']
  }

  const expDeck = this.getZoneByDeck(exp, age)
  if (expDeck.cards.length === 0) {
    return [age, 'base']
  }

  return [age, exp]
}

// Determine which expansion to draw from.
Innovation.prototype._determineBaseDrawExpansion = function(player, share) {
  if (this.getExpansionList().includes('echo')) {
    const hand = this.getZoneByPlayer(player, 'hand')
    const echoesCards = hand.filter(c => c.expansion === 'echo')
    if (hand.length > 0 && echoesCards.length === 0) {
      return 'echo'
    }
  }
  if (share && this.getExpansionList().includes('figs')) {
    return 'figs'
  }

  return 'base'
}

Innovation.prototype._generateActionChoices = function() {
  const choices = []
  //choices.push(this._generateActionChoicesAchieve())
  //choices.push(this._generateActionChoicesDecree())
  choices.push(this._generateActionChoicesDogma())
  choices.push(this._generateActionChoicesDraw())
  //choices.push(this._generateActionChoicesEndorse())
  //choices.push(this._generateActionChoicesInspire())
  choices.push(this._generateActionChoicesMeld())
  return choices
}

Innovation.prototype._generateActionChoicesDogma = function() {
  const player = this.getPlayerCurrent()
  const dogmaTargets = this
    .utilColors()
    .map(color => this.getZoneByPlayer(player, color))
    .filter(this.checkZoneHasVisibileDogmaOrEcho)
    .map(zone => zone.cards[0].name)

  return {
    name: 'Dogma',
    choices: dogmaTargets
  }
}

Innovation.prototype._generateActionChoicesDraw = function() {
  return {
    name: 'Draw',
    choices: ['draw a card']
  }
}

Innovation.prototype._generateActionChoicesMeld = function() {
  const player = this.getPlayerCurrent()
  const cards = this
    .getZoneByPlayer(player, 'hand')
    .cards
    .map(c => c.id)
  return {
    name: 'Meld',
    choices: cards
  }
}

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
