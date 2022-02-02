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


function Innovation(serialized_data, viewerName) {
  Game.call(this, serialized_data)
  this.viewerName = viewerName
}

util.inherit(Game, Innovation)

function InnovationFactory(settings, viewerName) {
  const data = GameFactory(settings)
  return new Innovation(data, viewerName)
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
  this.mLog({ template: 'Initializing' })
  this.mLogIndent()

  this.initializePlayers()
  this.initializeTeams()
  this.initializeZones()
  this.initializeStartingCards()
  this.initializeTransientState()

  this.mLogOutdent()

  this.state.initializationComplete = true
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

  // Set the home zone of all cards before moving them around.
  this._walkZones(this.state.zones, (zone, path) => {
    zone.id = path.join('.')
    for (const card of zone.cards) {
      card.home = zone.id
    }
  })

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
      card.zone = zone.id
      card.visibility = []
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
    kind: 'achievements'
  }

  // Standard achievements
  for (const age of [1,2,3,4,5,6,7,8,9]) {
    const ageZone = this.getZoneByDeck('base', age)
    const achZone = this.getZoneById('achievements')
    const card = this.mMoveTopCard(ageZone, achZone)
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
    _addPlayerZone(player, 'achievements', 'achievements', root)
    _addPlayerZone(player, 'red', 'public', root)
    _addPlayerZone(player, 'blue', 'public', root)
    _addPlayerZone(player, 'green', 'public', root)
    _addPlayerZone(player, 'yellow', 'public', root)
    _addPlayerZone(player, 'purple', 'public', root)
    _addPlayerZone(player, 'artifact', 'public', root)
    zones.players[player.name] = root

    for (const color of ['red', 'yellow', 'green', 'blue', 'purple']) {
      root[color].color = color
      root[color].splay = 'none'
    }
  }
}

Innovation.prototype.initializeStartingCards = function() {
  for (const player of this.getPlayerAll()) {
    this.mDraw(player, 'base', 1, { silent: true })

    if (this.getExpansionList().includes('echo')) {
      this.mDraw(player, 'echo', 1, { silent: true })
    }
    else {
      this.mDraw(player, 'base', 1, { silent: true })
    }
  }
}


////////////////////////////////////////////////////////////////////////////////
// Primary game logic

Innovation.prototype.firstPicks = function() {
  this.mLog({ template: 'Choosing starting cards' })
  this.mLogIndent()
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
    this.mMeld(player, card)
  }

  this.state.currentPlayer = picks[0][0]

  this.mLogOutdent()
  this.mLog({
    template: 'Round 1',
  })

  this.state.firstPicksComplete = true

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

    this.mLogIndent()

    this.artifact()
    this.action(1)
    this.action(2)
    this.endTurn()

    this.mLogOutdent()
  }
}

Innovation.prototype.artifact = function() {
  const player = this.getPlayerCurrent()
  const artifact = this.getZoneByPlayer(player, 'artifact').cards[0]
  if (artifact) {
    this.mLog({
      template: 'Free Artifact Action',
    })
    this.mLogIndent()

    const action = this.requestInputSingle({
      actor: player.name,
      title: 'Free Artifact Action',
      choices: ['dogma', 'return', 'skip']
    })

    switch (action) {
      case 'dogma':
        this.aDogma(player, card, { artifact: true })
        break
      case 'return':
        this.aReturn(player, card)
        break
      case 'skip':
        this.mLog({
          template: '{player} skips the free artifact action',
          args: { player },
        })
        break
    }

    this.mLogOutdent()
  }
}

