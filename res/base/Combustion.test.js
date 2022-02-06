Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Combustion', () => {
  test('demand', () => {
    const game = t.fixtureTopCard('Combustion')
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Combustion', 'Construction'])
      t.setColor(game, 'dennis', 'green', ['Navigation'])
      t.setColor(game, 'dennis', 'blue', ['Translation'])
      t.setScore(game, 'micah', ['Tools', 'Calendar', 'Mathematics'])
    })
    const result1 = game.run()
    const result2 = t.choose(game, result1, 'Dogma.Combustion')

    expect(result2.selectors[0].actor).toBe('micah')
    expect(result2.selectors[0].title).toBe('Choose Card(s)')
    expect(result2.selectors[0].count).toBe(2)

    const result3 = t.choose(game, result2, 'Tools', 'Calendar')

    expect(t.cards(game, 'score').sort()).toStrictEqual(['Calendar', 'Tools'])
    expect(t.cards(game, 'score', 'micah')).toStrictEqual(['Mathematics'])
  })

  test('return', () => {
    const game = t.fixtureTopCard('Combustion')
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Combustion', 'Construction'])
      t.setColor(game, 'dennis', 'green', ['Navigation'])
      t.setColor(game, 'dennis', 'blue', ['Translation'])
      t.setScore(game, 'micah', ['Tools', 'Calendar', 'Mathematics'])
    })
    const result1 = game.run()
    const result2 = t.choose(game, result1, 'Dogma.Combustion')
    const result3 = t.choose(game, result2, 'Tools', 'Calendar')

    expect(t.cards(game, 'red')).toStrictEqual(['Combustion'])
    expect(game.getCardByName('Construction').zone).toBe('decks.base.2')
  })
})
