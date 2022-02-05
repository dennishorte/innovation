const CardBase = require(`../CardBase.js`)

function Card() {
  this.id = `Mapmaking`  // Card names are unique in Innovation
  this.name = `Mapmaking`
  this.color = `green`
  this.age = 2
  this.expansion = `base`
  this.biscuits = `hcck`
  this.dogmaBiscuit = `c`
  this.inspire = ``
  this.echo = ``
  this.karma = []
  this.dogma = [
    `I demand you transfer a {1} from your score pile, if it has any, to my score pile.`,
    `If any card was transferred due to the demand, draw and score a {1}.`
  ]

  this.dogmaImpl = [
    (game, player, { leader }) => {
      const choices = game
        .getZoneByPlayer(player, 'score')
        .cards
        .filter(card => card.age === 1)
        .map(card => card.id)

      const transferredCard = game.aChooseAndTransfer({
        actor: player.name,
        title: 'Choose a Card',
        choices,
        target: game.getZoneByPlayer(leader, 'score'),
      })

      if (transferredCard) {
        game.state.dogmaInfo.transferred = true
      }
    },

    (game, player) => {
      if (game.state.dogmaInfo.transferred) {
        game.aDrawAndScore(player, 1)
      }
      else {
        game.mLogNoEffect()
      }
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
