const { InnovationFactory } = require('./innovation.js')
const log = require('./log.js')


const TestUtil = {}

TestUtil.fixture = function(options) {
  options = Object.assign({
    name: 'test_game',
    seed: 'test_seed',
    expansions: ['base'],
    numPlayers: 2,
    players: [
      {
        _id: 'dennis_id',
        name: 'dennis',
      },
      {
        _id: 'micah_id',
        name: 'micah',
      },
      {
        _id: 'scott_id',
        name: 'scott',
      },
      {
        _id: 'eliya_id',
        name: 'eliya',
      },
    ]
  }, options)

  options.players = options.players.slice(0, options.numPlayers)

  const game = InnovationFactory(options, 'dennis')

  game.testSetBreakpoint('initialization-complete', (game) => {
    // Set turn order
    game.state.players = ['dennis', 'micah', 'scott', 'eliya']
      .slice(0, game.settings.numPlayers)
      .map(name => game.getPlayerByName(name))
      .filter(p => p !== undefined)

    // Set initial cards in hand
    TestUtil.clearHands(game)
    TestUtil.setHand(game, 'dennis', ['Archery', 'Domestication'])
    TestUtil.setHand(game, 'micah', ['Mysticism', 'Code of Laws'])
    if (options.numPlayers >= 3) {
      TestUtil.sethand(game, 'scott', ['Sailing', 'The Wheel'])
    }
    if (options.numPlayers >= 4) {
      TestUtil.setHand(game, 'eliya', ['Oars', 'Writing'])
    }
  })

  return game
}

TestUtil.fixtureFirstPlayer = function(options) {
  const game = TestUtil.fixture(options)
  const request1 = game.run()
  game.respondToInputRequest({
    actor: 'dennis',
    title: 'Choose First Card',
    selection: ['Archery'],
    key: request1.key
  })
  game.respondToInputRequest({
    actor: 'micah',
    title: 'Choose First Card',
    selection: ['Code of Laws'],
    key: request1.key
  })
  if (game.settings.numPlayers >= 3) {
    game.respondToInputRequest({
      actor: 'scott',
      title: 'Choose First Card',
      selection: ['Sailing'],
      key: request1.key
    })
  }
  if (game.settings.numPlayers >= 4) {
    game.respondToInputRequest({
      actor: 'eliya',
      title: 'Choose First Card',
      selection: ['Writing'],
      key: request1.key
    })
  }

  return game
}

TestUtil.choose = function(game, request, ...selections) {
  const selector = request.selectors[0]
  selections = selections.map(string => {
    const tokens = string.split('.')
    if (tokens.length === 1) {
      return tokens[0]
    }
    else if (tokens.length === 2) {
      return {
        name: tokens[0],
        selection: [tokens[1]]
      }
    }
    else {
      throw new Error(`Selection is too deep: ${string}`)
    }
  })

  return game.respondToInputRequest({
    actor: selector.actor,
    title: selector.title,
    selection: selections,
    key: request.key,
  })
}

TestUtil.clearHands = function(game) {
  for (const player of game.getPlayerAll()) {
    const cards = [...game.getZoneByPlayer(player, 'hand').cards]
    for (const card of cards) {
      game.mMoveCardTo(card, game.getZoneById(card.home))
    }
  }
}

TestUtil.setColor = function(game, playerName, colorName, cardNames) {
  const player = game.getPlayerByName(playerName)
  const zone = game.getZoneByPlayer(player, colorName)
  const cards = cardNames.map(name => game.getCardByName(name))
  for (const card of [...zone.cards]) {
    game.mReturn(player, card, { silent: true })
  }
  for (const card of cards) {
    game.mMoveCardTo(card, zone)
  }
}

TestUtil.setHand = function(game, playerName, cardNames) {
  const player = game.getPlayerByName(playerName)
  const hand = game.getZoneByPlayer(player, 'hand')
  for (const name of cardNames) {
    const card = game.getCardByName(name)
    game.mMoveCardTo(card, hand)
  }
}


////////////////////////////////////////////////////////////////////////////////
// State Inspectors

TestUtil.deepLog = function(obj) {
  console.log(JSON.stringify(obj, null, 2))
}

TestUtil.dumpLog = function(game) {
  const output = []
  for (const entry of game.getLog()) {
    if (entry === '__INDENT__' || entry === '__OUTDENT__') {
      continue
    }
    output.push(log.toString(entry))
  }
  console.log(output.join('\n'))
}

function _dumpZonesRecursive(root, indent=0) {
  const output = []

  if (root.id) {
    output.push(root.id)
    for (const card of root.cards) {
      output.push(`   ${card.id}`)
    }
  }

  else {
    for (const zone of Object.values(root)) {
      output.push(_dumpZonesRecursive(zone, indent+1))
    }
  }

  return output.join('\n')
}

TestUtil.dumpZones = function(root) {
  console.log(_dumpZonesRecursive(root))
}


module.exports = TestUtil
