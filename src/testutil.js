const { InnovationFactory } = require('./innovation.js')

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

  const game = InnovationFactory(options)

  game.testSetBreakpoint('initialization-complete', (game) => {
    TestUtil.clearHands(game)
    TestUtil.setHand(game, 'dennis', ['Archery', 'Domestication'])
    TestUtil.setHand(game, 'micah', ['Mysticism', 'Code of Laws'])
  })

  return game
}

TestUtil.clearHands = function(game) {
  for (const player of game.getPlayerAll()) {
    const cards = [...game.getZoneByPlayer(player, 'hand').cards]
    for (const card of cards) {
      game.mMoveCardTo(card, game.getZoneById(card.home))
    }
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
