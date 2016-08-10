const groupFn = function(fn, label) {
  console.group(label || 'Group-function')
  const ret = fn()
  console.groupEnd()
  return ret
}

class Program {
  constructor() {
    this.functions = {}
    this.labels = {}
    this.defaultAttributes = {
      type: 'c', auto: true, conditional: false
    }

    // TODO: builtinFunctions shouldn't need to be created with every Program
    // instance
    this.builtinFunctions = {
      add3(n) {
        return +n + 3
      }
    }
  }

  parseAttributes(str) {
    const timesAppearing = {}
    const validAttributes = [
      'c', 'i', 'r',
      '0', '1',
      '!', '?'
    ]
    const attributes = {}
    let contradictory
    let overallContradictory = 0
    const result = {}

    for (let char of str) {
      timesAppearing[char] = (timesAppearing[char] || 0) + 1
      if (timesAppearing[char] > 1) throw new Error(
        `In attributes "${str}" ${char} appears more than once`)

      if (!validAttributes.includes(char)) throw new Error(
        `In attributes "${str}" ${char} is an invalid attribute`)

      attributes[char] = true
    }

    contradictory = 0
    if (attributes['c']) {
      contradictory++
      result.type = 'c'
    }
    if (attributes['i']) {
      contradictory++
      result.type = 'i'
    }
    if (attributes['r']) {
      contradictory++
      result.type = 'r'
    }
    overallContradictory |= contradictory > 1

    contradictory = 0
    if (attributes['0']) {
      contradictory++
      result.auto = false
    }
    if (attributes['1']) {
      contradictory++
      result.auto = true
    }
    overallContradictory |= contradictory > 1

    contradictory = 0
    if (attributes['?']) {
      result.conditional = true
      contradictory++
    }
    if (attributes['!']) {
      result.conditional = false
      contradictory++
    }
    overallContradictory |= contradictory > 1

    if (overallContradictory) throw new Error(
      `Attributes "${str}" is contradictory`)

    const withDefaults = Object.assign({}, this.defaultAttributes, result)

    return withDefaults
  }

  compile(code, environment = {vars: {}}) {
    const lines = code.split('\n')
    const results = []

    LINE_LOOP:
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let line = lines[lineIndex]

      if (line === '' || line.startsWith('//'))
        continue

      if (line.startsWith('define')) {
        // Getting name
        let name = ''

        let defCharIndex = 6
        while (true) {
          defCharIndex++
          const char = line[defCharIndex]

          if (defCharIndex >= line.length)
            break

          if (char === '(')
            break

          name += char
        }

        // Getting parameters
        let params = []
        let currentParam = ''

        while (true) {
          defCharIndex++
          const char = line[defCharIndex]

          if (defCharIndex >= line.length)
            break

          if (char === ')') {
            if (currentParam) {
              params.push(currentParam)
            }
            break
          }

          if (char === ',') {
            params.push(currentParam)
            currentParam = ''
            continue
          }

          if (char === ' ' && currentParam === '')
            continue

          currentParam += char
        }

        // Getting code lines
        const codeLines = []

        while (true) {
          lineIndex++
          line = lines[lineIndex]

          if (lineIndex > lines.length)
            break

          if (!line.startsWith('  '))
            break

          codeLines.push(line.slice(2))
        }

        // Storing function
        this.functions[name] = {codeLines, params}

        continue
      }

      if (line.startsWith('!')) {
        const env = Object.assign({}, environment)

        if (line.endsWith(':')) {
          const argCodeLines = []
          while (true) {
            lineIndex++
            const line = lines[lineIndex]
            if (lineIndex >= lines.length) break
            if (!line.startsWith('  ')) {
              lineIndex--
              break
            }
            argCodeLines.push(line.slice(2))
          }
          env.passedCode = argCodeLines
        }

        console.log('line:', line)

        const { funcResults, name } = this.processFunctionCall(
          line.slice(1), env)

        if (funcResults.length === 0) {
          console.warn(`Procedure call "${name}" had no results!`)
        }

        for (let r of funcResults) {
          results.push(r)
        }

        continue
      }

      if (line.startsWith('#')) {
        const blockName = line.slice(1)
        results.push({block: blockName})
        continue
      }

      if (line.startsWith('@')) {
        let labelName
        if (environment.labelSafe) {
          labelName = `__${environment.labelSafe}__${line.slice(1)}`
        } else {
          labelName = line.slice(1)
        }
        results.push({label: labelName})
        continue
      }

      if (line.startsWith('=')) {
        let varName = ''
        let charIndex = 0
        while (true) {
          charIndex++
          const char = line[charIndex]
          if (charIndex >= line.length) break
          if (char === ' ') break
          varName += char
        }
        charIndex++
        let value = line.slice(charIndex)
        if (value === 'RANDOM') {
          value = '' + Math.random()
        }
        environment.vars[varName] = value
        continue
      }

      let attributeStr = ''
      let charIndex = -1
      let char = ''
      while (true) {
        charIndex++
        char = line[charIndex]
        if (char === ' ') {
          attributeStr = ''
          break
        }
        if (charIndex >= line.length) {
          attributeStr = ''
          break
        }
        if (char === ':') break
        attributeStr += char
      }

      let commandPart
      if (attributeStr) {
        let char = ''
        do {
          charIndex++
          char = line[charIndex]
        } while (char === ' ')
        commandPart = line.slice(charIndex)
      } else {
        commandPart = line
      }
      const attributes = this.parseAttributes(attributeStr)
      // console.log('attributes proper:', attributes)

      const command = this.expression(commandPart, environment)

      const obj = Object.assign({command}, attributes)

      results.push(obj)
    }

