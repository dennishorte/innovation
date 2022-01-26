const CardBase = require(`../CardBase.js`)

function Card() {
  this.id = `Domestication`  // Card names are unique in Innovation
  this.name = `Domestication`
  this.color = `yellow`
  this.age = 1
  this.expansion = `base`
  this.biscuits = `kchk`
  this.dogmaBiscuit = `k`
  this.inspire = ``
  this.echo = ``
  this.karma = []
  this.dogma = [
    `Meld the lowest card in your hand. Draw a {1}.`
  ]

  this.dogmaImpl = [
    {
      dogma: `Meld the lowest card in your hand. Draw a {1}.`,
      func(game, player) {
        const sortedHand = game
          .getHand(player)
          .cards
          .map(game.getCardData)
          .sort((l, r) => l.age - r.age)

        const lowest = hand.length > 0 ? hand[0].age : undefined
        const lowestCards = hand
          .filter(d => d.age === lowest)
          .map(c => c.id)

        const chosen = game.aChoose(context, {
          playerName: player.name,
          kind: 'Cards',
          choices: lowestCards,
          reason: 'Domestication: Meld the lowest card in your hand.',
        })

        if (chosen.length === 0) {
          game.mLog({
            template: '{player} melds nothing',
            args: { player }
          })
        }
        else {
          game.mMeld(player, chosen[0])
        }

        game.mDraw(player, 1)
      },
    },
  ]
  this.echoImpl = []
  this.inspireImpl = []
  this.karmaImpl = []
}

Card.prototype = Object.create(CardBase.prototype)
Object.defineProperty(Card.prototype, `constructor`, {
  value: Card,
  enumerable: false,
  writable: true
})

module.exports = Card
