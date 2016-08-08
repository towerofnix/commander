# [Documentation](id:documentation)

## [Program Compiling](id:program-compiling)

For each line of a program, the following occurs:

* If the line is an empty string, continue to the next line.
* If the line starts with `define`, behave as described in [Function Definitions](#function-definitions).
* If the line starts with `!`, behave as described in [Procedure Calls](#procedure-calls).
* Otherwise, behave as described in [Basic Command Blocks](#basic-command-blocks).

## [Basic Command Blocks](id:basic-command-blocks)

Command lines are parts of code that get inserted as command blocks into a stack by the compiler. They are made up of text, variables, and [function calls](#function-calls).

## [Function Definitions](id:function-definitions)

Functions are defined by lines of a program that start with `define`. The syntax is as follows:

    define [name]([param, param, param...])
      [line 1]
      [line 2]
      [...]

When a function definition is found, the code and name will be added to a table of function definitions specific to the progam.

## [Procedure Calls](id:procedure-calls)

Procedure calls are used to insert lines of code into multiple parts of your program. The syntax is as follows:

    ![name]([argument, argument, argument...])

When a procedure call is found, the code that is respective to the name will be found from a program-specific function table, and inserted into the result in place of the procedure call.

Example usage:

    define sayFoo()
      say foo

    !sayFoo()

## [Function Calls](id:function-calls)

Function calls are like [procedure calls](#procedure-calls), and they look up the code from the same table, but rather than creating new command blocks they insert the *last* line of the code into the currently being created command. The syntax is as follows:

    ^[name]([argument, argument, argument...])

Example usage:

    define msg()
      Hello

    say ^msg(), world!
