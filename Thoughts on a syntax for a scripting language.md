# Thoughts on a syntax for a scripting language

This document provides some basic ideas about how a syntax for specifying an L-system could look like.

## Symbols

The only special symbols are:
* `@` announces the definition of a symbol rather than a rule
* `$` followed by a name, represents a basic literal for manipulating the cursor
* `(` and `)` are used to enclose arguments passed to basic literals
* `;` ends a statement
* `=` initiates the substitutes for a symbol definition or a rule
* `#` begins a line comment

The allowed symbols between parentheses are:
* `,` to separate arguments
* `-+0123456789.` the argument itself should always be a number

The following symbols are always ignored:
* whitespaces
* non-printable characters

The available basic literals are (as in lsys.js):
* $rot
* $randomrot
* $draw
* $draw
* $move
* $move
* $thick
* $relthick
* $save
* $restore

## Syntax

Any non-special symbol can be used as literal. The symbols that are used (in both definitions and rules)
must be prefix-free, that is, for each pair of literals, no literal must be a prefix of the other one.

For instance, the following sets are disallowed:
* `{F, F1, F_xy}`
* `{abc, abcde, xyz}`

Whereas these are allowed:
* `{F1, F2, F3}`
* `{abc, bc, c}`
* `{111, 110, 100}`

Symbols are defined using the "literal = subst1 subst2 subst3 ...;" pattern. For example:
* `@  >   = $draw(1);`
* `@  :<  = $move(-1);`
* `@  +   = $rot(20);`
* `@  *   = $relthick(1.25);`
Each symbol can only be defined once.

For rules, the `@` modifier is dropped. For example:
* `F = FFF>F;`
* `F = AA $save() B $rot(30) A]A;`

## Further thoughts

* Maybe introduce a `$rand(a,b)` function to generate a random number which can be used as an argument?
* Allow basic math operators like `+`, `*` etc. inside arguments (only!)
* Make parentheses optional if a basic literal does not expect any parameters