Innovation.prototype.action = function(count) {
  const player = this.getPlayerCurrent()

  // The first player (or two) only gets one action
  const numFirstPlayers = this.getPlayerAll().length >= 4 ? 2 : 1
  if (this.state.turn <= numFirstPlayers) {
    if (count === 1) {
      this.mLog({
        template: '{player} gets only 1 action for the first round',
        args: { player }
      })
    }
    else if (count === 2) {
      return
    }
  }

  const countTerm = count === 1 ? 'First' : 'Second'
  this.mLog({ template: `${countTerm} action` })
  this.mLogIndent()

  const chosenAction = this.requestInputSingle({
    actor: player.name,
    title: `Choose ${countTerm} Action`,
    choices: this._generateActionChoices(),
  })[0]

  const name = chosenAction.name
  const arg = chosenAction.selection[0]

  if (name === 'Achieve') {
    const age = parseInt(arg.slice(4))
    this.aClaimAchievement(player, { age, isStandard: true })
  }
  else if (name === 'Dogma') {
    const card = this.getCardByName(arg)
    this.aDogma(player, card)
  }
  else if (name === 'Draw') {
    this.aDraw(player)
  }
  else if (name === 'Meld') {
    const card = this.getCardByName(arg)
    this.aMeld(player, card)
  }
  else {
    throw new Error(`Unhandled action type ${name}`)
  }

  this.mLogOutdent()
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
    this.mLog({ template: `Round ${this.state.round}` })
  }

  // Reset various turn-centric state
  this.state.didEnsorse = false
  this.state.didInspire = false
  this.mResetDogmaInfo()
  this.mResetMonumentCounts()
}


////////////////////////////////////////////////////////////////////////////////
// Actions

Innovation.prototype.aCardEffects = function(
  leader,
  player,
  card,
  kind,
  biscuits,
  sharing=[],
  demanding=[]
) {
  for (let i = 0; i < card[kind].length; i++) {
    const effectText = card[kind][i]
    const effectImpl = card[`${kind}Impl`][i]
    const isDemand = effectText.startsWith('I demand')

    const demand = isDemand && demanding.includes(player)
    const share = !isDemand && sharing.includes(player)
    const owner = !isDemand && player === leader

    if (demand || share || owner) {
      this.mLog({
        template: `{player}, {card}: ${effectText}`,
        args: { player, card }
      })
      this.mLogIndent()

      effectImpl(this, player, { biscuits })

      this.mLogOutdent()
    }

  }
}

Innovation.prototype.aChooseCard = function(opts) {
  if (opts.choices.length === 0) {
    this.mLogNoEffect()
    return undefined
  }

  const player = this.getPlayerByName(opts.actor)
  const cardNames = this.requestInputSingle(opts)
  if (cardNames.length === 0) {
    this.mLogDoNothing(player)
    return undefined
  }
  else {
    return this.getCardByName(cardNames[0])
  }
}

Innovation.prototype.aChooseAndScore = function(opts) {
  const player = this.getPlayerByName(opts.actor)
  const cardNames = this.requestInputSingle(opts)
  if (cardNames.length === 0) {
    this.mLogDoNothing(player)
  }
  else {
    cardNames
      .map(c => this.getCardByName(c))
      .forEach(card => this.aScore(player, card))
  }
}

Innovation.prototype.aChooseAndSplay = function(opts) {
  const player = this.getPlayerByName(opts.actor)

  if (!opts.choices) {
    opts.choices = this.utilColors()
  }

  opts.choices = opts
    .choices
    .filter(color => this.getZoneByPlayer(player, color).splay !== opts.direction)
    .filter(color => this.getZoneByPlayer(player, color).cards.length > 1)

  if (opts.choices.length === 0) {
    this.mLogNoEffect()
    return
  }

  const colors = this.requestInputSingle(opts)
  if (colors.length === 0) {
    this.mLogDoNothing(player)
  }
  else {
    this.aSplay(player, colors[0], opts.direction)
  }
}

Innovation.prototype.aChooseAndTuck = function(opts) {
  const player = this.getPlayerByName(opts.actor)
  const cardNames = this.requestInputSingle(opts)
  if (cardNames.length === 0) {
    this.mLog({
      template: '{player} does nothing',
      args: { player }
    })
  }
  else {
    cardNames
      .map(c => this.getCardByName(c))
      .forEach(card => this.aTuck(player, card))
  }
}

