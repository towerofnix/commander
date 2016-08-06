const dataTagSerialize = function(data) {
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      const elements = data.map(x => dataTagSerialize(x))
      return `[${elements.join(',')}]`
    } else {
      const keyValues = []
      for (let prop of Object.getOwnPropertyNames(data)) {
        keyValues.push([prop, dataTagSerialize(data[prop])])
      }
      const keyToValues = keyValues.map(e => `${e[0]}:${e[1]}`)
      return `{${keyToValues.join(',')}}`
    }
  } else if (typeof data === 'string') {
    const specialCharacters = ['\\','\"']
    let str = ''
    for (let i = 0; i < data.length; i++) {
      if (specialCharacters.includes(data[i])) {
        str += '\\' + data[i]
      } else {
        str += data[i]
      }
    }
    return `"${str}"`
  } else if (typeof data === 'number') {
    return parseFloat(data)
  } else if (typeof data === 'boolean') {
    return data
  }
}

const checkForExpression = function(line, i) {
  const char = line[i]

  // TODO: escaping
  if (char === '(' && line[i - 1] === '^') {
    let expr = ''
    let char
    while (char !== ')') {
      char = line[i]
      expr += char
      if (i > line.length) {
        throw new Error('Unclosed function call :(')
        break
      }
      console.log('...', i, char)
      i++
    }

    return {i, expr}
  }

  return {i, expr: null}
}

class Program {
  constructor(program = '') {
    this.program = program
    this.functions = {}
  }

  summonStack(blockStack) {
    const helper = function(blocks) {
      const blockObj = blocks[0]

      let ret

      if ('block' in blockObj) {
        ret = {
          id: 'FallingSand', Time: 1, Block: blockObj.block
        }
      } else {
        const ted = {}

        ret = {
          id: 'FallingSand', Time: 1,
          TileEntityData: ted,
          Data: 1
        }

        ted.auto = 'auto' in blockObj ? blockObj.auto : true
        if ('command' in blockObj) {
          ted.Command = blockObj.command
        }

        if (blockObj.type === 'i') ret.Block = 'command_block'
        if (blockObj.type === 'c') ret.Block = 'chain_command_block'
        if (blockObj.type === 'r') ret.Block = 'repeating_command_block'

        if (blockObj.conditional) ret.Data += 8
      }

      if (blocks.length > 1) {
        ret.Passengers = [helper(blocks.slice(1))]
      } else {
        ret.Passengers = [{
          id: 'FallingSand', Time: 1, Block: 'command_block', Data: 2,
          TileEntityData: {
            auto: true,
            Command: `blockdata ~ ~-${blockStack.length} ~ {auto: true}`
          }
        }]
      }

      return ret
    }

    const stackData = helper(blockStack)

    const dataTag = {
      Time: 1, Block: 'command_block', Data: 2,
      TileEntityData: {
        auto: true,
        Command: `fill ~1 ~-1 ~ ~1 ~${blockStack.length + 4} ~ air 0 destroy`
      },
      Passengers: [{
        id: 'FallingSand', Time: 1, Block: 'command_block', Data: 2,
        TileEntityData: {
          auto: true,
          Command: `summon FallingSand ~1 ~-2 ~ ${dataTagSerialize({
            Time: 1, Block: 'glass', Passengers: [stackData]
          })}`
        },
        Passengers: [{
          id: 'FallingSand', Time: 1, Block: 'command_block', Data: 2,
          TileEntityData: {
            auto: true,
            Command: 'fill ~ ~ ~ ~ ~-2 ~ air 0 destroy'
          }
        }]
      }]
    }

    console.dir(stackData)

    const command = 'summon FallingSand ~ ~1 ~ '
      + dataTagSerialize(dataTag)

    return command
  }

  evaluateExpr(expr) {
    expr = expr.slice(1, -1)
    let i = 0

    let name = ''
    let gotName = false

    for (let char of expr) {
      if (char === ' ') {
        gotName = true
      }

      if (!gotName) {
        name += char
      }

      // TODO: args

      i++
    }

    if (!this.functions.hasOwnProperty(name)) {
      throw new Error(`Undefined function: "${name}"`)
    }

    const code = this.functions[name]
    return code
  }