    return results
  }

  expression(code, environment = {vars: {}}) {
    // TODO: put reused stuff in here because having identical code in multiple
    // parts of a program is BAAAD!

    // Parts of lines that should be put in here:
    // * everything past the command name part of code lines (past first space)
    //   (or just the whole command line)
    // * arguments (each in a separate expression call)

    let charIndex = -1
    let result = ''

    console.log('-')
    console.log('EXPRESSION:', code)
    console.log('ENVIRONMENT:', environment)

    while (true) {
      charIndex++
      let char = code[charIndex]
      if (charIndex >= code.length) break

      // Variables
      if (char === '$') {
        let name = ''
        while (true) {
          charIndex++
          char = code[charIndex]
          if (charIndex >= code.length) break

          if (char === ' ') {
            charIndex--
            break
          }

          name += char
        }

        // console.log('Variable:', name)
        // console.log('Environment:', environment)
        // console.log('Value:', environment.vars[name])

        if (!environment.vars.hasOwnProperty(name))
          throw new Error(`Access to undefined variable: "${name}"`)

        result += environment.vars[name]

        continue
      }

      // Function calls
      if (char === '^') {
        // console.group('fn call')

        const { funcResults, newCharIndex, name } = this.processFunctionCall(
          code.slice(charIndex + 1), environment)
        charIndex += newCharIndex

        const lastLine = funcResults.slice(-1)[0]

        if (funcResults.length > 1)
          console.warn(`Function call "${name}" had more than one result!`
                    + ' (Using last result.)')
        if (!lastLine) console.warn(`Function "${name}" returned nothing!`)

        result += lastLine.command

        // console.groupEnd()

        continue
      }

      // Labels - this is to add special codes for each scope kinda.
      // To avoid passed functions overwriting labels etc blah blah
      if (environment.labelSafe) {
        if (char === '@') {
          let labelName = ''
          while (true) {
            charIndex++
            char = code[charIndex]
            if (char === ' ') {
              charIndex--
              break
            }
            if (charIndex >= code.length) break
            labelName += char
          }
          console.log('foo:', labelName)
          result += '@__' + environment.labelSafe + '__' + labelName
          continue
        }
      }

      result += char
    }

    console.log('RESULT:', result)

    return result
  }

  processFunctionCall(code, environment) {
    // PROCESS PROCESS PROCESS

    // Getting name.
    let name = ''
    let char = ''
    let charIndex = -1
    while (true) {
      charIndex++
      char = code[charIndex]
      if (charIndex >= code.length) break

      if (char === '(') break

      name += char
    }

    let func
    if (environment.vars.hasOwnProperty(name)) {
      func = environment.vars[name]
    } else if (this.functions.hasOwnProperty(name)) {
      func = this.functions[name]
    } else if (this.builtinFunctions.hasOwnProperty(name)) {
      func = this.builtinFunctions[name]
    } else {
      throw new Error(`Attempt to call nonexistant function "${name}"`)
    }
    const params = func.params
    const codeLines = func.codeLines
    const env = {
      vars: {},
      labelSafe: 'safe-' + Math.random()
    }

    // Getting arguments.
    const argsSliceStart = charIndex + 1
    let parenWeight = 0
    let currentArg = ''
    const args = []
    while (true) {
      charIndex++
      char = code[charIndex]
      if (charIndex >= code.length) break
      if (char === ')') {
        if (parenWeight === 0) {
          if (currentArg) {
            args.push(currentArg)
          }
          break
        } else {
          parenWeight--
        }
      }
      if (char === '(') {
        parenWeight++
      }
      if (char === ',' && parenWeight === 0) {
        args.push(currentArg)
        currentArg = ''
        continue
      }
      if (char === ' ' && currentArg == '') continue
      currentArg += char
    }
    const argCode = code.slice(argsSliceStart, charIndex)

    let funcResults

    if (func instanceof Function) {
      console.log('yaaay!')
      funcResults = [{command: func(...args)}]
    } else {
      for (let argIndex = 0; argIndex < params.length; argIndex++) {
        console.log('Param/arg', params[argIndex], '=', args[argIndex])

        if (args[argIndex]) {
          env.vars[params[argIndex]] = this.expression(
            args[argIndex], environment)
        }
      }

      if (environment.passedCode) {
        env.vars[params[params.length - 1]] = {
          codeLines: environment.passedCode,
          params: []
        }
      }

      funcResults = this.compile(codeLines.join('\n'), env)
    }
    return {newCharIndex: charIndex + 1, funcResults, name}
  }

  handleLabels(stack) {
    // postprocessing is s c a r y

    const results = []


    let labelPositions = {}

    // Set up label positions
    let blockIndex = -1
    let labelCount = 0
    while (true) {
      blockIndex++
      const block = stack[blockIndex]
      if (blockIndex >= stack.length) break
      if (block.label) {
        // Labels aren't actual blocks so ignore them in the position.
        labelPositions[block.label] = blockIndex - labelCount
        labelCount++
      }
    }

    // Remove label "blocks"
    stack = stack.filter(t => !t.label)

    // Replace inline-labels with the correct relative positions
    blockIndex = -1
    while (true) {
      blockIndex++
      const block = stack[blockIndex]
      if (blockIndex >= stack.length) break

      if (!block.command) {
        results.push(block)
        continue
      }

      let newCommand = ''
      let charIndex = -1
      let char
      while (true) {
        charIndex++
        char = block.command[charIndex]
        if (charIndex >= block.command.length) break

        if (char === '@') {
          let labelName = ''
          while (true) {
            charIndex++
            char = block.command[charIndex]
            if (char === ' ') break
            if (charIndex >= block.command.length) break
            labelName += char
          }

          const y = labelPositions[labelName] - blockIndex
          newCommand += `~ ~${y} ~ `
          continue
        }

        newCommand += char
      }

      results.push(Object.assign({}, block, {command: newCommand}))
    }

    return results
  }
}

const p = new Program()
let stack
stack = p.compile(`

define loop(times, main)
  scoreboard players set LOOP loopCounter $times
  setblock ~ ~2 ~ redstone_block
  #glass
  @loop
  #quartz_ore
  i0: setblock @loop netherrack
  scoreboard players test LOOP loopCounter 0 0
  ?: setblock @done redstone_block
  scoreboard players test LOOP loopCounter 1 *
  ?: scoreboard players remove LOOP loopCounter 1
  ?: setblock @body redstone_block
  #glass
  @body
  #quartz_ore
  i0: setblock @body netherrack
  !main()
  setblock @loop redstone_block
  #glass
  @done
  #quartz_ore
  i0: setblock @done netherrack

// i0:
// say before loop
// !loop(5):
//   say in loop
// say after loop

say ^add3(7)

`)
console.dir(stack)
stack = p.handleLabels(stack)
console.dir(stack)
console.log(CBU.summonStack(stack))
