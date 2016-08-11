const CBU = {
  dataTagSerialize(data) {
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        const elements = data.map(x => CBU.dataTagSerialize(x))
        return `[${elements.join(',')}]`
      } else {
        const keyValues = []
        for (let prop of Object.getOwnPropertyNames(data)) {
          keyValues.push([prop, CBU.dataTagSerialize(data[prop])])
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
  },

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
      }

      return ret
    }

    let stackData
    if (blockStack.length) {
      stackData = helper(blockStack)
    }

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
          Command: `summon FallingSand ~1 ~-2 ~ ${CBU.dataTagSerialize({
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

    const command = 'summon FallingSand ~ ~1 ~ '
      + CBU.dataTagSerialize(dataTag)

    return command
  }
}
