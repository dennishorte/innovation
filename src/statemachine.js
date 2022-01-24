const funcs = require('./funcs.js')
const util = require('./util.js')


function StackFrame(name, kwargs) {
  return {
    name: name,
    data: kwargs,
    mode: '',
    toAssign: '',
  }
}

function StateMachine() {
  this.frames = []
  this.breakPoints = []
  this.debug = true
}

StateMachine.prototype.assign = function(name, funcName, kwargs) {
  const frame = this.top()
  util.assert(frame.data[name] === undefined, 'Frame data is const. Cannot overwrite it.')
  frame.toAssign = name
  this.push(funcName, kwargs)
}

// Useful for stopping execution in order to setup tests.
StateMachine.prototype.breakPoint = function(name) {
  if (this.breakPoints.includes(name)) {
    return '__break__'
  }
}

StateMachine.prototype.steps = function(steps) {
  const frame = this.top()
  if (frame.mode === 'steps') {
    return steps
  }
  else {
    frame.mode = 'steps'
    frame.stepIndex = -1
    return '__wait__'
  }
}

StateMachine.prototype.push = function(funcName, kwargs) {
  util.assert(kwargs !== undefined)
  util.assert(kwargs !== null)
  util.assert(typeof kwargs === 'object')
  this.frames.push(StackFrame(funcName, kwargs))
}

StateMachine.prototype.run = function() {
  if (this.frames.length === 0) {
    this._log('pushed root')
    this.push('root', {})
  }

  while (true) {
    const frame = this.top()

    let result
    if (frame.mode === 'steps') {
      result = this._runStep(frame)
    }
    else {
      result = this._runStandard(frame)
    }

    if (result === '__break__') {
      break
    }
  }
}

// Similar to assign, but instead of a function, user input provides the value.
StateMachine.prototype.select = function(name, selector) {
  frame.selector = selector
  frame.response = ''
  return '__select__'
}

StateMachine.prototype.top = function() {
  util.assert(this.frames.length > 0, 'Cannot call top on empty stack.')
  return this.frames[this.frames.length - 1]
}

// Gather the state from all frames, with newer frames shadowing variables from older frames.
StateMachine.prototype._collectData = function() {
  let collected = {}
  for (const frame of this.frames) {
    collected = Object.assign(collected, frame.data)
  }
  return collected
}

StateMachine.prototype._eval = function(fn) {
  return fn(this, this._collectData())
}

StateMachine.prototype._frameComplete = function(prevResult) {
  if (prevResult === '__wait__') {
    return
  }

  this.frames.pop()
  if (this.frames.length === 0) {
    throw 'Finished'
  }

  const top = this.top()
  if (top.toAssign) {
    top.data[top.toAssign] = prevResult
    top.toAssign = ''
  }
}

StateMachine.prototype._log = function(...msgs) {
  if (this.debug) {
    let indent = ''
    for (let i = 0; i < this.frames.length - 1; i++) {
      indent += '..'
    }
    console.log(indent, ...msgs)
  }
}

StateMachine.prototype._runStandard = function(frame) {
  const func = funcs[frame.name]
  this._log('running frame: ', frame.name)

  const result = this._eval(func)
  this._log('returned: ' + result)
  return this._frameComplete(result)
}

StateMachine.prototype._runStep = function(frame) {
  frame.stepIndex += 1
  const steps = funcs[frame.name](this)

  this._log(`Running frame ${frame.name}, step ${frame.stepIndex}`)
  const step = steps[frame.stepIndex]
  const result = this._eval(step)
  this._log(`returned: ${result}`)

  // This was the last frame
  if (frame.stepIndex === steps.length - 1) {
    return this._frameComplete(result)
  }
}


const sm = new StateMachine()
sm.run()
sm.run()
