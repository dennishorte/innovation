Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Sun Tzu', () => {

  test('inspire', () => {
    const game = t.fixtureFirstPlayer({ expansions: ['base', 'figs'] })
    t.setBoard(game, {
      dennis: {
        red: ['Sun Tzu'],
      },
      decks: {
        base: {
          2: ['Calendar', 'Fermenting'],
        }
      }
    })

    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.red')

    t.testIsSecondPlayer(request2)
    t.testBoard(game, {
      dennis: {
        red: ['Sun Tzu'],
        hand: ['Calendar', 'Fermenting'],
      },
    })
  })

  test('karma: decree', () => {
    t.testDecreeForTwo('Sun Tzu', 'War')
  })

  test('karma', () => {
    const game = t.fixtureFirstPlayer({ expansions: ['base', 'figs'] })
    t.setBoard(game, {
      dennis: {
        red: ['Sun Tzu'],
        green: ['The Wheel'],
        hand: ['Construction'],
      },
      micah: {
        yellow: ['Masonry'],
        purple: ['Monotheism'],
      },
      decks: {
        base: {
          1: ['Tools', 'Domestication', 'Sailing', 'Archery'],
        },
        figs: {
          2: ['Archimedes'],
        }
      }
    })

    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Dogma.The Wheel')

    t.testChoices(request2, ['Construction', 'Archery'])

    const request3 = t.choose(game, request2, 'Construction', 'Archery')
    const request4 = t.choose(game, request3, 'Archery')

    t.testIsSecondPlayer(request4)
    t.testBoard(game, {
      dennis: {
        red: ['Construction', 'Archery', 'Sun Tzu'],
        green: ['The Wheel'],
        hand: ['Sailing', 'Archimedes'],
      },
      micah: {
        yellow: ['Masonry'],
        purple: ['Monotheism'],
        hand: ['Tools', 'Domestication'],
      },
    })
  })
})
