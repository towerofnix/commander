# [Documentation](id:documentation)

## [Program Compiling](id:program-compiling)

For each line of a program, the following occurs:

* If the line is an empty string, continue to the next line.
* If the line starts with `define`, behave as described in [Function Definitions](#function-definitions).
* If the line starts with `^`, behave as described in [Procedure Calls](#procedure-calls).
* Otherwise, behave as described in [Basic Command Blocks](#basic-command-blocks).

## [Basic Command Blocks](id:basic-command-blocks)

Each line of a program that does *not* start with a `^` is a command block line.

All the text on the line represents a single command block. *(TODO: This isn't going to be true; e.g. command block attributes, function calls, and so on.)*

## [Function Definitions](id:function-definitions)

Functions are defined by lines of a program that start with `define`. The syntax is as follows:

    define [name]()
      [line 1]
      [line 2]
      [...]

When a function definition is found, the code and name will be added to a table of function definitions specific to the progam.

## [Procedure Calls](id:procedure-calls)

Procedure calls are used to insert code into multiple parts of your program. The syntax is as follows:

    [START OF LINE]^[name]()

When a procedure call is found, the code that is respective to the name will be found from a program-specific function table, and inserted into the result in place of the procedure call.

## [Function Calls](id:function-calls)

Function calls are like [procedure calls](#procedure-calls), and they look up the code from the same table, but rather than creating new command blocks they insert the *last* line of the code into the currently being created command. The syntax is as follows:

    [NOT START OF LINE]^[name]()

Example usage:

    define msg()
      Hello

    say ^msg(), world!
