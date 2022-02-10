Error.stackTraceLimit = 100

const t = require('../../src/testutil.js')

describe('Augustus Caesar', () => {
  test('inspire', () => {
    const game = t.fixtureTopCard('Augustus Caesar', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setDeckTop(game, 'base', 3, ['Machinery'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.green')

    t.testZone(game, 'forecast', ['Machinery'])
  })

  test('karma (foreshadow)', () => {
    const game = t.fixtureTopCard('Augustus Caesar', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setDeckTop(game, 'base', 3, ['Engineering'])
      t.setColor(game, 'dennis', 'red', ['Archery'])
      t.setForecast(game, 'dennis', ['Construction', 'Tools'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.green')

    t.testZone(game, 'red', ['Engineering', 'Archery', 'Construction'])
    t.testZone(game, 'blue', ['Tools'])
    t.testZone(game, 'forecast', [])
  })

  test('karma (no color match)', () => {
    const game = t.fixtureTopCard('Augustus Caesar', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setDeckTop(game, 'base', 3, ['Machinery'])
      t.setColor(game, 'dennis', 'red', ['Archery'])
      t.setForecast(game, 'dennis', ['Tools'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.green')

    t.testZone(game, 'red', ['Archery'])
    t.testZone(game, 'forecast', ['Machinery', 'Tools'], { sort: true })
  })

  test('karma (no biscuit match)', () => {
    const game = t.fixtureTopCard('Augustus Caesar', { expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setDeckTop(game, 'base', 3, ['Optics'])
      t.setColor(game, 'dennis', 'red', ['Archery'])
      t.setForecast(game, 'dennis', ['Tools'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Inspire.green')

    t.testZone(game, 'red', ['Archery'])
    t.testZone(game, 'forecast', ['Optics', 'Tools'], { sort: true })
  })

  test.only('karma (other player, using meld)', () => {
    const game = t.fixtureFirstPlayer({ expansions: ['base', 'figs'] })
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'micah', 'red', ['Archery'])
      t.setColor(game, 'micah', 'green', ['Augustus Caesar'])
      t.setForecast(game, 'micah', ['Construction', 'Tools'])
      t.setHand(game, 'dennis', ['The Wheel'])
    })
    const request1 = game.run()
    const request2 = t.choose(game, request1, 'Meld.The Wheel')

    t.testZone(game, 'red', ['Archery', 'Construction'], { player: 'micah' })
    t.testZone(game, 'blue', ['Tools'], { player: 'micah' })
    t.testZone(game, 'green', ['The Wheel', 'Augustus Caesar'], { player: 'micah' })
    t.testZone(game, 'forecast', [], { player: 'micah' })
  })
})
