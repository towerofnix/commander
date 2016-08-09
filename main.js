const groupFn = function(fn, label) {
  console.group(label || 'Group-function')
  const ret = fn()
  console.groupEnd()
  return ret
}

class Program {
  constructor() {
    this.functions = {}
    this.defaultAttributes = {
      type: 'c', auto: true, conditional: false
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

      if (line === '')
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
        const { funcResults, name } = this.processFunctionCall(
          line.slice(1), environment)

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
          console.log('hmm')
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
      console.log('attributes proper:', attributes)

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

    const func = this.functions[name]
    const params = func.params
    const codeLines = func.codeLines
    const env = {vars: {}}

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
    // console.log('Function name:', name)
    // console.log('Arguments:', args)

    for (let argIndex = 0; argIndex < params.length; argIndex++) {
      // console.log('Param/arg', params[argIndex], '=', args[argIndex])
      env.vars[params[argIndex]] = this.expression(args[argIndex], environment)
    }

    const funcResults = this.compile(codeLines.join('\n'), env)
    return {newCharIndex: charIndex + 1, funcResults, name}
  }
}

const p = new Program()
const stack = p.compile(`

#quartz_ore
i0: scoreboard objectives add loopCounter dummy
say Before loop
scoreboard players set LOOP1 loopCounter 5
setblock ~ ~2 ~ redstone_block
#glass

#quartz_ore
i0: setblock ~ ~-1 ~ netherrack 0 destroy
scoreboard players test LOOP1 loopCounter 1 *
?: say Loop
?: scoreboard players remove LOOP1 loopCounter 1
?: setblock ~ ~-5 ~ redstone_block
scoreboard players test LOOP1 loopCounter 0 0
?: setblock ~ ~2 ~ redstone_block
#glass

#quartz_ore
i0: say After loop
#glass

i1: setblock ~ ~-18 ~ redstone_block

`)
console.dir(stack)
console.log(CBU.summonStack(stack))
