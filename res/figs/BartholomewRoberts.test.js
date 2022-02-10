Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Bartholomew Roberts', () => {
  test('inspire', () => {
    const game = t.fixtureTopCard('Bartholomew Roberts', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Construction'])
      t.setColor(game, 'micah', 'green', ['The Wheel'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.green')

    t.testChoices(request2, ['Construction', 'The Wheel'])

    const request3 = t.choose(game, request2, 'The Wheel')

    t.testZone(game, 'score', ['The Wheel'])
  })

  test('karma (success)', () => {
    const game = t.fixtureTopCard('Bartholomew Roberts', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Machine Tools'])
      t.setScore(game, 'dennis', ['Canning', 'Atomic Theory', 'Metric System', 'Encyclopedia', 'Industrialization'])
      t.setDeckTop(game, 'base', 6, ['Vaccination'])
      t.setAvailableAchievements(game, ['Societies', 'Classification', 'Lighting'])
    })
    const request1 = game.run()

    const request2 = t.choose(game, request1, 'Dogma.Machine Tools')

    t.testZone(game, 'score', ['Canning', 'Atomic Theory', 'Metric System', 'Encyclopedia', 'Industrialization', 'Vaccination'])
    t.testZone(game, 'achievements', ['Classification'])
  })

  test('karma (point restriction)', () => {
    const game = t.fixtureTopCard('Bartholomew Roberts', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Machine Tools'])
      t.setScore(game, 'dennis', ['Canning', 'Atomic Theory', 'Encyclopedia'])
      t.setDeckTop(game, 'base', 6, ['Vaccination'])
      t.setAvailableAchievements(game, ['Societies', 'Classification', 'Lighting'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Dogma.Machine Tools')

    t.testZone(game, 'score', ['Canning', 'Atomic Theory', 'Encyclopedia', 'Vaccination'])
    t.testZone(game, 'achievements', [])
  })
})
