Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Agriculture', () => {
  test('return a card', () => {
    const game = t.fixtureTopCard('Agriculture')
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Dogma.Agriculture')
    t.choose(game, request2, 'Choose a Card.Writing')

    const dennis = game.getPlayerByName('dennis')
    expect(game.getScore(dennis)).toBe(2)
  })

  test('do not return a card', () => {
    const game = t.fixtureTopCard('Agriculture')
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Dogma.Agriculture')
    t.choose(game, request2, 'Choose a Card.*')

    const dennis = game.getPlayerByName('dennis')
    expect(game.getScore(dennis)).toBe(0)
  })
})