Innovation.prototype.aClaimAchievement = function(player, opts={}) {
  let card
  if (opts.card) {
    card = opts.card
  }
  else if (opts.name) {
    card = this.getCardByName(opts.name)
  }
  else if (opts.age) {
    card = this.getZoneById('achievements').cards.find(c => c.age === opts.age)
  }

  if (!card) {
    throw new Error(`Unable to find achievement given opts: ${JSON.stringify(opts)}`)
  }

  const karmaKind = this.aKarma(player, 'achieve', opts)
  if (karmaKind === 'would-instead') {
    return
  }

  this.mAchieve(player, card)

  if (opts.isStandard && this.getExpansionList().includes('figs')) {
    for (const opp of this.getPlayerOpponents(player)) {
      this.aDraw(opp, { exp: 'figs' })
    }
  }

  return card
}

Innovation.prototype.aDogma = function(player, card, opts={}) {
  this.mLog({
    template: '{player} activates the dogma effects of {card}',
    args: { player, card }
  })
  this.mLogIndent()

  this.state.shared = false

  const color = this.getZoneByPlayer(player, card.color)

  // Store the biscuits now because changes caused by the dogma action should
  // not affect the number of biscuits used for evaluting the effect.
  const biscuits = this.getBiscuits()
  const primaryBiscuit = card.dogmaBiscuit

  const sharing = this
    .getPlayerAll()
    .filter(p => p !== player)
    .filter(p => biscuits[p.name][primaryBiscuit] >= biscuits[player.name][primaryBiscuit])

  const demanding = this
    .getPlayerAll()
    .filter(p => p !== player)
    .filter(p => biscuits[p.name][primaryBiscuit] < biscuits[player.name][primaryBiscuit])

  // Store the planned effects now, because changes caused by the dogma action
  // should not affect which effects are executed.
  const effectCards = color
    .cards
    .filter(card => card.checkEchoIsVisible(color.splay))
    .reverse()  // Start from the bottom of the stack when executing effects

  if (opts.artifact) {
    // Artifact biscuits are used only when taking the free dogma action.
    const extraBiscuits = this.getBiscuitsByCard(card)
    biscuits[player.name] = this.utilCombineBiscuits(biscuits[player.name], extraBiscuits)
  }

  // Regardless of normal dogma or artifact dogma, the selected card is executed last.
  if (card.dogma.length > 0) {
    effectCards.push(card)
  }

  const leader = this.getPlayerCurrent()
  for (const ecard of effectCards) {
    for (const player of this.getPlayersStartingNext()) {
      this.aCardEffects(leader, player, ecard, 'echo', biscuits, sharing, demanding)

      // Only the top card (or the artifact card for free artifact dogma actions)
      // get to do their dogma effects.
      if (ecard === card) {
        this.aCardEffects(leader, player, ecard, 'dogma', biscuits, sharing, demanding)
      }
    }
  }

  // Share bonus
  if (this.state.shared) {
    this.mLog({
      template: '{player} draws a sharing bonus',
      args: { player }
    })
    this.mLogIndent()
    this.aDraw(player, { exp: 'figs', share: true })
    this.mLogOutdent()
  }

  this.mLogOutdent()
}

Innovation.prototype.aDraw = function(player, opts={}) {
  const karmaKind = this.aKarma(player, 'draw', opts)
  if (karmaKind === 'would-instead') {
    return
  }

  const { age, share } = opts

  // Expansion the user should draw from, before looking at empty decks.
  const baseExp = opts.exp || this._determineBaseDrawExpansion(player, share)

  // If age is not specified, draw based on player's current highest top card.
  const highestTopCard = this.getHighestTopCard(player) || {}
  const baseAge = age || highestTopCard.age || 1

  // Adjust age based on empty decks.
  const [ adjustedAge, adjustedExp ] = this._adjustedDrawDeck(baseAge, baseExp)

  return this.mDraw(player, adjustedExp, adjustedAge, opts)
}