  cmd(line) {
    const attrs = ['chain', 'auto']

    let i = 0

    const goPastSpaces = function() {
      for (let char of line.slice(i)) {
        if (char !== ' ') {
          break
        }
        i++
      }
    }

    goPastSpaces()

    // Attribute parsing. In "xyz: command", "xyz" is the attribute string.
    if (/^[ irc?!.]*:/.test(line.slice(i))) {
      attrs.splice(0)

      let didGetType, didGetConditional, didGetAuto

      let char
      while (char !== ':') loop: {
        char = line[i]
        i++

        if (char === ' ') {
          continue
        }

        switch(char) {
          case ':':
            break loop

          case 'i':
          case 'r':
          case 'c':
            if (didGetType) {
              throw new Error(
                `Multiple type attributes for command line "${line}"`)
            }

          case 'i':
            attrs.push('impulse')
            didGetType = true
            break

          case 'c':
            attrs.push('chain')
            didGetType = true
            break

          case 'r':
            attrs.push('repeat')
            didGetType = true
            break

          case '?':
            if (didGetConditional) {
              throw new Error(
                `Multiple conditional attributes for command line "${line}"`)
            }

            attrs.push('conditional')
            didGetConditional = true
            break

          case '!':
            if (didGetAuto) {
              throw new Error(
                `Multiple auto attributes for command line "${line}"`)
            }

            attrs.push('auto')
            didGetAuto = true
            break

          case '.':
            if (didGetAuto) {
              throw new Error(
                `Multiple auto attributes for command line "${line}"`)
            }

            attrs.push('not-auto')
            didGetAuto = true
            break

          default:
            throw new Error(
              `Invalid attribute "${char}" for command line "${line}"`)
        }
      }
    }

    goPastSpaces()

    let command = ''

    // Functions/expressions!
    while (i < line.length) {
      let expr
      ({ i, expr } = checkForExpression(line, i))
      const char = line[i]

      if (char === '^' && line[i + 1] === '(') {
        i++
        continue
      } else if (expr) {
        const insert = this.evaluateExpr(expr)
        command += insert
      } else {
        command += char
      }
      i++
    }
    console.log(command)

    const ret = {command}

    if (attrs.includes('impulse')) {
      ret.type = 'i'
    } else if (attrs.includes('chain')) {
      ret.type = 'c'
    } else if (attrs.includes('repeat')) {
      ret.type = 'r'
    } else {
      ret.type = 'c'
    }

    if (attrs.includes('auto')) {
      ret.auto = 1
    } else if (attrs.includes('not-auto')) {
      ret.auto = 0
    } else {
      ret.auto = 1
    }

    if (attrs.includes('conditional')) {
      ret.conditional = 1
    } else {
      ret.conditional = 0
    }

    return ret
  }

  compile() {
    const stack = []
    const program = this.program

    const lines = program.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line === '') {
        continue
      }

      if (line.startsWith('#')) {
        stack.push({block: line.slice(1)})
        continue
      }

      if (line.startsWith('fn')) {
        let code = ''
        let name = ''

        let nameI = 3 // after 'fn '
        while (true) {
          let char = line[nameI]
          if (char === '(') {
            console.log('do argument things')
            break
          }
          name += char
          nameI++
        }

        {
          let line

          while (true) {
            i++
            line = lines[i]

            if (!line.startsWith('  ')) {
              break
            }

            code += line.slice(2) + '\n'
          }

          // Remove extra newline
          code = code.slice(0, -1)
        }

        this.functions[name] = code

        continue
      }

      stack.push(this.cmd(line))
    }

    return stack
  }
}

const program = new Program(`
fn foo()
  say hi

i. : scoreboard objectives add loopCounter dummy
     scoreboard players set LOOP1 loopCounter 5
     ^(foo)
     setblock ~ ~2 ~ redstone_block
#glass

#quartz_ore
i.:  setblock ~ ~-1 ~ netherrack 0 destroy
     scoreboard players test LOOP1 loopCounter 1 *
  ?: say Loop
  ?: scoreboard players remove LOOP1 loopCounter 1
  ?: setblock ~ ~-5 ~ redstone_block
     scoreboard players test LOOP1 loopCounter 0 0
  ?: setblock ~ ~2 ~ redstone_block
#glass

#quartz_ore
i.:  say After loop
#glass
`)

console.log(program.summonStack(program.compile()))
