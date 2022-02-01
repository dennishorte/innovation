module.exports = function() {
  this.id = 'Empire'
  this.name = 'Empire'
  this.exp = 'base'
  this.text = 'Have three biscuits of each of the six biscuit types.'
  this.alt = 'Construction'
  this.checkPlayerIsEligible = function(game, player) {
    const biscuits = game.getBiscuitsByPlayer(player)
    return Object.values(biscuits).every(count => count >= 3)
  }
}
