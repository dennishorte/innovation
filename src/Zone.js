module.exports = {
  Zone
}


function Zone(game, name, kind) {
  this.game = game
  this.name = name
  this.kind = kind
  this.color = undefined
  this.owner = undefined
  this.splay = undefined
  this._cards = []
}

Zone.prototype.cards = function() {
  return [...this._cards]
}

Zone.prototype.setCards = function(cards) {
  this._cards = cards
}