Innovation.prototype.aDrawAndForeshadow = function(player, age, opts={}) {
  const card = this.aDraw(player, {...opts, age })
  if (card) {
    return this.mForeshadow(player, card, opts)
  }
}

Innovation.prototype.aDrawAndMeld = function(player, age, opts={}) {
  const card = this.aDraw(player, {...opts, age })
  if (card) {
    return this.mMeld(player, card, opts)
  }
}

Innovation.prototype.aDrawAndReveal = function(player, age, opts={}) {
  const card = this.aDraw(player, {...opts, age })
  if (card) {
    return this.mReveal(player, card, opts)
  }
}

Innovation.prototype.aDrawAndScore = function(player, age, opts={}) {
  const card = this.aDraw(player, {...opts, age })
  if (card) {
    return this.aScore(player, card, opts)
  }
}

Innovation.prototype.aKarma = function(player, kind, opts={}) {

}

Innovation.prototype.aMeld = function(player, card, opts={}) {
  const karmaKind = this.aKarma(player, 'meld', { ...opts, card })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mMeld(player, card, opts)
}

Innovation.prototype.aReturn = function(player, card, opts={}) {
  const karmaKind = this.aKarma(player, 'return', { ...opts, card })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mReturn(player, card, opts)
}

Innovation.prototype.aScore = function(player, card, opts={}) {
  const karmaKind = this.aKarma(player, 'score', { ...opts, card })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mScore(player, card, opts)
}

Innovation.prototype.aScoreMany = function(player, cards, opts={}) {
  for (const card of [...cards]) {
    this.aScore(player, card, opts)
  }
}

Innovation.prototype.aSplay = function(player, color, direction, opts={}) {
  const karmaKind = this.aKarma(player, 'transfer', { ...opts, color, direction })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mSplay(player, color, direction, opts)
}

Innovation.prototype.aTransfer = function(player, card, target, opts={}) {
  const karmaKind = this.aKarma(player, 'transfer', { ...opts, card, target })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mTransfer(player, card, target, opts)
}

Innovation.prototype.aTransferMany = function(player, cards, target, opts={}) {
  for (const card of cards) {
    this.aTransfer(player, card, target, opts)
  }
}

Innovation.prototype.aTuck = function(player, card, opts={}) {
  const karmaKind = this.aKarma(player, 'tuck', { ...opts, card })
  if (karmaKind === 'would-instead') {
    return
  }

  return this.mTuck(player, card, opts)
}

Innovation.prototype.aYesNo = function(player, title) {
  const result = this.requestInputSingle({
    actor: player.name,
    title,
    choices: ['yes', 'no'],
  })[0]

  return result === 'yes'
}


////////////////////////////////////////////////////////////////////////////////
// Checkers

Innovation.prototype.checkAchievementAvailable = function(name) {
  return !!this.getZoneById('achievements').cards.find(ach => ach.name === name)
}

Innovation.prototype.checkCardIsTop = function(card) {
  return this.getZoneByCard(card).cards[0] === card
}

Innovation.prototype.checkSameTeam = function(p1, p2) {
  return p1.team === p2.team
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
    .reduce((l, r) => this.utilCombineBiscuits(l, r))

  return this
    .getCardsByKarmaTrigger(player, 'calculate-biscuits')
    .map(card => this.utilApplyKarma(card, 'calculate-biscuits', this, player, board))
    .reduce((l, r) => this.utilCombineBiscuits(l, r), boardBiscuits)
}

Innovation.prototype.getBiscuitsByCard = function(card) {
  return this.utilParseBiscuits(card.getBiscuits())
}

