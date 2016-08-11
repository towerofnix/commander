const output = document.getElementById('output')

const compileWorker = new Worker('compile.worker.js')
compileWorker.onmessage = e => {
  output.value = e.data
  output.select()
  console.timeEnd('Compile')
}

const textarea = document.getElementById('input')

const getIndent = line => line.match(/^\s*/)[0].length

if (!location.search.includes('debug')) {
  compileWorker.postMessage('DISABLE_DEBUG')
}

textarea.addEventListener('keydown', e => {
  if (e.keyCode === 13 && e.ctrlKey) {
    console.time('Compile')
    compileWorker.postMessage(textarea.value)

    // Not sure if this is neccessary; it isn't on OS X/Firefox. Who knows if
    // ctrl-enter does things in other situations, though..
    e.preventDefault()
    return
  }

  // --- editor stuff

  const start = input.selectionStart
  const end = input.selectionEnd
  const value = input.value

  const unindent = () => {
    const upToCursor = value.substring(0, start)
    const activeLine = upToCursor.split('\n').slice(-1)[0]
    const indent = getIndent(activeLine)
    if (activeLine.indexOf('  ') == 0 && value.indexOf('  ', start - activeLine.length) == start - indent) {
      input.value = upToCursor.slice(0, -2) + value.substring(end)
      input.selectionStart = end - 2
      input.selectionEnd = end - 2
    }
  }

  if (e.keyCode == 9) {
    // When the tab key is pressed, insert 2 spaces at the cursor, unless
    // the shift key is pressed, in which case unindent.

    if (!e.shiftKey) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const value = input.value
      input.value = value.substring(0, start) + '  ' + value.substring(end)
      input.selectionStart = end + 2
      input.selectionEnd = end + 2
    } else {
      unindent()
    }
    e.preventDefault()
  } else if (e.keyCode == 13) {
    const upToCursor = value.substring(0, start)
    const activeLine = upToCursor.split('\n').slice(-1)[0]
    let indent = getIndent(activeLine)
    if (activeLine.startsWith('define') || value.endsWith('):')) {
      indent += 2
    }
    const insert = '\n' + ' '.repeat(indent)
    input.value = upToCursor + insert + value.substring(end)
    input.selectionStart = end + insert.length
    input.selectionEnd = end + insert.length
    e.preventDefault()
  } else if (e.keyCode == 221 && e.shiftKey) { // }
    // When the "}" key is typed, if all before the cursor on the active
    // line is whitespace, decrease the indent by 2.
    unindent()
  }
})

textarea.select()
textarea.selectionStart = localStorage.sel
textarea.selectionEnd = localStorage.sel
textarea.scrollTop = localStorage.scroll

onbeforeunload = function() {
  localStorage.sel = textarea.selectionStart
  localStorage.scroll = textarea.scrollTop
}
