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
  this.debug = true
}

StateMachine.prototype.assign = function(name, funcName, kwargs) {
  const frame = this.top()
  util.assert(frame.data[name] === undefined, 'Frame data is const. Cannot overwrite it.')
  frame.toAssign = name
  this.push(funcName, kwargs)
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

/* StateMachine.prototype.getFunc = function(frame) {
 *   const [name, meta] = frame.name.split('.')
 *
 *   if (meta === undefined) {
 *     return funcs[frame.name]
 *   }
 *   else if (meta === 'execute') {
 *     frame.data.__step += 1
 *     const execute = funcs[frame.name].steps[frame.data.__step += 1]
 *   }
 *   else {
 *     throw new Error(`Unknown func meta: ${meta}`)
 *   }
 * }
 *  */
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

    if (frame.mode === 'steps') {
      this._runStep(frame)
    }
    else {
      this._runStandard(frame)
    }

  }
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

StateMachine.prototype._frameComplete = function() {
  this.frames.pop()
  if (this.frames.length === 0) {
    throw 'Finished'
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

  if (result !== '__wait__') {
    this._frameComplete()
  }

  const top = this.top()
  if (top.toAssign) {
    top.data[top.toAssign] = result
    top.toAssign = ''
  }
}

StateMachine.prototype._runStep = function(frame) {
  frame.stepIndex += 1
  const steps = funcs[frame.name](this)

  if (frame.stepIndex >= steps.length) {
    this._frameComplete()
    return
  }

  this._log(`Running frame ${frame.name}, step ${frame.stepIndex}`)
  const step = steps[frame.stepIndex]
  const result = this._eval(step)
  this._log(`returned: ${result}`)
}


const sm = new StateMachine()
sm.run()