Innovation.prototype.getBiscuitsByZone = function(zone) {
  return zone
    .cards
    .map(card => this.getBiscuitsRaw(card, zone.splay))
    .map(biscuitString => this.utilParseBiscuits(biscuitString))
    .reduce((l, r) => this.utilCombineBiscuits(l, r), this.utilEmptyBiscuits())
}

Innovation.prototype.getBiscuitsRaw = function(card, splay) {
  return this.checkCardIsTop(card)
       ? card.getBiscuits('top')
       : card.getBiscuits(splay)
}

Innovation.prototype.getBonuses = function(player) {
  const rx = /([ab1-9])/g
  const bonuses = this
    .utilColors()
    .map(color => this.getZoneByPlayer(player, color))
    .flatMap(zone => zone.cards.map(card => this.getBiscuitsRaw(card, zone.splay)))
    .flatMap(biscuits => biscuits.match(rx))
    .filter(bonus => bonus !== null)
    .map(bonus => {
      switch (bonus) {
        case 'a': return 10;
        case 'b': return 11;
        default: return parseInt(bonus)
      }
    })

  bonuses.sort((l, r) => r - l)
  return bonuses
}

Innovation.prototype.getCardByName = function(name) {
  util.assert(res.all.byName.hasOwnProperty(name), `Unknown card: ${name}`)
  return res.all.byName[name]
}

