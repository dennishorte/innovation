const t = require('../../src/testutil.js')

describe('Writing', () => {
  test('draw a 2', () => {
    const game = t.fixtureTopCard('Writing')
    const request = game.run()
    t.choose(game, request, 'Dogma.Writing')

    const dennis = game.getPlayerByName('dennis')
    const dennisHandAges = game.getZoneByPlayer(dennis, 'hand').cards.map(c => c.age).sort()
    expect(dennisHandAges).toStrictEqual([1, 2])
  })
})
