Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Reformation', () => {
  describe('Tuck cards', () => {
    test('choose not to tuck', () => {
      const game = t.fixtureTopCard('Reformation')
      game.testSetBreakpoint('before-first-player', (game) => {
        t.setColor(game, 'dennis', 'green', ['Clothing'])
        t.setHand(game, 'dennis', ['Mapmaking', 'Currency', 'Philosophy'])
      })
      const request1 = game.run()
      const request2 = t.choose(game, request1, 'Dogma.Reformation')
      t.choose(game, request2, 'no')

      expect(t.cards(game, 'green')).toStrictEqual(['Clothing'])
    })

    test('number of leaf biscuits on board', () => {
      const game = t.fixtureTopCard('Reformation')
      game.testSetBreakpoint('before-first-player', (game) => {
        t.setColor(game, 'dennis', 'green', ['Clothing'])
        t.setHand(game, 'dennis', ['Mapmaking', 'Currency', 'Philosophy'])
      })
      const request1 = game.run()
      const request2 = t.choose(game, request1, 'Dogma.Reformation')
      const request3 = t.choose(game, request2, 'yes')
      const request4 = t.choose(game, request3, 'Mapmaking', 'Currency')

      expect(t.cards(game, 'green')).toStrictEqual(['Clothing', 'Currency', 'Mapmaking'])
    })
  })

  describe('splay', () => {
    test('can splay', () => {
      const game = t.fixtureTopCard('Reformation')
      game.testSetBreakpoint('before-first-player', (game) => {
        t.setColor(game, 'dennis', 'green', ['Clothing'])
        t.setColor(game, 'dennis', 'yellow', ['Statistics', 'Masonry'])
        t.setHand(game, 'dennis', ['Mapmaking', 'Currency', 'Philosophy'])
      })
      const request1 = game.run()
      const request2 = t.choose(game, request1, 'Dogma.Reformation')
      const request3 = t.choose(game, request2, 'no')
      const request4 = t.choose(game, request3, 'yellow')

      expect(t.zone(game, 'yellow').splay).toBe('right')
    })
  })
})