Innovation.prototype.getCardsByKarmaTrigger = function(player, trigger) {
  return this
    .getTopCards(player)
    .filter(card => card.hasKarma(trigger))
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
  let indent = 0
  for (const msg of this.getLog()) {
    if (msg === '__INDENT__') {
      indent += 1
    }
    else if (msg === '__OUTDENT__') {
      indent -= 1
    }
  }
  return indent
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

Innovation.prototype.getPlayerOpponents = function(player) {
  return this
    .getPlayerAll()
    .filter(p => !this.checkSameTeam(p, player))
}

// Return an array of all players, starting with the current player.
Innovation.prototype.getPlayersStartingCurrent = function() {
  const players = [...this.getPlayerAll()]
  while (players[0] !== this.getPlayerCurrent()) {
    players.push(players.shift())
  }
  return players
}

// Return an array of all players, starting with the player who will follow the current player.
// Commonly used when evaluating effects
Innovation.prototype.getPlayersStartingNext = function() {
  const players = [...this.getPlayerAll()]
  while (players[players.length - 1] !== this.getPlayerCurrent()) {
    players.push(players.shift())
  }
  return players
}

Innovation.prototype.getScore = function(player) {
  const inScore = this
    .getZoneByPlayer(player, 'score')
    .cards
    .reduce((l, r) => l + r.age, 0)

  // Bonuses
  const bonuses = this.getBonuses(player)
  const bonusPoints = (bonuses[0] || 1) + (bonuses.length - 1)

  const karma = this
    .getCardsByKarmaTrigger(player, 'calculate-score')
    .map(card => this.utilApplyKarma(card, 'calculate-score', this, player))
    .reduce((l, r) => l + r, 0)

  return inScore + bonusPoints + karma
}

Innovation.prototype.getTopCard = function(player, color) {
  return this
    .getZoneByPlayer(player, color)
    .cards[0]
}

Innovation.prototype.getTopCards = function(player) {
  return this
    .utilColors()
    .map(color => this.getZoneByPlayer(player, color))
    .map(zone => zone.cards[0])
    .filter(card => card !== undefined)
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

Innovation.prototype.mAchievementCheck = function() {
  const available = this.getZoneById('achievements').cards
  for (const player of this.getPlayersStartingCurrent()) {
    for (const card of available) {
      if (card.checkPlayerIsEligible && card.checkPlayerIsEligible(this, player)) {
        // It is safe to return here. Claiming an achievement will retrigger this
        // function, allowing players to claim more than one achievement per turn.
        return this.aClaimAchievement(player, { card })
      }
    }
  }
}

Innovation.prototype.mAchieve = function(player, card) {
  const target = this.getZoneByPlayer(player, 'achievements')
  this.mLog({
    template: '{player} achieves {card}',
    args: { player, card }
  })
  this.mMoveCardTo(card, target)
  this.mActed(player)
  return card
}

Innovation.prototype.mActed = function(player) {
  if (!this.state.initializationComplete || !this.state.firstPicksComplete) {
    return
  }

  if (!this.checkSameTeam(player, this.getPlayerCurrent())) {
    this.state.shared = true
  }

  // Any time someone acts, there is the possibility that they should claim
  // a special achievement.
  this.mAchievementCheck()
}

Innovation.prototype.mAdjustCardVisibility = function(card) {
  if (!this.state.initializationComplete) {
    return
  }

  const zone = this.getZoneByCard(card)

  // Achievements are always face down.
  if (zone.kind === 'achievements') {
    card.visibility = []
  }

  // Forget everything about a card if it is returned.
  else if (zone.kind === 'deck') {
    card.visibility = []
  }

  else if (zone.kind === 'public') {
    card.visibility = this.getPlayerAll().map(p => p.name)
  }

  else if (zone.kind === 'private') {
    util.array.pushUnique(card.visibility, zone.owner)
  }

  else {
    throw new Error(`Unknown zone kind ${zone.kind} for zone ${zone.id}`)
  }
}

Innovation.prototype.mDraw = function(player, exp, age, opts={}) {
  if (age > 10) {
    throw new GameOverEvent({
      reason: 'high draw',
      player,
      age,
    })
  }

  const source = this.getZoneByDeck(exp, age)
  const hand = this.getZoneByPlayer(player, 'hand')
  const card = this.mMoveTopCard(source, hand)

  if (!opts.silent) {
    this.mLog({
      template: '{player} draws {card}',
      args: { player, card }
    })
  }

  this.mActed(player)
  return card
}

Innovation.prototype.mForeshadow = function(player, card) {
  const target = this.getZoneByPlayer(player, 'forecast')
  this.mMoveCardTo(card, target)
  this.mLog({
    template: '{player} foreshadows {card}',
    args: { player, card }
  })
  this.mActed(player)
  return card
}

Innovation.prototype.mMeld = function(player, card) {
  const source = this.getZoneByCard(card)
  const target = this.getZoneByPlayer(player, card.color)
  const sourceIndex = source.cards.indexOf(card)

  this.mMoveByIndices(source, sourceIndex, target, 0)
  this.mLog({
    template: '{player} melds {card}',
    args: { player, card }
  })

  this.mActed(player)
  return card
}

Innovation.prototype.mMoveByIndices = function(source, sourceIndex, target, targetIndex) {
  util.assert(sourceIndex >= 0 && sourceIndex <= source.cards.length - 1, `Invalid source index ${sourceIndex}`)
  const sourceCards = source.cards
  const targetCards = target.cards
  const card = sourceCards[sourceIndex]
  sourceCards.splice(sourceIndex, 1)
  targetCards.splice(targetIndex, 0, card)
  card.zone = target.id
  this.mAdjustCardVisibility(card)
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

Innovation.prototype.mMoveCardToTop = function(card, target) {
  const source = this.getZoneByCard(card)
  const sourceIndex = source.cards.findIndex(c => c === card)
  return this.mMoveByIndices(source, sourceIndex, target, 0)
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

Innovation.prototype.mLogDoNothing = function(player) {
  this.mLog({
    template: '{player} does nothing',
    args: { player }
  })
}

Innovation.prototype.mLogNoEffect = function() {
  this.mLog({ template: 'no effect' })
}

Innovation.prototype.mLogIndent = function() {
  this.state.log.push('__INDENT__')
}

Innovation.prototype.mLogOutdent = function() {
  this.state.log.push('__OUTDENT__')
}

Innovation.prototype.mResetDogmaInfo = function() {
  this.state.dogmaInfo = {}
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

  this.mActed(player)
  return card
}

Innovation.prototype.mReveal = function(player, card) {
  card.visibility = this.getPlayerAll().map(p => p.name)
  this.mLog({
    template: '{player} reveals {card}',
    args: { player, card }
  })
  this.mActed(player)
  return card
}

Innovation.prototype.mScore = function(player, card) {
  const target = this.getZoneByPlayer(player, 'score')
  this.mMoveCardTo(card, target)
  this.mLog({
    template: '{player} scores {card}',
    args: { player, card }
  })
  this.state.monument[player.name].score += 1
  this.mActed(player)
  return card
}

Innovation.prototype.mSplay = function(player, color, direction) {
  const target = this.getZoneByPlayer(player, color)
  if (target.splay !== direction) {
    target.splay = direction
    this.mLog({
      template: '{player} splays {color} {direction}',
      args: { player, color, direction }
    })
    this.mActed(player)
  }
}

Innovation.prototype.mTransfer = function(player, card, target) {
  this.mMoveCardTo(card, target)
  this.mLog({
    template: '{player} transfers {card} to {zone}',
    args: { player, card, zone: target }
  })
  this.mActed(player)
  return card
}

Innovation.prototype.mTuck = function(player, card) {
  const target = this.getZoneByPlayer(player, card.color)
  this.mMoveCardTo(card, target)
  this.mLog({
    template: '{player} tucks {card}',
    args: { player, card }
  })
  this.state.monument[player.name].tuck += 1
  this.mActed(player)
  return card
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

      let name
      if (card.isSpecialAchievement) {
        name = card.name
      }
      else {
        const hiddenName = `*${card.expansion}${card.age}*`
        name = card.visibility.includes(this.viewerName) ? card.name : hiddenName
      }

      const classes = ['card']
      if (card.age) {
        classes.push(`card-age-${card.age}`)
      }
      if (card.expansion) {
        classes.push(`card-exp-${card.expansion}`)
      }
      if (name === 'hidden') {
        classes.push('card-hidden')
      }

      msg.args[key] = {
        value: name,
        classes,
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
Innovation.prototype._determineBaseDrawExpansion = function(player) {
  if (this.getExpansionList().includes('echo')) {
    const hand = this.getZoneByPlayer(player, 'hand')
    const echoesCards = hand.cards.filter(c => c.expansion === 'echo')
    if (hand.cards.length > 0 && echoesCards.length === 0) {
      return 'echo'
    }
  }
  return 'base'
}

Innovation.prototype._generateActionChoices = function() {
  const choices = []
  choices.push(this._generateActionChoicesAchieve())
  //choices.push(this._generateActionChoicesDecree())
  choices.push(this._generateActionChoicesDogma())
  choices.push(this._generateActionChoicesDraw())
  //choices.push(this._generateActionChoicesEndorse())
  //choices.push(this._generateActionChoicesInspire())
  choices.push(this._generateActionChoicesMeld())
  return choices
}

Innovation.prototype._scoreCost = function(player, card) {
  const sameAge = this
    .getZoneByPlayer(player, 'achievements')
    .cards
    .filter(c => c.age === card.age)

  return card.age * 5 * (sameAge.length + 1)
}

Innovation.prototype._generateActionChoicesAchieve = function() {
  const player = this.getPlayerCurrent()
  const playerScore = this.getScore(player)
  const topCard = this.getHighestTopCard(player)
  const topCardAge = topCard ? topCard.age : 0
  const eligible = this
    .getZoneById('achievements')
    .cards
    .filter(c => !c.isSpecialAchievement)
    .filter(card => {
      const ageRequirement = card.age <= topCardAge
      const scoreRequirement = this._scoreCost(player, card) <= playerScore
      return ageRequirement && scoreRequirement
    })
    .map(ach => `age ${ach.age}`)
    .sort()
  const distinct = util.array.distinct(eligible).sort()

  return {
    name: 'Achieve',
    choices: distinct
  }
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
