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

      // Parsing command, doing expressions etc.
      let command = ''
      let charIndex = -1

      CHAR_LOOP:
      while (true) {
        charIndex++
        let char = line[charIndex]

        if (charIndex >= line.length) break

        // Variables
        if (char === '$') {
          let name = ''
          while (true) {
            charIndex++
            char = line[charIndex]
            if (charIndex >= line.length) break

            if (char === ' ') break

            name += char
          }

          // console.log('Variable:', name)
          // console.log('Environment:', environment)
          // console.log('Value:', environment.vars[name])

          if (!environment.vars.hasOwnProperty(name))
            throw new Error(`Access to undefiend variable: "${name}"`)

          command += environment.vars[name]

          continue
        }

        if (char === '^') {
          // Getting name.
          let name = ''
          const oldCharIndex = charIndex

          while (true) {
            charIndex++
            char = line[charIndex]
            if (charIndex >= line.length) break

            if (char === '(') break

            name += char
          }

          // Getting arguments.
          // TODO: nested function calls (fn calls as arguments). YIKES!
          const args = []
          let currentArg = ''
          while (true) {
            charIndex++
            char = line[charIndex]
            if (charIndex >= line.length) break

            if (char === ')') {
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

          const func = this.functions[name]
          const params = func.params
          const codeLines = func.codeLines
          const env = {vars: {}}

          for (let argIndex = 0; argIndex < params.length; argIndex++) {
            env.vars[params[argIndex]] = args[argIndex]
          }

          const funcResults = this.compile(codeLines.join('\n'), env)

          if (oldCharIndex === 0) {
            for (let line of funcResults)
              results.push(line)

            continue LINE_LOOP
          } else {
            const lastLine = funcResults.slice(-1)[0]

            if (!lastLine) console.warn(`Function "${name}" returned nothing!`)

            command += lastLine.command

            charIndex++

            continue CHAR_LOOP
          }
        }

        command += char
      }

      const obj = {command}

      results.push(obj)
    }

    return results
  }
}

const p = new Program()
console.log(p.compile(`

define greet(who)
  Hello $who

say ^greet(world)

`))
