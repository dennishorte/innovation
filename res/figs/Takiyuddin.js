const CardBase = require(`../CardBase.js`)

function Card() {
  this.id = `Takiyuddin`  // Card names are unique in Innovation
  this.name = `Takiyuddin`
  this.color = `blue`
  this.age = 4
  this.expansion = `figs`
  this.biscuits = `*llh`
  this.dogmaBiscuit = `l`
  this.inspire = `Draw and tuck a {5}. If it has a {s}, meld it instead.`
  this.echo = ``
  this.karma = [
    `You may issue an Advancement Decree with any two figures.`,
    `If you would take an Inspire action, first you may splay that color right.`
  ]
  this.dogma = []

  this.dogmaImpl = []
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
