const {
  GameOverEvent,
  InputRequestEvent,
} = require('./game.js')

const t = require('./testutil.js')

describe('fixture', () => {
  test('player hands are set as expected', () => {
    const game = t.fixture()
    game.run()

    const dennis = game
      .getZoneByPlayer(game.getPlayerByName('dennis'), 'hand')
      .cards
      .map(c => c.name)
      .sort()
    expect(dennis).toStrictEqual(['Archery', 'Domestication'])

    const micah = game
      .getZoneByPlayer(game.getPlayerByName('micah'), 'hand')
      .cards
      .map(c => c.name)
      .sort()
    expect(micah).toStrictEqual(['Code of Laws', 'Mysticism'])
  })

  test('setColor', () => {
    const game = t.fixtureFirstPlayer()
    game.testSetBreakpoint('before-first-player', (game) => {
      t.setColor(game, 'dennis', 'red', ['Gunpowder', 'Industrialization'])
    })
    game.run()
    const dennis = game.getPlayerByName('dennis')

    const redCardNames = game.getZoneByPlayer(dennis, 'red').cards.map(c => c.name).sort()
    expect(redCardNames).toStrictEqual(['Gunpowder', 'Industrialization'])
  })
})

describe('Innovation', () => {
  test('game initializes', () => {
    const game = t.fixture()
    game.run()
  })

  describe('first picks', () => {
    test('all players can pick at once', () => {
      const game = t.fixture()
      const result = game.run()

      expect(result).toBeInstanceOf(InputRequestEvent)
      expect(result.selectors.length).toBe(2)
      expect(result.selectors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          actor: 'dennis',
          title: 'Choose First Card',
        }),
        expect.objectContaining({
          actor: 'micah',
          title: 'Choose First Card',
        }),
      ]))
    })

    test('after picking, selected cards are played', () => {
      const game = t.fixture()
      const request1 = game.run()
      const request2 = game.respondToInputRequest({
        actor: 'micah',
        title: 'Choose First Card',
        selection: ['Code of Laws'],
        key: request1.key
      })
      const request3 = game.respondToInputRequest({
        actor: 'dennis',
        title: 'Choose First Card',
        selection: ['Archery'],
        key: request1.key
      })

      const dennisRed = game
        .getZoneByPlayer(game.getPlayerByName('dennis'), 'red')
        .cards
        .map(c => c.name)
      expect(dennisRed).toStrictEqual(['Archery'])

      const micahPurple = game
        .getZoneByPlayer(game.getPlayerByName('micah'), 'purple')
        .cards
        .map(c => c.name)
      expect(micahPurple).toStrictEqual(['Code of Laws'])
    })

    test('player closest to start of alphabet goes first (test a)', () => {
      const game = t.fixture()
      const request1 = game.run()
      const request2 = game.respondToInputRequest({
        actor: 'micah',
        title: 'Choose First Card',
        selection: ['Code of Laws'],
        key: request1.key
      })
      const request3 = game.respondToInputRequest({
        actor: 'dennis',
        title: 'Choose First Card',
        selection: ['Archery'],
        key: request1.key
      })

      expect(game.getPlayerCurrent().name).toBe('dennis')
    })

    test('player closest to start of alphabet goes first (test b)', () => {
      const game = t.fixture()
      const request1 = game.run()
      const request2 = game.respondToInputRequest({
        actor: 'micah',
        title: 'Choose First Card',
        selection: ['Code of Laws'],
        key: request1.key
      })
      const request3 = game.respondToInputRequest({
        actor: 'dennis',
        title: 'Choose First Card',
        selection: ['Domestication'],
        key: request1.key
      })

      expect(game.getPlayerCurrent().name).toBe('micah')
    })
  })

  describe('actions', () => {
    describe('first player gets only one action', () => {
      test('two players', () => {

      })

      test('three players', () => {

      })

      test('four players', () => {

      })
    })

    describe('draw action', () => {
      test('player draws a card based on top card age (test 1)', () => {
        const game = t.fixtureFirstPlayer()
        const request = game.run()
        const dennis = game.getPlayerByName('dennis')

        expect(game.getZoneByPlayer(dennis, 'hand').cards.length).toBe(1)

        t.choose(game, request, 'Draw.draw a card')

        const dennisCards = game.getZoneByPlayer(dennis, 'hand').cards
        expect(dennisCards.length).toBe(2)
        expect(dennisCards.map(c => c.age).sort()).toStrictEqual([1, 1])
      })

      test('player draws a card based on top card age (test 2)', () => {
        const game = t.fixtureFirstPlayer()
        game.testSetBreakpoint('before-first-player', (game) => {
          t.setColor(game, 'dennis', 'purple', ['Specialization'])
        })

        const request = game.run()
        const dennis = game.getPlayerByName('dennis')

        expect(game.getZoneByPlayer(dennis, 'hand').cards.length).toBe(1)

        t.choose(game, request, 'Draw.draw a card')

        const dennisCards = game.getZoneByPlayer(dennis, 'hand').cards
        expect(dennisCards.length).toBe(2)
        expect(dennisCards.map(c => c.age).sort()).toStrictEqual([1, 9])
      })

      test('draw an 11 ends the game', () => {
        const game = t.fixtureFirstPlayer()
        game.run()
        const trigger = () => {
          game.mDraw(game.getPlayerByName('dennis'), 'base', 11)
        }
        expect(trigger).toThrow(GameOverEvent)
      })
    })
  })

  describe('meld action', () => {
    test('card goes on top', () => {

    })

    test('forecast', () => {

    })

    test('achievement trigger', () => {

    })

    describe.skip('cities', () => {
      test('draw a city for first card of color', () => {

      })

      test('plus icon', () => {

      })

      test('splay left icon', () => {

      })

      test('splay right icon', () => {

      })

      test('splay up icon', () => {

      })

      test('biscuit', () => {

      })
    })

    describe.skip('artifacts', () => {
      test('hex position matching', () => {

      })

      test('same age', () => {

      })

      test('lower age', () => {

      })

      test('higher age (no trigger)', () => {

      })
    })
  })

  describe.skip('logs', () => {
    test('card not visible', () => {
      const game = t.fixtureFirstPlayer()
      const request = game.run()
      t.choose(game, request, 'Draw.draw a card')
      //t.dumpLog(game)
    })
  })
})
