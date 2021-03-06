const t = require('../../../src/testutil.js')

test('Expansion', () => {
  const game = t.fixtureDecrees()
  game.testSetBreakpoint('before-first-player', (game) => {
    t.setColor(game, 'dennis', 'yellow', ['Statistics', 'Masonry'])
  })
  const request1 = game.run()
  const request2 = t.choose(game, request1, 'Decree.Expansion')
  const request3 = t.choose(game, request2, 'auto')

  expect(t.zone(game, 'yellow').splay).toBe('up')
})
