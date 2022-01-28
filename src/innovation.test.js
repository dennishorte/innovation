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
})
