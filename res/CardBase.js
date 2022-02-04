function CardBase() {
  this.id
  this.name
  this.color
  this.age
  this.expansion
  this.biscuits
  this.dogmaBiscuit
  this.inspire
  this.echo
  this.karma
  this.dogma

  this.dogmaImpl
  this.inspireImpl
  this.karmaImpl
}

CardBase.prototype.checkBiscuitIsVisible = function(biscuit, splay) {
  const biscuitIndex = this.biscuits.indexOf(biscuit)
  switch (splay) {
    case 'left': return biscuitIndex === 3
    case 'right': return biscuitIndex === 0 || biscuitIndex === 1
    case 'up': return biscuitIndex === 1 || biscuitIndex === 2 || biscuitIndex === 3
    case 'top': return biscuitIndex !== -1
    default: return false
  }
}

CardBase.prototype.checkEchoIsVisible = function(splay) {
  return this.checkBiscuitIsVisible('&', splay)
}

CardBase.prototype.checkInspireIsVisible = function(splay) {
  return this.checkBiscuitIsVisible('*', splay)
}

CardBase.prototype.checkHasEcho = function() {
  return this.echo.length > 0
}

CardBase.prototype.checkHasBiscuit = function(biscuit) {
  return this.biscuits.includes(biscuit)
}

CardBase.prototype.getBiscuits = function(splay) {
  if (splay === 'top') {
    return this.biscuits
  }
  else if (splay === 'none') {
    return ''
  }
  else if (splay === 'left') {
    if (this.biscuits.length == 6) {
      return this.biscuits[6]
    }
    else {
      return this.biscuits[3]
    }
  }
  else if (splay === 'right') {
    if (this.biscuits.length === 6) {
      return this.biscuits[0] + this.biscuits[3]
    }
    else {
      return this.biscuits[0] + this.biscuits[1]
    }
  }
  else if (splay === 'up') {
    if (this.biscuits.length === 6) {
      return this.biscuits.slice(3)
    }
    else {
      return this.biscuits.slice(1)
    }
  }
  else {
    throw new Error(`Unknown splay type: ${splay}`)
  }
}

CardBase.prototype.hasKarma = function(trigger) {
  return this.karmaImpl.some(k => k.trigger === trigger)
}

CardBase.prototype.getImpl = function(kind) {
  if (kind.startsWith('karma')) {
    kind = kind.substr(6)
    const impl = this.karmaImpl.find(impl => impl.trigger === kind)

    // Other implementation types return the entire array. Since karma impls
    // are a non-homogenous array, they they need to grab the correct element
    // and re-wrap it in an array to match the format used by other impl kinds.
    if (impl) {
      return [impl]
    }
    else {
      return []
    }
  }
  else {
    return this[`${kind}Impl`]
  }
}

module.exports = CardBase
