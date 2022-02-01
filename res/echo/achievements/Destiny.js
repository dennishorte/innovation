module.exports = function() {
  this.id = 'Destiny'
  this.name = 'Destiny'
  this.exp = 'echo'
  this.text = 'Have seven cards forecasted'
  this.alt = 'Barometer'
  this.isSpecialAchievement = true
  this.checkPlayerIsEligible = function(game, player) {
    return game.getZoneByPlayer(player, 'forecast').cards.length >= 7
  }
}
