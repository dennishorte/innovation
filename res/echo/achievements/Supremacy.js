module.exports = function() {
  this.id = 'Supremacy'
  this.name = 'Supremacy'
  this.exp = 'echo'
  this.text = 'Have three or more of one biscuit in four colors.'
  this.alt = 'Novel'
  this.isSpecialAchievement = true
  this.checkPlayerIsEligible = function(game, player) {
    const colorCounts = game.utilEmptyBiscuits()
    for (const color of game.utilColors()) {
      const zone = game.getZoneByPlayer(player, color)
      const biscuits = game.getBiscuitsByZone(zone)
      for (const biscuit of Object.keys(colorCounts)) {
        if (biscuits[biscuit] >= 3) {
          colorCounts[biscuit] += 1
        }
      }
    }
    return Object.values(colorCounts).some(count => count >= 4)
  }
}
