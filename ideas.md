# [Ideas](id:ideas)

**These are just ideas.** No guarantees are made about them, including:

* These ideas may or may not be compatible with the any of the versions of the language, including the version as of the idea's writing, but you know, it's best if it is?

# [Comments](id:comments)

Considered implemented for documentation.

    // This is a comment.

# [Function Arguments](id:function-arguments)

    define ^foo(bar)
      say $bar

    foo far // say far

# [Block Function Arguments](id:block-function-arguments)

Requires [Function Arguments](#function-arguments).

Allows blocks of code to be passed as arguments to functions.

    define ^twice(fn)
      $fn()
      $fn()

    ^twice({
      say hello
    })

    // say hello
    // say hello

# [Stack Blocks](id:stack-blocks)

Lines starting with `#` represent stack blocks. The specified block rather than a command block will be inserted where the line is.

    #quartz_ore

# [Stack Coordinate Labels](id:stack-coordinate-labels)

Best with [Stack Blocks](#stack-blocks).

Represents a coordinate.

    setblock @label redstone_block

    @label
    #quartz_ore
