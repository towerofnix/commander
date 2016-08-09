# [Ideas](id:ideas)

**These are just ideas.** No guarantees are made about them, including:

* These ideas may or may not be compatible with the any of the versions of the language, including the version as of the idea's writing, but you know, it's best if it is?

# [Comments](id:comments)

Considered implemented for documentation.

    // This is a comment.

# [Block Function Arguments](id:block-function-arguments)

Allows blocks of code to be passed as arguments to functions.

    define twice(fn)
      $fn()
      $fn()

    !twice({
      say hello
    })

    // say hello
    // say hello
