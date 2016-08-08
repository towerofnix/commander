const groupFn = function(fn, label) {
  console.group(label || 'Group-function')
  const ret = fn()
  console.groupEnd()
  return ret
}

class Program {
  constructor() {
    this.functions = {}
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
        const { funcResults } = this.processFunctionCall(
          line.slice(1), environment)

        for (let r of funcResults) {
          results.push(r)
        }

        continue
      }

      const command = this.expression(line, environment)

      const obj = {command}

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
        console.group('fn call')

        const { funcResults, newCharIndex } = this.processFunctionCall(
          code.slice(charIndex + 1), environment)
        charIndex += newCharIndex

        const lastLine = funcResults.slice(-1)[0]

        if (!lastLine) console.warn(`Function "${name}" returned nothing!`)

        result += lastLine.command

        console.groupEnd()

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
    console.log('Function name:', name)
    console.log('Arguments:', args)

    for (let argIndex = 0; argIndex < params.length; argIndex++) {
      console.log('Param/arg', params[argIndex], '=', args[argIndex])
      env.vars[params[argIndex]] = this.expression(args[argIndex], environment)
    }

    const funcResults = this.compile(codeLines.join('\n'), env)
    return {newCharIndex: charIndex + 1, funcResults}
  }
}

const p = new Program()
console.dir(p.compile(`

define saylol(x)
  say lol $x

define test(y)
  y = $y

define and()
  and

define baaaah(x, y)
  baaaah $x baah! $y I'm a sheep

!saylol(^test(before ^baaaah(a, b) after))

`))
