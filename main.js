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

          if (char === ' ') break

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
        // Getting name.
        let name = ''
        const oldCharIndex = charIndex

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
        const env = {}

        // Getting arguments.
        // TODO: nested function calls (fn calls as arguments). YIKES!
        charIndex++
        const argsSliceStart = charIndex
        while (true) {
          charIndex++
          char = code[charIndex]
          if (charIndex >= code.length) break
          if (char === ')') {
            break
          }
        }
        const argCode = code.slice(argsSliceStart, charIndex)
        const vars = this.doArguments(argCode, func)
        env.vars = vars

        const funcResults = this.compile(codeLines.join('\n'), env)

        // THISISACODETAG: Hmm, how to deal with this.. all of the above code
        // in this section generally screams "don't copy/paste me!".. maybe a
        // parseFunction method?
        // (This is necessary becauese expression doesn't work with procedure
        // calls.)
        if (oldCharIndex === 0) {
          console.warn('Procedure calls don\'t work any more.. oops!')
          // for (let line of funcResults)
          //   results.push(line)
          //
          // continue LINE_LOOP
        } else {
          const lastLine = funcResults.slice(-1)[0]

          if (!lastLine) console.warn(`Function "${name}" returned nothing!`)

          result += lastLine.command

          charIndex++

          // continue CHAR_LOOP
        }

        continue
      }

      result += char
    }

    console.log('RESULT:', result)

    return result
  }

  doArguments(code, func) {
    // Separated from main compile function due to recursion.

    const params = func.params

    const vars = {}

    const args = []
    let currentArg = ''

    let charIndex = -1
    while (true) {
      charIndex++
      let char = code[charIndex]
      if (charIndex >= code.length) {
        if (currentArg) {
          args.push(currentArg)
        }
        break
      }

      if (char === ',') {
        args.push(currentArg)
        currentArg = ''
        continue
      }

      if (char === ' ' && currentArg == '') continue

      currentArg += char
    }

    for (let argIndex = 0; argIndex < params.length; argIndex++) {
      vars[params[argIndex]] = args[argIndex]
    }

    return vars
  }
}

const p = new Program()
console.dir(p.compile(`

define greet(who)
  Hello $who

say ^greet(world)

`))
