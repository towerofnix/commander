class Program {
  constructor(code) {
    this.code = code
    this.functions = {}
  }

  compile() {
    const code = this.code
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

        let nameCharIndex = 6
        while (true) {
          nameCharIndex++
          const char = line[nameCharIndex]

          if (nameCharIndex >= line.length)
            break

          if (char === '(')
            break

          name += char
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
        this.functions[name] = codeLines

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

        if (char === '^') {
          let name = ''
          const oldCharIndex = charIndex

          while (true) {
            charIndex++
            char = line[charIndex]
            if (charIndex >= line.length) break

            if (char === '(') break

            name += char
          }

          const codeLines = this.functions[name]

          if (oldCharIndex === 0) {
            for (let line of codeLines)
              results.push({type: 'c', command: line})

            continue LINE_LOOP
          } else {
            const lastLine = codeLines.slice(-1)[0]
            command += lastLine

            charIndex++

            continue CHAR_LOOP
          }
        }

        command += char
      }

      const obj = {type: 'c', command}

      results.push(obj)
    }

    return results
  }
}

console.dir(new Program(`

define msg()
  Hello

say ^msg(), world!

`).compile())
