importScripts('../command-block-utils.js', '../main.js')

const log = console.log

onmessage = function(e) {
  if (e.data === 'ENABLE_DEBUG') {
    console.log = log
    console.log('Enabled console logging!')
    return
  } else if (e.data === 'DISABLE_DEBUG') {
    console.log = () => {}
    log('Disabled console logging!')
    return
  }

  const code = e.data

  const p = new Program()

  let stack
  stack = p.compile(code)
  stack = p.handleLabels(stack)

  const command = CBU.summonStack(stack)

  postMessage(command)
}
