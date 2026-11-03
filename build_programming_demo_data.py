#!/usr/bin/env python3
# MindBlown — © 2026 Rory Jones. All rights reserved. Source-available under the PolyForm Strict License 1.0.0 (see LICENSE.md).
"""Generate the *programming wiki* brain for the MindBlown demo (programming-data.js).

An example of MindBlown applied to a knowledge wiki rather than a personal Brain: the
subject is programming itself. Neurons are concepts, languages, tools and pioneers;
sub-neurons sit one level under their parent topic (TypeScript under JavaScript,
Quicksort under Sorting, Garbage collection under Memory management, ...). Synapses are
short, well-established facts cited to public documentation, Wikipedia articles and
public source repositories, plus a hidden "study log" of invented learning sessions.

The learner and the sessions are fictional; the programming facts are public knowledge.
"""
import json, os, random, uuid, collections

random.seed(20261103)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'programming-data.js')
TODAY = '2026-11-02'

LOBES = [
    {'id': 'self',  'name': 'Programming',               'color': '#fde68a'},
    {'id': 'lang',  'name': 'Languages',                 'color': '#60a5fa'},
    {'id': 'para',  'name': 'Paradigms & Types',         'color': '#a78bfa'},
    {'id': 'dsa',   'name': 'Data Structures & Algorithms', 'color': '#34d399'},
    {'id': 'sys',   'name': 'Systems',                   'color': '#ff8a3d'},
    {'id': 'craft', 'name': 'Tools & Craft',             'color': '#22d3ee'},
    {'id': 'hist',  'name': 'Pioneers & History',        'color': '#f472b6'},
    {'id': 'log',   'name': 'Study log',                 'color': '#94a3b8', 'hidden': True},
]

# ------------------------------------------------------------------ sources
SOURCES = {}
def src(uri, label, kind):
    SOURCES.setdefault(uri, {'label': label, 'kind': kind}); return uri
def U(): return str(uuid.UUID(int=random.getrandbits(128)))
def WP(topic, label=None): return src('https://en.wikipedia.org/wiki/' + topic, 'Wikipedia · ' + (label or topic.replace('_', ' ')), 'web')
def DOC(url, label): return src(url, label, 'web')
def GH(repo): return src('https://github.com/' + repo, repo, 'github')
def WIKI(pid, label): return src('wiki://' + pid, 'Wiki · ' + label, 'wiki')
STUDY = []  # (date, title, uri) for the hidden study log
def SES(title, date):
    uri = src(f'pplx://sessions/{U()}', f'{title[:48]} · {date}', 'session'); STUDY.append((date, title, uri)); return uri

PY_DOC = DOC('https://docs.python.org/3/', 'Python 3 documentation')
MDN = DOC('https://developer.mozilla.org/en-US/docs/Web/JavaScript', 'MDN · JavaScript')
RUST_BOOK = DOC('https://doc.rust-lang.org/book/', 'The Rust Programming Language (book)')
GO_DOC = DOC('https://go.dev/doc/', 'Go documentation')
CPPREF = DOC('https://en.cppreference.com/w/c', 'cppreference · C')
HASKELL = DOC('https://www.haskell.org/documentation/', 'Haskell documentation')
GIT_BOOK = DOC('https://git-scm.com/book/en/v2', 'Pro Git (book)')
SQLITE = DOC('https://sqlite.org/docs.html', 'SQLite documentation')
LLVM = DOC('https://llvm.org/docs/', 'LLVM documentation')
UNICODE = DOC('https://home.unicode.org/', 'Unicode Consortium')
TS_DOC = DOC('https://www.typescriptlang.org/docs/', 'TypeScript handbook')
NODE_DOC = DOC('https://nodejs.org/en/docs', 'Node.js documentation')
PEP = lambda n, t: DOC(f'https://peps.python.org/pep-{n:04d}/', f'PEP {n} · {t}')
RFC = lambda n, t: DOC(f'https://www.rfc-editor.org/rfc/rfc{n}', f'RFC {n} · {t}')

PAGES = []; SEEALSO = collections.defaultdict(list)
def page(pid, title, ptype, lobe, desc, syns, see=(), parent=None, created='2026-09-01', updated=TODAY):
    P = {'id': pid, 'title': title, 'type': ptype, 'lobe': lobe, 'desc': desc, 'intro': desc, 'created': created, 'updated': updated,
         'synapses': [], 'sources': [], 'sections': []}
    if parent: P['parent'] = parent
    for i, s in enumerate(syns, 1):
        lead, text, cites = s[0], s[1], list(s[2]); links = list(s[3]) if len(s) > 3 else []; section = s[4] if len(s) > 4 else 'Synapses'
        P['synapses'].append({'id': f'{pid}#{i}', 'page': pid, 'lead': lead, 'text': text, 'section': section, 'links': links, 'cites': cites})
        for c in cites:
            if c not in P['sources']: P['sources'].append(c)
        if section not in P['sections']: P['sections'].append(section)
    SEEALSO[pid].extend(see); PAGES.append(P); return pid

HUB = 'programming'
# ================================================================ HUB
page(HUB, 'Programming', 'concept', 'self',
     'The hub of this wiki: writing instructions a machine can execute, and everything that makes that hard: languages, paradigms, data structures, the systems underneath, the tools around, and the people who figured it out first.',
     [
      ('Languages are notations, not magic', 'Every language here compiles or interprets down to the same machines; what differs is what each one makes easy, safe or fast to express.', [WIKI('programming', 'hub'), SES('Which programming language should I learn first in 2026?', '2026-09-01')], ['lang/python', 'lang/javascript', 'lang/rust']),
      ('Paradigms are habits of thought', 'Functional, object-oriented and concurrent styles are ways of organising the same problems; most modern languages borrow from all three.', [WP('Programming_paradigm')], ['para/functional', 'para/oop', 'para/concurrency']),
      ('Algorithms outlive languages', 'Quicksort and Dijkstra are older than almost every language in use; data structures and complexity are the durable part of the craft.', [WP('Algorithm')], ['dsa/big-o', 'dsa/sorting', 'dsa/graphs']),
      ('The system underneath leaks through', 'Memory, compilers, operating systems and networks shape what a program can do; the best abstractions still leak at the edges.', [WP('Leaky_abstraction', 'Leaky abstraction')], ['sys/memory', 'sys/compilers', 'sys/os']),
      ('Craft is what makes code last', 'Version control, tests, review and documentation are the difference between a program and software.', [WIKI('programming', 'hub')], ['craft/git', 'craft/testing', 'craft/code-review']),
      ('Standing on shoulders', 'Lovelace, Turing, Hopper, Dijkstra, Knuth, Liskov, Ritchie and Thompson each appear in several other neurons of this brain.', [WP('History_of_programming_languages')], ['hist/turing', 'hist/hopper', 'hist/dijkstra']),
     ], see=['lang/python', 'para/type-systems', 'dsa/big-o', 'sys/memory', 'craft/git', 'hist/lovelace'])

# ================================================================ LANGUAGES
page('lang/python', 'Python', 'language', 'lang',
     'A dynamically typed, garbage-collected language created by Guido van Rossum and first released in 1991; indentation-delimited blocks, batteries-included standard library, and the reference implementation CPython.',
     [
      ('Born 1991', 'Guido van Rossum began Python at CWI in the Netherlands in the late 1980s; version 0.9.0 was released in February 1991 and Python 2 and 3 followed in 2000 and 2008.', [WP('Python_(programming_language)', 'Python'), PY_DOC], ['hist/van-rossum']),
      ('The Zen of Python', 'PEP 20 lists the guiding aphorisms: "Beautiful is better than ugly", "Explicit is better than implicit", "There should be one obvious way to do it".', [PEP(20, 'The Zen of Python')]),
      ('Indentation is syntax', 'Blocks are delimited by indentation rather than braces, which makes the visual structure and the actual structure the same thing.', [PY_DOC, SES('Why does Python use indentation instead of braces?', '2026-09-02')]),
      ('Reference counting plus a cycle collector', 'CPython frees most objects the instant their reference count hits zero and runs a separate collector for reference cycles.', [PY_DOC], ['sys/memory/refcount', 'sys/memory/gc']),
      ('Timsort lives here', 'The built-in sort is Timsort, written by Tim Peters for Python 2.3 in 2002; it exploits runs that are already ordered.', [PY_DOC], ['dsa/sorting/timsort']),
     ], see=['lang/python/cpython-gil', 'lang/python/type-hints', 'para/type-systems', 'sys/memory'])
page('lang/python/cpython-gil', 'CPython and the GIL', 'concept', 'lang',
     'CPython is the reference interpreter. Its Global Interpreter Lock lets only one thread execute Python bytecode at a time, which is why CPU-bound threading did not scale, and why PEP 703 introduced an optional free-threaded build.',
     [
      ('One lock to rule the bytecode', 'The GIL simplifies memory management in the interpreter and keeps C extensions safe, at the cost of true multi-core parallelism for pure-Python threads.', [WP('Global_interpreter_lock', 'Global interpreter lock'), SES('Why can\'t Python threads use all my cores?', '2026-09-03')], ['para/concurrency']),
      ('PEP 703: free-threaded CPython', 'Accepted in 2023, PEP 703 made a GIL-free build of CPython available as an experimental option starting with Python 3.13 in 2024.', [PEP(703, 'Making the GIL optional in CPython')]),
      ('Workarounds that stuck', 'multiprocessing, C extensions that release the GIL, and asyncio for I/O-bound work are the long-standing ways around the lock.', [PY_DOC], ['para/concurrency/async-await']),
      ('The source is on GitHub', 'CPython is developed in the open at python/cpython; the GitHub migration from Mercurial completed in 2017.', [GH('python/cpython')]),
     ], parent='lang/python')
page('lang/python/type-hints', 'Type hints', 'concept', 'lang',
     'Optional static type annotations added by PEP 484 in Python 3.5 (2015); ignored at runtime, checked by external tools such as mypy and pyright.',
     [
      ('PEP 484', 'Type hints standardised annotation syntax and the typing module; the interpreter does not enforce them.', [PEP(484, 'Type Hints')], ['para/type-systems']),
      ('Gradual typing', 'You can annotate one function at a time, which is what made adoption in large codebases possible.', [WP('Gradual_typing', 'Gradual typing'), SES('Is it worth adding type hints to an old Python codebase?', '2026-09-04')], ['para/type-systems/inference']),
      ('Generics and protocols', 'list[int], TypeVar and Protocol (PEP 544) give Python parametric and structural typing in the checker.', [PEP(544, 'Protocols: structural subtyping')], ['para/type-systems/generics']),
     ], parent='lang/python')

page('lang/javascript', 'JavaScript', 'language', 'lang',
     'The language of the web, created by Brendan Eich at Netscape in 1995 and standardised as ECMAScript; single-threaded with an event loop, prototype-based objects, and since ES2015 a steady yearly release cadence.',
     [
      ('Ten days in 1995', 'Brendan Eich wrote the first version at Netscape in 1995; the name was a marketing nod to Java, to which it is unrelated.', [WP('JavaScript'), MDN], ['hist/eich']),
      ('ECMAScript is the standard', 'Ecma International published ECMA-262 in 1997; ES2015 (ES6) added classes, modules, arrow functions, promises and let/const, and editions have shipped yearly since.', [WP('ECMAScript'), MDN]),
      ('One thread, one loop', 'JavaScript runs one thread per realm; asynchronous work is queued as callbacks, promises and microtasks on the event loop.', [MDN, SES('Explain the JavaScript event loop with a diagram', '2026-09-06')], ['lang/javascript/event-loop', 'para/concurrency/async-await']),
      ('Prototypes, then classes', 'Objects inherit from other objects via a prototype chain; the class keyword (ES2015) is syntax over the same mechanism.', [MDN], ['para/oop']),
     ], see=['lang/javascript/typescript', 'lang/javascript/node', 'sys/compilers/jit'])
page('lang/javascript/typescript', 'TypeScript', 'language', 'lang',
     'A statically typed superset of JavaScript from Microsoft, first released in 2012 and led by Anders Hejlsberg; it compiles to plain JavaScript and uses structural typing.',
     [
      ('A superset that erases', 'Valid JavaScript is valid TypeScript; the compiler checks types and then erases them, emitting JavaScript.', [TS_DOC, WP('TypeScript')]),
      ('Structural, not nominal', 'Two types are compatible when their shapes match, regardless of their names; this is what lets TypeScript describe existing JavaScript APIs.', [TS_DOC, SES('Structural vs nominal typing, with TypeScript examples', '2026-09-07')], ['para/type-systems']),
      ('Open source since day one', 'TypeScript has been developed publicly at microsoft/TypeScript since its 2012 announcement.', [GH('microsoft/TypeScript')]),
     ], parent='lang/javascript')
page('lang/javascript/node', 'Node.js', 'tool', 'lang',
     'A server-side JavaScript runtime created by Ryan Dahl in 2009 on top of the V8 engine, built around non-blocking I/O and the npm package ecosystem.',
     [
      ('V8 outside the browser', 'Node embeds Chrome\'s V8 engine and adds a libuv-based event loop, file system and networking APIs.', [NODE_DOC, WP('Node.js')], ['sys/compilers/jit']),
      ('npm and the package explosion', 'npm, released in 2010, became the largest package registry; the 2016 left-pad removal showed how deep the dependency chains ran.', [WP('Npm', 'npm')], ['craft/package-managers']),
      ('Source', 'Node is developed at nodejs/node under the OpenJS Foundation.', [GH('nodejs/node')]),
     ], parent='lang/javascript')
page('lang/javascript/event-loop', 'Event loop', 'concept', 'lang',
     'The scheduling model behind JavaScript\'s single thread: a call stack, task queues, and a loop that runs the next task when the stack is empty.',
     [
      ('Macrotasks and microtasks', 'Promise reactions go on the microtask queue, which drains completely before the next macrotask (timers, I/O callbacks) runs.', [MDN]),
      ('Why setTimeout(fn, 0) is not immediate', 'The callback waits for the current stack and all pending microtasks; zero is a minimum, not a promise.', [MDN, SES('Why does setTimeout 0 run after my promise?', '2026-09-08')]),
     ], parent='lang/javascript')

page('lang/rust', 'Rust', 'language', 'lang',
     'A systems language started by Graydon Hoare at Mozilla, 1.0 in 2015; memory safety without a garbage collector through ownership and borrowing, enforced at compile time.',
     [
      ('Safety without a collector', 'Rust frees memory deterministically when an owner goes out of scope; the compiler rejects programs that could use freed or aliased-and-mutated memory.', [RUST_BOOK, WP('Rust_(programming_language)', 'Rust')], ['lang/rust/ownership', 'sys/memory']),
      ('Fearless concurrency', 'The same ownership rules that prevent use-after-free also prevent data races at compile time.', [RUST_BOOK], ['para/concurrency/data-races']),
      ('Into the kernel', 'Linux 6.1 (December 2022) merged initial infrastructure for writing kernel modules in Rust.', [WP('Rust_for_Linux', 'Rust for Linux')], ['sys/os']),
      ('Result and Option', 'Errors and absence are values, not exceptions or null; the ? operator propagates them.', [RUST_BOOK], ['para/type-systems/adts']),
      ('Source', 'The compiler and standard library live at rust-lang/rust.', [GH('rust-lang/rust')]),
     ], see=['lang/rust/ownership', 'lang/rust/cargo', 'lang/c', 'sys/compilers/llvm'])
page('lang/rust/ownership', 'Ownership and borrowing', 'concept', 'lang',
     'Each value has exactly one owner; references borrow it either shared (many readers) or mutable (one writer), never both at once, and the borrow checker proves lifetimes line up.',
     [
      ('One owner, moved not copied', 'Assigning a non-Copy value moves it; using the old binding afterwards is a compile error.', [RUST_BOOK, SES('Explain the borrow checker to a C programmer', '2026-09-10')], ['lang/c/pointers']),
      ('Shared XOR mutable', 'At any point you may have any number of &T or exactly one &mut T; this rule is what rules out data races and iterator invalidation.', [RUST_BOOK]),
      ('Lifetimes are a type-level fact', 'Lifetime annotations tell the compiler how long references must be valid; most are inferred by elision rules.', [RUST_BOOK], ['para/type-systems/inference']),
     ], parent='lang/rust')
page('lang/rust/cargo', 'Cargo and crates', 'tool', 'lang',
     'Rust\'s build tool and package manager; crates are published to crates.io, versions follow semver, and Cargo.lock pins the exact dependency graph.',
     [
      ('One tool for build, test, docs', 'cargo build, cargo test, cargo doc and cargo publish cover the whole workflow; the uniformity is part of why the ecosystem feels coherent.', [RUST_BOOK]),
      ('Lockfiles make builds reproducible', 'Cargo.lock records resolved versions so a fresh checkout builds the same graph.', [RUST_BOOK], ['craft/package-managers']),
     ], parent='lang/rust')

page('lang/go', 'Go', 'language', 'lang',
     'Designed at Google by Robert Griesemer, Rob Pike and Ken Thompson, announced in 2009, 1.0 in 2012; garbage collected, statically typed, with goroutines and channels for concurrency and gofmt ending formatting debates.',
     [
      ('Built for big codebases', 'Go was a reaction to slow builds and complexity at Google: fast compilation, a small language, one standard formatter.', [GO_DOC, WP('Go_(programming_language)', 'Go')], ['hist/thompson-ritchie']),
      ('Generics arrived in 1.18', 'Type parameters landed in Go 1.18 (March 2022) after a decade of proposals.', [GO_DOC], ['para/type-systems/generics']),
      ('gofmt', 'The formatter is part of the toolchain and the community norm; style arguments mostly ended.', [GO_DOC, SES('Why does the Go community love gofmt?', '2026-09-12')], ['craft/code-review']),
      ('Source', 'The toolchain and standard library are at golang/go.', [GH('golang/go')]),
     ], see=['lang/go/goroutines', 'para/concurrency', 'sys/memory/gc'])
page('lang/go/goroutines', 'Goroutines and channels', 'concept', 'lang',
     'Lightweight threads multiplexed onto OS threads by the Go runtime, communicating through typed channels; the motto is "do not communicate by sharing memory; share memory by communicating".',
     [
      ('Cheap to start', 'A goroutine starts with a small stack that grows as needed, so programs routinely run thousands at once.', [GO_DOC], ['sys/os/processes-threads']),
      ('Channels and select', 'Channels carry values between goroutines; select waits on several channel operations at once.', [GO_DOC], ['para/concurrency/actors']),
      ('Concurrency is not parallelism', 'Rob Pike\'s 2012 talk of that title separates structuring a program as independent parts from running them simultaneously.', [WP('Concurrency_(computer_science)', 'Concurrency')], ['para/concurrency']),
     ], parent='lang/go')

page('lang/c', 'C', 'language', 'lang',
     'Dennis Ritchie\'s language from Bell Labs (1972), in which Unix was rewritten in 1973; manual memory management, pointers, and a standard (C89 through C23) that leaves much behaviour undefined on purpose.',
     [
      ('Written to write Unix', 'C grew out of B and BCPL so that Unix could be portable; the 1978 Kernighan and Ritchie book defined the language for a generation.', [WP('C_(programming_language)', 'C'), CPPREF], ['hist/thompson-ritchie', 'sys/os']),
      ('Standards', 'ANSI C (1989) was followed by C99, C11, C17 and C23, each adding features while keeping old code compiling.', [CPPREF]),
      ('Everything is bytes and addresses', 'C exposes memory directly: arrays decay to pointers, structs have layouts, and malloc/free are your responsibility.', [CPPREF], ['lang/c/pointers', 'sys/memory/stack-heap']),
      ('The lingua franca of FFI', 'Almost every language can call C, so C headers are how libraries and operating systems talk to each other.', [SES('Why do all languages have a C FFI?', '2026-09-14')]),
     ], see=['lang/c/pointers', 'lang/c/undefined-behaviour', 'lang/rust', 'sys/memory'])
page('lang/c/pointers', 'Pointers and memory', 'concept', 'lang',
     'A pointer is a variable holding an address. Pointer arithmetic, null, dangling pointers and buffer overruns are where C\'s power and its security record both come from.',
     [
      ('Address-of and dereference', '&x yields the address of x; *p reads or writes what p points at; p + 1 advances by one element, not one byte.', [CPPREF]),
      ('The classic bugs', 'Use-after-free, double free, buffer overflow and null dereference are all pointer misuse; Rust\'s ownership model was designed to make them compile errors.', [CPPREF, SES('What are the most common memory bugs in C and how do I find them?', '2026-09-15')], ['lang/rust/ownership', 'craft/testing/fuzzing']),
     ], parent='lang/c')
page('lang/c/undefined-behaviour', 'Undefined behaviour', 'concept', 'lang',
     'Operations the C standard deliberately leaves unspecified (signed overflow, out-of-bounds access, data races). Compilers may assume they never happen, which enables optimisation and produces surprising code.',
     [
      ('A contract, not a bug', 'UB lets the compiler assume programs are well-formed; the cost is that a single overflow can make an optimiser delete a bounds check.', [WP('Undefined_behavior', 'Undefined behavior'), CPPREF], ['sys/compilers']),
      ('Sanitizers catch it at runtime', 'AddressSanitizer and UndefinedBehaviorSanitizer instrument builds to report UB as it happens.', [LLVM], ['craft/debugging']),
     ], parent='lang/c')

page('lang/haskell', 'Haskell', 'language', 'lang',
     'A purely functional, lazily evaluated language defined by committee in 1990; type classes, Hindley–Milner-style inference, and monads to sequence effects. GHC is the dominant compiler.',
     [
      ('Pure and lazy', 'Functions have no side effects and expressions are evaluated only when needed, which allows infinite data structures and demands a different intuition about performance.', [HASKELL, WP('Haskell')], ['para/functional']),
      ('Type classes', 'Ad-hoc polymorphism via type classes (1989, Wadler and Blott) influenced Rust traits and Swift protocols.', [HASKELL], ['para/type-systems/generics']),
      ('Monads for effects', 'IO, Maybe and State are monads: a common interface for sequencing computations with context.', [HASKELL, SES('Explain monads without the burrito metaphor', '2026-09-18')], ['para/functional/higher-order']),
     ], see=['para/functional', 'para/type-systems/inference'])
page('lang/lisp', 'Lisp and Scheme', 'language', 'lang',
     'John McCarthy\'s Lisp (1958) introduced symbolic expressions, code as data, and garbage collection; Scheme (1975) distilled it with lexical scope and tail calls, and Clojure (2007) brought it to the JVM.',
     [
      ('Code is data', 'Programs are lists, so macros can transform code before it runs; this homoiconicity is Lisp\'s defining feature.', [WP('Lisp_(programming_language)', 'Lisp')], ['hist/mccarthy']),
      ('Garbage collection was invented for Lisp', 'McCarthy described automatic reclamation of list cells in 1959.', [WP('Garbage_collection_(computer_science)', 'Garbage collection')], ['sys/memory/gc']),
      ('Scheme guarantees tail calls', 'Proper tail-call optimisation is required by the Scheme standard, so loops are written as recursion.', [WP('Scheme_(programming_language)', 'Scheme')], ['dsa/recursion']),
     ], see=['para/functional', 'hist/mccarthy'])
page('lang/sql', 'SQL', 'language', 'lang',
     'The declarative query language for relational databases, developed at IBM in the early 1970s on Codd\'s relational model and standardised by ANSI in 1986.',
     [
      ('Say what, not how', 'A query describes the result set; the planner decides joins, indexes and order.', [SQLITE, WP('SQL')], ['sys/databases']),
      ('Codd\'s model underneath', 'Relations, tuples and attributes come from E. F. Codd\'s 1970 paper; SQL is one (imperfect) syntax for them.', [WP('Relational_model', 'Relational model')], ['sys/databases/normalisation']),
      ('Dialects', 'Standard SQL exists, but PostgreSQL, SQLite, MySQL and SQL Server each differ in types, functions and quoting.', [SQLITE, SES('Differences between SQLite and PostgreSQL SQL dialects', '2026-09-20')]),
     ], see=['sys/databases', 'sys/databases/indexes'])

# ================================================================ PARADIGMS & TYPES
page('para/functional', 'Functional programming', 'concept', 'para',
     'Programs as compositions of functions: first-class functions, immutability and pure functions, rooted in Alonzo Church\'s lambda calculus of the 1930s.',
     [
      ('Lambda calculus', 'Church\'s calculus of function abstraction and application (1930s) is Turing-complete and the theoretical basis of functional languages.', [WP('Lambda_calculus', 'Lambda calculus')], ['hist/turing']),
      ('Pure functions are easy to test', 'Same inputs, same output, no side effects: pure functions can be tested, memoised and parallelised without ceremony.', [WP('Functional_programming', 'Functional programming')], ['craft/testing/property-based']),
      ('Everywhere now', 'map/filter/reduce, lambdas and immutable collections are in Python, JavaScript, Java, Rust and C#; FP won by diffusion.', [SES('Which functional programming ideas have gone mainstream?', '2026-09-21')], ['lang/haskell', 'lang/lisp']),
     ], see=['para/functional/immutability', 'para/functional/higher-order', 'lang/haskell'])
page('para/functional/immutability', 'Immutability', 'concept', 'para',
     'Values that never change after creation; updates produce new values. Removes whole classes of bugs and makes sharing across threads safe.',
     [
      ('Persistent data structures', 'Structural sharing lets an "updated" tree reuse most of the old one, so immutability is not a copy of everything every time.', [WP('Persistent_data_structure', 'Persistent data structure')], ['dsa/trees']),
      ('Safe to share', 'If nothing mutates, there is nothing to race on; immutability is the simplest concurrency strategy.', [WP('Immutable_object', 'Immutable object')], ['para/concurrency/data-races']),
     ], parent='para/functional')
page('para/functional/higher-order', 'Higher-order functions', 'concept', 'para',
     'Functions that take or return functions: map, filter, reduce, compose, and the decorators and middleware built from them.',
     [
      ('map, filter, reduce', 'The three operations cover most list processing and are the gateway to thinking in transformations instead of loops.', [WP('Higher-order_function', 'Higher-order function')]),
      ('Closures capture environment', 'A function returned from another keeps access to the variables it was created with; this is how callbacks and decorators carry state.', [WP('Closure_(computer_programming)', 'Closure'), SES('What exactly does a closure close over?', '2026-09-22')], ['lang/javascript']),
     ], parent='para/functional')

page('para/oop', 'Object-oriented programming', 'concept', 'para',
     'Bundling state with the operations on it: objects, classes or prototypes, encapsulation and polymorphism. Simula 67 introduced classes; Alan Kay\'s Smalltalk coined the term.',
     [
      ('Simula and Smalltalk', 'Simula 67 had classes and inheritance; Smalltalk (1970s) made everything an object and message passing the core idea.', [WP('Object-oriented_programming', 'Object-oriented programming')]),
      ('Messages, not methods', 'Kay later said the big idea was messaging and late binding, not classes and inheritance.', [WP('Smalltalk')]),
      ('Polymorphism is the payoff', 'Code written against an interface works with any implementation; the Liskov substitution principle says when that is safe.', [WP('Polymorphism_(computer_science)', 'Polymorphism')], ['para/oop/solid', 'hist/liskov']),
     ], see=['para/oop/solid', 'para/oop/composition', 'lang/javascript'])
page('para/oop/solid', 'SOLID principles', 'concept', 'para',
     'Five design principles popularised by Robert C. Martin: single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.',
     [
      ('Liskov substitution', 'Barbara Liskov\'s 1987 keynote: a subtype must be usable anywhere its supertype is, without breaking the program.', [WP('Liskov_substitution_principle', 'Liskov substitution principle')], ['hist/liskov']),
      ('Dependency inversion', 'Depend on abstractions, not concretions; it is what makes code testable with fakes and mocks.', [WP('SOLID')], ['craft/testing/unit']),
     ], parent='para/oop')
page('para/oop/composition', 'Composition over inheritance', 'concept', 'para',
     'Prefer building behaviour from small components to deep class hierarchies; a core recommendation of the 1994 Design Patterns book.',
     [
      ('The Gang of Four said it first', 'Design Patterns (Gamma, Helm, Johnson, Vlissides, 1994) lists "favor object composition over class inheritance" as a principle.', [WP('Design_Patterns', 'Design Patterns (book)')]),
      ('Traits and interfaces', 'Rust traits, Go interfaces and TypeScript structural types all push toward composition.', [SES('Composition over inheritance in Go and Rust', '2026-09-23')], ['lang/rust', 'lang/go']),
     ], parent='para/oop')

page('para/type-systems', 'Type systems', 'concept', 'para',
     'Rules that assign types to expressions and reject programs that misuse them. Static vs dynamic, strong vs weak, nominal vs structural, with inference to reduce annotations.',
     [
      ('Static vs dynamic', 'Static checking happens before running (Rust, Go, TypeScript); dynamic checking at runtime (Python, JavaScript); gradual systems mix them.', [WP('Type_system', 'Type system')], ['lang/python/type-hints', 'lang/javascript/typescript']),
      ('The billion-dollar mistake', 'Tony Hoare called null references his "billion-dollar mistake" in a 2009 talk; Option types are the remedy.', [WP('Null_pointer', 'Null pointer'), SES('Why is null called the billion-dollar mistake?', '2026-09-24')], ['para/type-systems/adts']),
      ('Types as documentation', 'A signature tells you what a function needs and promises; tooling turns that into completion, refactoring and errors at edit time.', [WIKI('para/type-systems', 'Type systems')], ['craft/documentation']),
     ], see=['para/type-systems/generics', 'para/type-systems/adts', 'para/type-systems/inference'])
page('para/type-systems/generics', 'Generics', 'concept', 'para',
     'Parametric polymorphism: writing code once for any type that satisfies a constraint. ML had it in the 1970s; Java added it in 2004, Go in 2022.',
     [
      ('One List, every element type', 'List<T> or Vec<T> is written once; the type parameter is filled at each use and checked statically.', [WP('Generic_programming', 'Generic programming')]),
      ('Bounded by traits or interfaces', 'Constraints such as T: Ord or comparable say what the generic code is allowed to do with T.', [RUST_BOOK, GO_DOC], ['lang/rust', 'lang/go']),
     ], parent='para/type-systems')
page('para/type-systems/adts', 'Algebraic data types', 'concept', 'para',
     'Product types (structs, tuples) and sum types (enums with payloads, tagged unions). Pattern matching over them makes impossible states unrepresentable.',
     [
      ('Sum and product', 'A struct is a product (all fields); an enum is a sum (one of several variants); together they describe most data shapes.', [WP('Algebraic_data_type', 'Algebraic data type')]),
      ('Option and Result', 'Maybe/Option replaces null and Either/Result replaces exceptions; the compiler forces every case to be handled.', [RUST_BOOK, HASKELL], ['lang/rust', 'lang/haskell']),
     ], parent='para/type-systems')
page('para/type-systems/inference', 'Type inference', 'concept', 'para',
     'Letting the compiler deduce types from usage. Hindley–Milner (1969/1978) gives ML and Haskell full inference; Rust, TypeScript and Go infer locally.',
     [
      ('Hindley–Milner', 'A decidable algorithm that infers the most general type of an expression without annotations; the foundation of ML-family type systems.', [WP('Hindley%E2%80%93Milner_type_system', 'Hindley–Milner type system')], ['lang/haskell']),
      ('Local inference in practice', 'let x = 5 or const x = [] infers from the right-hand side; function signatures are still written out for readability and error quality.', [TS_DOC, RUST_BOOK], ['lang/javascript/typescript', 'lang/rust/ownership']),
     ], parent='para/type-systems')

page('para/concurrency', 'Concurrency', 'concept', 'para',
     'Structuring programs as independently progressing parts: threads, async tasks, actors, channels, and the locks and races in between.',
     [
      ('Concurrency vs parallelism', 'Concurrency is about structure (many things in flight); parallelism about execution (many things at once). You can have either without the other.', [WP('Concurrency_(computer_science)', 'Concurrency')], ['lang/go/goroutines']),
      ('Amdahl\'s law', 'Speed-up is limited by the serial fraction of a program; eight cores do not make an 80 percent-serial program eight times faster.', [WP('Amdahl%27s_law', "Amdahl's law")]),
      ('Pick a model', 'Shared memory with locks, message passing, async tasks on one thread, or actors: each language leans toward one.', [SES('Threads vs async vs actors: when to use which?', '2026-09-26')], ['para/concurrency/async-await', 'para/concurrency/actors', 'para/concurrency/data-races']),
     ], see=['para/concurrency/async-await', 'para/concurrency/actors', 'para/concurrency/data-races', 'sys/os/processes-threads'])
page('para/concurrency/async-await', 'Async/await', 'concept', 'para',
     'Syntax that lets non-blocking code read like blocking code; popularised by C# 5.0 in 2012 and now in Python, JavaScript, Rust, Swift and Kotlin.',
     [
      ('Cooperative, not preemptive', 'An async task runs until it awaits; the scheduler then runs another. One slow synchronous call blocks everyone.', [MDN, PY_DOC], ['lang/javascript/event-loop']),
      ('Colour of your functions', 'Async functions can only be awaited from async functions, which splits a codebase in two; the 2015 essay "What Color is Your Function?" named the problem.', [SES('What does the "function colour" problem actually mean?', '2026-09-27')]),
     ], parent='para/concurrency')
page('para/concurrency/actors', 'Actors and message passing', 'concept', 'para',
     'Carl Hewitt\'s actor model (1973): isolated units with private state that communicate only by messages. Erlang built an industry on it; Akka and Orleans brought it to the JVM and .NET.',
     [
      ('No shared state', 'Actors cannot read each other\'s memory, so there is nothing to lock; failures are isolated and supervised.', [WP('Actor_model', 'Actor model')]),
      ('Erlang and "let it crash"', 'Erlang (Ericsson, 1986) runs millions of lightweight processes and restarts failed ones from supervisors rather than defending against every error.', [WP('Erlang_(programming_language)', 'Erlang')], ['lang/go/goroutines']),
     ], parent='para/concurrency')
page('para/concurrency/data-races', 'Locks and data races', 'concept', 'para',
     'A data race is two threads accessing the same memory, at least one writing, with no synchronisation. Mutexes prevent it; deadlocks are what you get for using them badly.',
     [
      ('Mutexes and semaphores', 'Dijkstra introduced semaphores in the 1960s; mutexes are the binary case and remain the basic tool for protecting shared state.', [WP('Semaphore_(programming)', 'Semaphore')], ['hist/dijkstra']),
      ('Deadlock', 'Two threads each holding a lock the other needs; consistent lock ordering or avoiding nested locks prevents it.', [WP('Deadlock_(computer_science)', 'Deadlock')]),
      ('Races as compile errors', 'Rust\'s Send and Sync traits turn most data races into type errors; sanitizers find them at runtime elsewhere.', [RUST_BOOK, SES('How does Rust prevent data races at compile time?', '2026-09-28')], ['lang/rust/ownership']),
     ], parent='para/concurrency')

# ================================================================ DATA STRUCTURES & ALGORITHMS
page('dsa/big-o', 'Big-O notation', 'concept', 'dsa',
     'Describing how running time or memory grows with input size, ignoring constants: O(1), O(log n), O(n), O(n log n), O(n²). The vocabulary for comparing algorithms.',
     [
      ('Bachmann–Landau', 'The notation comes from number theory (Bachmann 1894, Landau 1909); Knuth standardised its use in algorithm analysis.', [WP('Big_O_notation', 'Big O notation')], ['hist/knuth']),
      ('Worst, average, amortised', 'Quicksort is O(n²) worst case but O(n log n) on average; a dynamic array\'s append is O(1) amortised over many pushes.', [WP('Amortized_analysis', 'Amortized analysis')], ['dsa/sorting/quicksort', 'dsa/hash-tables']),
      ('Constants matter in practice', 'An O(n) scan of a small array often beats an O(log n) tree because of caches and branch prediction.', [SES('When is a linear scan faster than a hash lookup?', '2026-10-01')], ['sys/memory/stack-heap']),
     ], see=['dsa/sorting', 'dsa/hash-tables', 'dsa/trees'])
page('dsa/hash-tables', 'Hash tables', 'concept', 'dsa',
     'Key-value storage with O(1) average lookup: hash the key to a bucket, resolve collisions by chaining or open addressing, resize when the load factor grows.',
     [
      ('Collisions are inevitable', 'Two keys can hash to one bucket; chaining stores a list per bucket, open addressing probes for the next free slot.', [WP('Hash_table', 'Hash table')]),
      ('Load factor and resizing', 'When the table fills past a threshold it doubles and rehashes; that occasional O(n) step is why append is amortised O(1).', [WP('Hash_table', 'Hash table')], ['dsa/big-o']),
      ('dict and Map', 'Python dicts (insertion-ordered since 3.7) and JavaScript Maps are hash tables; Rust\'s HashMap uses a DoS-resistant SipHash by default.', [PY_DOC, MDN, RUST_BOOK], ['lang/python', 'lang/javascript', 'lang/rust']),
     ], see=['dsa/big-o', 'dsa/trees'])
page('dsa/trees', 'Trees', 'concept', 'dsa',
     'Hierarchical structures of nodes and children. Binary search trees give ordered lookup, B-trees power databases and filesystems, tries index strings by prefix.',
     [
      ('Balanced or bust', 'A binary search tree degrades to a linked list if inserts arrive sorted; AVL (1962) and red-black trees rebalance to keep O(log n).', [WP('Self-balancing_binary_search_tree', 'Self-balancing binary search tree')], ['dsa/trees/bst']),
      ('Trees are everywhere', 'File systems, DOM, parse trees, JSON documents and Git commit graphs are trees or near-trees.', [WP('Tree_(data_structure)', 'Tree (data structure)')], ['sys/compilers/parsing', 'craft/git']),
     ], see=['dsa/trees/bst', 'dsa/trees/b-trees', 'dsa/trees/tries', 'dsa/graphs'])
page('dsa/trees/bst', 'Binary search trees', 'concept', 'dsa',
     'Each node\'s left subtree holds smaller keys and right subtree larger ones; search, insert and delete are O(height), which is O(log n) when balanced.',
     [
      ('In-order traversal is sorted', 'Walking left, node, right visits keys in ascending order, which makes BSTs a natural ordered map.', [WP('Binary_search_tree', 'Binary search tree')]),
      ('Red-black in the standard libraries', 'C++ std::map and Java TreeMap are red-black trees; Rust\'s BTreeMap is, as the name says, a B-tree.', [WP('Red%E2%80%93black_tree', 'Red–black tree'), RUST_BOOK], ['dsa/trees/b-trees']),
     ], parent='dsa/trees')
page('dsa/trees/b-trees', 'B-trees', 'concept', 'dsa',
     'Wide, shallow balanced trees (Bayer and McCreight, 1972) designed for storage that reads in blocks; the index structure in most databases and many filesystems.',
     [
      ('Built for disks and pages', 'Each node fills a page and holds hundreds of keys, so a lookup touches only a handful of pages even for billions of rows.', [WP('B-tree')], ['sys/databases/indexes']),
      ('SQLite and PostgreSQL', 'Both store tables and indexes as B-tree variants; the SQLite file format documentation describes its B+-tree pages in detail.', [SQLITE], ['sys/databases']),
     ], parent='dsa/trees')
page('dsa/trees/tries', 'Tries', 'concept', 'dsa',
     'Prefix trees where each edge is a character; lookup is O(key length) regardless of how many keys are stored, which is why autocomplete and routers use them.',
     [
      ('Shared prefixes', 'Keys with common prefixes share paths, so a trie of a dictionary is compact and prefix queries are a walk, not a search.', [WP('Trie')]),
      ('Radix trees and IP routing', 'Compressed tries (radix/Patricia trees) are used for IP longest-prefix matching in routers.', [WP('Radix_tree', 'Radix tree'), SES('How do routers do longest-prefix match fast?', '2026-10-02')], ['sys/networking/tcp-ip']),
     ], parent='dsa/trees')
page('dsa/graphs', 'Graphs', 'concept', 'dsa',
     'Nodes connected by edges, directed or not, weighted or not. Traversal, shortest paths and ordering problems; the structure under maps, dependency resolution and this very visualisation.',
     [
      ('Adjacency list or matrix', 'Lists suit sparse graphs (most real ones); matrices suit dense graphs and constant-time edge checks.', [WP('Graph_(abstract_data_type)', 'Graph (abstract data type)')]),
      ('BFS and DFS', 'Breadth-first search finds shortest paths in unweighted graphs; depth-first search underlies cycle detection and topological sort.', [WP('Breadth-first_search', 'Breadth-first search'), WP('Depth-first_search', 'Depth-first search')], ['dsa/graphs/toposort']),
      ('Force-directed drawing', 'The layout you are looking at treats pages as charged particles and links as springs; it is a graph algorithm too.', [WP('Force-directed_graph_drawing', 'Force-directed graph drawing')]),
     ], see=['dsa/graphs/dijkstra', 'dsa/graphs/toposort', 'dsa/trees'])
page('dsa/graphs/dijkstra', "Dijkstra's algorithm", 'concept', 'dsa',
     'Shortest paths from one source in a graph with non-negative edge weights; conceived by Edsger Dijkstra in 1956 and published in 1959, O((V+E) log V) with a binary heap.',
     [
      ('Designed in twenty minutes', 'Dijkstra said he worked it out over coffee in Amsterdam in 1956 to demonstrate a new computer; it was published in 1959.', [WP('Dijkstra%27s_algorithm', "Dijkstra's algorithm")], ['hist/dijkstra']),
      ('Needs non-negative weights', 'A negative edge can make an already-settled node wrong; Bellman–Ford handles negatives at higher cost.', [WP('Bellman%E2%80%93Ford_algorithm', 'Bellman–Ford algorithm')]),
      ('A* adds a heuristic', 'A* (1968) is Dijkstra with an admissible estimate of remaining distance, which is what game and map routing use.', [WP('A*_search_algorithm', 'A* search algorithm'), SES('Dijkstra vs A*: when does the heuristic help?', '2026-10-03')]),
     ], parent='dsa/graphs')
page('dsa/graphs/toposort', 'Topological sort', 'concept', 'dsa',
     'An ordering of a directed acyclic graph in which every edge points forward; the algorithm behind build systems, package installs and spreadsheet recalculation.',
     [
      ('Kahn\'s algorithm or DFS', 'Repeatedly remove nodes with no incoming edges (Kahn, 1962), or reverse the finish order of a depth-first search.', [WP('Topological_sorting', 'Topological sorting')]),
      ('Cycles mean no answer', 'If a cycle exists there is no valid order, which is how package managers detect circular dependencies.', [WP('Topological_sorting', 'Topological sorting')], ['craft/package-managers', 'craft/ci-cd']),
     ], parent='dsa/graphs')
page('dsa/sorting', 'Sorting', 'concept', 'dsa',
     'Putting things in order; comparison sorts cannot beat Ω(n log n), and the interesting differences are stability, memory and behaviour on real data.',
     [
      ('The n log n floor', 'Any comparison sort needs Ω(n log n) comparisons in the worst case; counting and radix sorts sidestep it by not comparing.', [WP('Comparison_sort', 'Comparison sort')], ['dsa/big-o']),
      ('Stability', 'A stable sort keeps equal elements in their original order, which matters when sorting by one key after another.', [WP('Sorting_algorithm', 'Sorting algorithm')], ['dsa/sorting/mergesort']),
      ('What the libraries actually use', 'Python and Java (objects) use Timsort; C++ std::sort is introsort; Rust\'s stable sort is a merge variant and unstable sort a pattern-defeating quicksort.', [PY_DOC, RUST_BOOK], ['dsa/sorting/timsort', 'dsa/sorting/quicksort']),
     ], see=['dsa/sorting/quicksort', 'dsa/sorting/mergesort', 'dsa/sorting/timsort'])
page('dsa/sorting/quicksort', 'Quicksort', 'concept', 'dsa',
     'Tony Hoare\'s 1959 divide-and-conquer sort: pick a pivot, partition, recurse. O(n log n) on average, O(n²) worst case, in place and cache-friendly.',
     [
      ('Partition around a pivot', 'Everything smaller goes left, larger right; the pivot is then in its final place and both sides are sorted recursively.', [WP('Quicksort')]),
      ('Pivot choice is everything', 'Sorted input with a first-element pivot gives the quadratic case; median-of-three or random pivots avoid it, and introsort falls back to heapsort.', [WP('Introsort'), SES('Why is quicksort fast in practice despite the O(n²) worst case?', '2026-10-05')], ['dsa/big-o']),
     ], parent='dsa/sorting')
page('dsa/sorting/mergesort', 'Mergesort', 'concept', 'dsa',
     'Split, sort each half, merge; described by John von Neumann in 1945. Guaranteed O(n log n), stable, needs O(n) extra space.',
     [
      ('Predictable', 'No bad inputs: the recursion depth and the work per level are fixed, which is why it suits linked lists and external sorting.', [WP('Merge_sort', 'Merge sort')]),
      ('The merge step is the whole trick', 'Merging two sorted sequences is linear; everything else is bookkeeping.', [WP('Merge_sort', 'Merge sort')], ['dsa/sorting/timsort']),
     ], parent='dsa/sorting')
page('dsa/sorting/timsort', 'Timsort', 'concept', 'dsa',
     'Tim Peters\' hybrid of merge sort and insertion sort (2002), built for Python; it finds runs that are already ordered and merges them, so nearly sorted data sorts in near-linear time.',
     [
      ('Exploits real data', 'Real inputs often contain sorted runs; Timsort detects and extends them instead of ignoring the structure.', [WP('Timsort'), PY_DOC], ['lang/python']),
      ('Adopted by Java and Android', 'Java 7 switched object sorting to Timsort; a formal verification effort in 2015 found and fixed a bug in the run-stack invariant.', [WP('Timsort')], ['craft/testing/property-based']),
     ], parent='dsa/sorting')
page('dsa/dynamic-programming', 'Dynamic programming', 'concept', 'dsa',
     'Solving problems with overlapping subproblems by storing answers: memoisation top-down or tabulation bottom-up. Richard Bellman named it in the 1950s.',
     [
      ('Overlapping subproblems', 'Naive recursive Fibonacci is exponential because it recomputes the same values; caching makes it linear.', [WP('Dynamic_programming', 'Dynamic programming')], ['dsa/recursion']),
      ('The classics', 'Knapsack, longest common subsequence, edit distance and shortest paths in DAGs are the standard DP problems.', [WP('Edit_distance', 'Edit distance'), SES('Walk me through edit distance with a table', '2026-10-06')]),
     ], see=['dsa/recursion', 'dsa/graphs'])
page('dsa/recursion', 'Recursion', 'concept', 'dsa',
     'A function defined in terms of itself, with a base case to stop. Natural for trees and divide-and-conquer; limited by stack depth unless the language eliminates tail calls.',
     [
      ('Base case first', 'Every recursive definition needs a case that does not recurse; forgetting it is the classic stack overflow.', [WP('Recursion_(computer_science)', 'Recursion')], ['sys/memory/stack-heap']),
      ('Tail calls', 'When the recursive call is the last thing a function does, Scheme and some compilers reuse the frame; CPython deliberately does not.', [WP('Tail_call', 'Tail call')], ['lang/lisp', 'lang/python']),
     ], see=['dsa/trees', 'dsa/dynamic-programming'])

# ================================================================ SYSTEMS
page('sys/memory', 'Memory management', 'concept', 'sys',
     'Where values live and when they are freed: stack frames and heap allocations, manual free, reference counting, tracing garbage collection, or ownership checked at compile time.',
     [
      ('Three strategies', 'Manual (C), automatic at runtime (GC in Java, Go, JavaScript; refcounting in CPython and Swift), or automatic at compile time (Rust ownership).', [WP('Memory_management', 'Memory management')], ['lang/c', 'lang/rust/ownership', 'sys/memory/gc', 'sys/memory/refcount']),
      ('Leaks and dangling pointers', 'Forgetting to free leaks; freeing too early dangles. Each strategy trades one risk for another or for runtime cost.', [WP('Memory_leak', 'Memory leak')], ['lang/c/pointers']),
      ('Caches decide speed', 'A cache miss costs roughly a hundred times a hit, so layout and locality often matter more than algorithmic constants.', [SES('Why is an array faster than a linked list even with the same Big-O?', '2026-10-08')], ['dsa/big-o']),
     ], see=['sys/memory/stack-heap', 'sys/memory/gc', 'sys/memory/refcount', 'lang/rust'])
page('sys/memory/stack-heap', 'Stack vs heap', 'concept', 'sys',
     'The stack holds fixed-size frames for active calls and frees them on return; the heap holds dynamically sized or long-lived data and must be managed.',
     [
      ('Frames come and go', 'Each call pushes locals and a return address; recursion too deep overflows it.', [WP('Call_stack', 'Call stack')], ['dsa/recursion']),
      ('Heap is flexible, slower', 'Allocation involves an allocator, fragmentation and later deallocation; escape analysis lets some compilers keep heap-looking values on the stack.', [WP('Memory_management', 'Memory management'), GO_DOC], ['lang/go']),
     ], parent='sys/memory')
page('sys/memory/gc', 'Garbage collection', 'concept', 'sys',
     'Automatically reclaiming unreachable memory, invented by McCarthy for Lisp in 1959; mark-and-sweep, copying and generational collectors trade pause time against throughput.',
     [
      ('Reachability, not use', 'A collector keeps anything reachable from roots (stack, globals); unreachable cycles are freed, which refcounting alone cannot do.', [WP('Tracing_garbage_collection', 'Tracing garbage collection')], ['sys/memory/refcount']),
      ('Generational hypothesis', 'Most objects die young, so collecting the nursery often and the old generation rarely is cheaper than scanning everything.', [WP('Garbage_collection_(computer_science)', 'Garbage collection')]),
      ('Go\'s low-latency collector', 'Go\'s concurrent collector targets sub-millisecond pauses, trading some throughput for predictable latency.', [GO_DOC, SES('How does Go keep garbage-collection pauses short?', '2026-10-09')], ['lang/go']),
     ], parent='sys/memory')
page('sys/memory/refcount', 'Reference counting', 'concept', 'sys',
     'Each object tracks how many references point at it and is freed at zero; deterministic and simple, but cycles leak without a backup collector and the counts cost on every copy.',
     [
      ('CPython and Swift', 'CPython combines refcounts with a cycle collector; Swift\'s ARC inserts retain/release at compile time and uses weak references to break cycles.', [PY_DOC, WP('Automatic_Reference_Counting', 'Automatic Reference Counting')], ['lang/python']),
      ('Rc and Arc in Rust', 'Rust offers reference counting as an opt-in library type for shared ownership, atomic (Arc) when crossing threads.', [RUST_BOOK], ['lang/rust/ownership']),
     ], parent='sys/memory')

page('sys/compilers', 'Compilers and interpreters', 'concept', 'sys',
     'Turning source text into something that runs: lexing, parsing, semantic analysis, intermediate representation, optimisation and code generation, or interpreting an IR directly, or JIT-compiling it at runtime.',
     [
      ('The pipeline', 'Front end (lex, parse, check) produces an IR; the middle end optimises it; the back end emits machine code for a target.', [WP('Compiler')], ['sys/compilers/parsing', 'sys/compilers/llvm']),
      ('Interpreters are compilers in disguise', 'CPython compiles to bytecode then interprets it; V8 interprets bytecode and JIT-compiles hot functions; the line is blurry.', [WP('Interpreter_(computing)', 'Interpreter')], ['sys/compilers/jit', 'lang/python']),
      ('Optimisers assume no UB', 'Dead-code elimination and loop transformations are only valid if the program avoids undefined behaviour, which is where surprising C output comes from.', [LLVM], ['lang/c/undefined-behaviour']),
     ], see=['sys/compilers/parsing', 'sys/compilers/llvm', 'sys/compilers/jit'])
page('sys/compilers/parsing', 'Lexing and parsing', 'concept', 'sys',
     'Lexers turn characters into tokens; parsers turn tokens into a syntax tree according to a grammar, by recursive descent, LR tables or Pratt-style precedence climbing.',
     [
      ('Grammars and trees', 'A context-free grammar describes valid programs; the parser produces an abstract syntax tree that every later phase walks.', [WP('Parsing')], ['dsa/trees']),
      ('Recursive descent is what most hand-written parsers are', 'One function per grammar rule, calling each other; readable, fast, and used by Clang, Go and many others.', [WP('Recursive_descent_parser', 'Recursive descent parser'), SES('Write a tiny recursive-descent parser for arithmetic', '2026-10-10')], ['dsa/recursion']),
      ('Regular expressions are the lexer\'s theory', 'Tokens are regular languages; a lexer is a DFA built from them.', [WP('Lexical_analysis', 'Lexical analysis')], ['craft/regex']),
     ], parent='sys/compilers')
page('sys/compilers/llvm', 'LLVM', 'tool', 'sys',
     'A compiler infrastructure started by Chris Lattner at the University of Illinois in 2000 (released 2003): a typed IR plus optimisers and back ends shared by Clang, Rust, Swift and many more.',
     [
      ('One middle and back end for many languages', 'Front ends emit LLVM IR; LLVM optimises it and targets x86, ARM, RISC-V, WebAssembly and more.', [LLVM, WP('LLVM')], ['lang/rust', 'lang/c']),
      ('Source', 'LLVM and Clang are developed in the llvm/llvm-project monorepo.', [GH('llvm/llvm-project')]),
     ], parent='sys/compilers')
page('sys/compilers/jit', 'JIT compilation', 'concept', 'sys',
     'Compiling at runtime using observed behaviour: V8, the JVM\'s HotSpot and PyPy start interpreting, profile hot code and compile it with speculative optimisations that deoptimise when assumptions break.',
     [
      ('Profile, speculate, deoptimise', 'A JIT guesses types from what it has seen, compiles fast code for that case, and falls back if a different type appears.', [WP('Just-in-time_compilation', 'Just-in-time compilation')], ['lang/javascript', 'lang/javascript/node']),
      ('Tiered compilation', 'V8 runs Ignition (interpreter), then Sparkplug and TurboFan; HotSpot has C1 and C2; each tier spends more compile time for faster code.', [WP('V8_(JavaScript_engine)', 'V8 (JavaScript engine)'), SES('How does V8 make JavaScript fast?', '2026-10-12')]),
     ], parent='sys/compilers')

page('sys/os', 'Operating systems', 'concept', 'sys',
     'The layer that shares a machine between programs: processes and threads, virtual memory, files, system calls and scheduling. Unix (1969) and its descendants define the vocabulary.',
     [
      ('Unix and Linux', 'Ken Thompson and Dennis Ritchie built Unix at Bell Labs from 1969; Linus Torvalds released Linux in 1991 and it now runs most servers and every Android phone.', [WP('Unix'), WP('Linux')], ['hist/thompson-ritchie', 'hist/torvalds']),
      ('System calls are the API', 'User programs ask the kernel for everything (files, sockets, memory, processes) through a narrow syscall interface.', [WP('System_call', 'System call')]),
      ('Linux source', 'The kernel is developed at torvalds/linux on GitHub as a mirror of the mailing-list workflow.', [GH('torvalds/linux')]),
     ], see=['sys/os/processes-threads', 'sys/os/virtual-memory', 'lang/c', 'craft/shell'])
page('sys/os/processes-threads', 'Processes and threads', 'concept', 'sys',
     'A process is an address space plus resources; threads share that address space and are scheduled independently. Isolation versus cheap communication.',
     [
      ('Isolation vs sharing', 'Processes cannot corrupt each other\'s memory; threads can, which is why shared-memory concurrency needs locks.', [WP('Process_(computing)', 'Process'), WP('Thread_(computing)', 'Thread')], ['para/concurrency/data-races']),
      ('Green threads and goroutines', 'Runtimes can multiplex many lightweight tasks onto few OS threads; Go, Erlang and Java virtual threads all do this.', [GO_DOC], ['lang/go/goroutines', 'para/concurrency/actors']),
     ], parent='sys/os')
page('sys/os/virtual-memory', 'Virtual memory', 'concept', 'sys',
     'Each process sees its own flat address space; the MMU and page tables map pages to physical frames, swap, or nothing at all, and a page fault is how the kernel finds out.',
     [
      ('Pages and page tables', 'Memory is mapped in pages (commonly 4 KiB); the TLB caches translations, and a miss costs several memory accesses.', [WP('Virtual_memory', 'Virtual memory')], ['sys/memory']),
      ('Lazy everything', 'Allocation, file mapping and copy-on-write forks all rely on pages being mapped only when touched.', [WP('Copy-on-write', 'Copy-on-write'), SES('What actually happens on a page fault?', '2026-10-13')]),
     ], parent='sys/os')

page('sys/networking', 'Networking', 'concept', 'sys',
     'How programs talk across machines: the TCP/IP stack, sockets, HTTP and TLS, and the latency and failure modes that distributed systems inherit.',
     [
      ('Layers', 'Link, internet (IP), transport (TCP/UDP) and application (HTTP, DNS) layers each solve one problem; the stack is the most successful abstraction in computing.', [WP('Internet_protocol_suite', 'Internet protocol suite')], ['sys/networking/tcp-ip', 'sys/networking/http']),
      ('Fallacies of distributed computing', 'The network is not reliable, latency is not zero, bandwidth is not infinite: Peter Deutsch\'s list from 1994 still describes most outages.', [WP('Fallacies_of_distributed_computing', 'Fallacies of distributed computing')]),
     ], see=['sys/networking/tcp-ip', 'sys/networking/http', 'sys/databases'])
page('sys/networking/tcp-ip', 'TCP/IP', 'concept', 'sys',
     'IP routes packets between hosts; TCP (Cerf and Kahn, 1974) turns them into a reliable ordered byte stream with a three-way handshake, retransmission and congestion control; UDP skips all of that.',
     [
      ('The handshake', 'SYN, SYN-ACK, ACK establishes a connection and sequence numbers; closing takes four segments.', [RFC(9293, 'Transmission Control Protocol'), WP('Transmission_Control_Protocol', 'TCP')]),
      ('Congestion control keeps the internet up', 'Slow start and AIMD (Van Jacobson, 1988) let TCP share links fairly without central coordination.', [WP('TCP_congestion_control', 'TCP congestion control')]),
      ('UDP when you can afford loss', 'DNS, games and QUIC build on UDP to avoid TCP\'s head-of-line blocking.', [WP('User_Datagram_Protocol', 'UDP')], ['sys/networking/http']),
     ], parent='sys/networking')
page('sys/networking/http', 'HTTP', 'concept', 'sys',
     'The web\'s request/response protocol: HTTP/1.1 (1997) text over TCP, HTTP/2 (2015) multiplexed binary frames, HTTP/3 (2022) over QUIC on UDP; TLS underneath for https.',
     [
      ('Stateless by design', 'Each request stands alone; cookies, tokens and sessions are layered on top to remember who you are.', [RFC(9110, 'HTTP Semantics'), MDN]),
      ('Three major versions', 'HTTP/1.1 reuses connections, HTTP/2 multiplexes streams on one connection, HTTP/3 moves to QUIC to avoid TCP head-of-line blocking.', [RFC(9114, 'HTTP/3'), WP('HTTP/3')], ['sys/networking/tcp-ip']),
      ('REST and beyond', 'Fielding\'s 2000 dissertation described REST; most APIs are HTTP+JSON shaped loosely after it, with GraphQL and gRPC as alternatives.', [WP('REST'), SES('REST vs GraphQL vs gRPC for a small API', '2026-10-15')]),
     ], parent='sys/networking')

page('sys/databases', 'Databases', 'concept', 'sys',
     'Durable, queryable, concurrent storage: the relational model and SQL, indexes built on B-trees, transactions with ACID guarantees, and the normal forms that keep data consistent.',
     [
      ('Codd, 1970', 'E. F. Codd\'s "A Relational Model of Data for Large Shared Data Banks" separated what data means from how it is stored.', [WP('Edgar_F._Codd', 'Edgar F. Codd')], ['lang/sql']),
      ('SQLite is everywhere', 'The most deployed database engine, in every browser and phone; a single-file library with a famously thorough test suite.', [SQLITE, GH('sqlite/sqlite')], ['craft/testing']),
      ('PostgreSQL', 'The open-source relational workhorse, descended from Michael Stonebraker\'s POSTGRES project at Berkeley (1986).', [WP('PostgreSQL')]),
     ], see=['sys/databases/indexes', 'sys/databases/transactions', 'sys/databases/normalisation', 'lang/sql'])
page('sys/databases/indexes', 'Indexes', 'concept', 'sys',
     'Auxiliary structures, usually B-trees, that turn full-table scans into logarithmic lookups at the cost of extra writes and storage; the query planner decides when to use them.',
     [
      ('B-trees again', 'An index is a sorted structure over one or more columns pointing at rows; range queries walk it in order.', [SQLITE], ['dsa/trees/b-trees']),
      ('EXPLAIN is your friend', 'Query plans show whether an index was used; a missing index on a join column is the most common performance bug.', [SQLITE, SES('How do I read an EXPLAIN QUERY PLAN output?', '2026-10-16')]),
     ], parent='sys/databases')
page('sys/databases/transactions', 'Transactions and ACID', 'concept', 'sys',
     'Atomic, consistent, isolated, durable: a group of operations that either all happen or none do, even if the power fails halfway. Härder and Reuter coined ACID in 1983.',
     [
      ('Write-ahead logging', 'Changes are logged before they are applied, so recovery can redo or undo them after a crash.', [WP('Write-ahead_logging', 'Write-ahead logging'), SQLITE]),
      ('Isolation levels', 'Read committed, repeatable read, serializable: weaker levels allow anomalies in exchange for concurrency; MVCC gives readers snapshots without blocking writers.', [WP('Isolation_(database_systems)', 'Isolation (database systems)')], ['para/concurrency']),
     ], parent='sys/databases')
page('sys/databases/normalisation', 'Normalisation', 'concept', 'sys',
     'Organising tables so each fact is stored once: first, second and third normal form remove repeating groups and partial or transitive dependencies; denormalisation trades that back for read speed.',
     [
      ('Third normal form in one line', '"Every non-key attribute must provide a fact about the key, the whole key, and nothing but the key."', [WP('Third_normal_form', 'Third normal form')], ['lang/sql']),
      ('Denormalise on purpose', 'Analytics and caches duplicate data deliberately; the sin is doing it by accident.', [WP('Denormalization', 'Denormalization')]),
     ], parent='sys/databases')
page('sys/unicode', 'Unicode and text encoding', 'concept', 'sys',
     'Unicode assigns code points to characters; UTF-8 (Thompson and Pike, 1992) encodes them in one to four bytes while staying ASCII-compatible, which is why it won the web.',
     [
      ('Code points are not bytes, or glyphs', 'A character may be several code points (combining marks, emoji sequences), and a code point several bytes; length is a question, not a number.', [UNICODE, WP('Unicode')]),
      ('UTF-8 on a placemat', 'Ken Thompson sketched UTF-8 in a New Jersey diner in 1992; it is self-synchronising and sorts in code-point order.', [WP('UTF-8')], ['hist/thompson-ritchie']),
      ('Normalisation forms', 'NFC and NFD represent the same text differently; compare normalised strings or "é" will not equal "é".', [UNICODE, SES('Why do two identical-looking strings compare unequal?', '2026-10-17')]),
     ], see=['lang/python', 'lang/rust'])
page('sys/floating-point', 'Floating point', 'concept', 'sys',
     'IEEE 754 (1985) binary floating point: a sign, exponent and 53-bit significand for doubles. Most decimals are not representable, so 0.1 + 0.2 is not 0.3.',
     [
      ('Why 0.1 + 0.2 ≠ 0.3', '0.1 and 0.2 are repeating binary fractions; rounding both and adding gives 0.30000000000000004.', [WP('IEEE_754', 'IEEE 754'), SES('Why does 0.1 + 0.2 not equal 0.3?', '2026-10-19')]),
      ('NaN is not equal to itself', 'NaN != NaN by specification, which breaks naive equality and sorting; use isnan.', [WP('NaN')]),
      ('Use decimals for money', 'Decimal or integer-cent types avoid binary rounding; floats are for measurements, not ledgers.', [PY_DOC], ['lang/python']),
     ], see=['lang/javascript', 'dsa/big-o'])

# ================================================================ TOOLS & CRAFT
page('craft/git', 'Git', 'tool', 'craft',
     'Linus Torvalds\' distributed version control system from 2005: a content-addressed store of snapshots where branches are just pointers to commits.',
     [
      ('Born in two weeks', 'Torvalds wrote Git in April 2005 after the kernel lost access to BitKeeper; it was self-hosting within days.', [GIT_BOOK, WP('Git')], ['hist/torvalds']),
      ('Snapshots, not diffs', 'Each commit points to a tree of the whole project; identical files share the same hashed blob, so history is cheap.', [GIT_BOOK], ['dsa/trees']),
      ('Branches are pointers', 'A branch is a 41-byte file holding a commit hash; creating one is instant, which changed how people work.', [GIT_BOOK]),
      ('Source', 'Git is developed at git/git, mirrored from its mailing-list workflow.', [GH('git/git')]),
     ], see=['craft/git/branching', 'craft/git/rebase', 'craft/code-review', 'craft/ci-cd'])
page('craft/git/branching', 'Branching and merging', 'concept', 'craft',
     'Diverge to work in isolation, then merge: three-way merges find the common ancestor, conflicts are where both sides changed the same lines.',
     [
      ('Three-way merge', 'Git compares both branch tips with their merge base; non-overlapping changes merge automatically.', [GIT_BOOK]),
      ('Trunk-based or feature branches', 'Short-lived branches merged daily keep integration pain small; long-lived ones accumulate conflicts.', [GIT_BOOK, SES('Trunk-based development vs git-flow for a small team', '2026-10-20')], ['craft/ci-cd']),
     ], parent='craft/git')
page('craft/git/rebase', 'Rebasing', 'concept', 'craft',
     'Replaying commits onto a new base to produce a linear history; rewrites commit hashes, so never rebase commits others have already pulled.',
     [
      ('Clean history, new hashes', 'Rebase recreates each commit, so the result shares no identity with the original; force-pushing a shared branch strands collaborators.', [GIT_BOOK]),
      ('Interactive rebase', 'git rebase -i squashes, reorders and rewords commits before review; the tool for turning a messy day into a readable story.', [GIT_BOOK], ['craft/code-review']),
     ], parent='craft/git')
page('craft/testing', 'Testing', 'concept', 'craft',
     'Checking software does what it should, automatically and repeatedly: unit tests for pieces, integration tests for seams, property-based tests for laws, fuzzing for the inputs nobody imagined.',
     [
      ('The pyramid', 'Many fast unit tests, fewer integration tests, few end-to-end tests; the shape keeps feedback quick.', [WP('Software_testing', 'Software testing')], ['craft/testing/unit']),
      ('Tests are a design tool', 'Code that is hard to test is usually too coupled; TDD (Kent Beck) uses that pressure deliberately.', [WP('Test-driven_development', 'Test-driven development')], ['para/oop/solid']),
      ('SQLite\'s standard', 'SQLite ships with test code that outweighs the engine many times over, including out-of-memory and crash tests.', [SQLITE], ['sys/databases']),
     ], see=['craft/testing/unit', 'craft/testing/property-based', 'craft/testing/fuzzing', 'craft/ci-cd'])
page('craft/testing/unit', 'Unit tests', 'concept', 'craft',
     'Small tests of one unit in isolation. The xUnit family descends from Kent Beck\'s SUnit for Smalltalk; JUnit (1997) made it universal.',
     [
      ('Arrange, act, assert', 'Set up inputs, run the unit, check the outcome; one behaviour per test keeps failures readable.', [WP('Unit_testing', 'Unit testing')]),
      ('Fakes over mocks', 'Simple in-memory implementations are usually easier to maintain than mock frameworks that assert on call sequences.', [SES('When should I use mocks vs fakes in unit tests?', '2026-10-21')], ['para/oop/solid']),
     ], parent='craft/testing')
page('craft/testing/property-based', 'Property-based testing', 'concept', 'craft',
     'State a law (reversing twice is identity; decode(encode(x)) == x) and let the framework generate hundreds of inputs and shrink failures. QuickCheck (Claessen and Hughes, 2000) started it.',
     [
      ('QuickCheck and Hypothesis', 'QuickCheck for Haskell inspired ports everywhere; Hypothesis is the Python standard and integrates with pytest.', [WP('QuickCheck'), DOC('https://hypothesis.readthedocs.io/', 'Hypothesis documentation')], ['lang/haskell', 'lang/python']),
      ('Shrinking', 'When a property fails, the framework searches for the smallest failing input, which is what makes the failure useful.', [WP('QuickCheck')], ['para/functional']),
     ], parent='craft/testing')
page('craft/testing/fuzzing', 'Fuzzing', 'concept', 'craft',
     'Feeding programs random or mutated inputs to find crashes; Barton Miller coined the term in 1988, AFL (2013) made coverage-guided fuzzing mainstream, and OSS-Fuzz runs it continuously for open source.',
     [
      ('Coverage-guided', 'The fuzzer keeps inputs that reach new code paths and mutates them further, so it learns the input format without being told.', [WP('Fuzzing')], ['lang/c/pointers']),
      ('OSS-Fuzz', 'Google\'s service has fuzzed hundreds of open-source projects since 2016, reporting thousands of bugs.', [WP('Fuzzing'), SES('Set up libFuzzer for a small C parser', '2026-10-22')], ['sys/compilers/llvm']),
     ], parent='craft/testing')
page('craft/debugging', 'Debugging', 'concept', 'craft',
     'Finding out why the program does what it does instead of what you meant: reproduce, bisect, inspect, fix, and add the test that would have caught it.',
     [
      ('Debuggers', 'gdb (1986) and lldb set breakpoints, step and inspect; print statements remain the most used debugger in the world.', [WP('Debugger')]),
      ('git bisect', 'Binary search over history finds the commit that introduced a bug in log₂(n) builds.', [GIT_BOOK], ['craft/git', 'dsa/big-o']),
      ('Rubber duck', 'Explaining the problem aloud to an inanimate object works often enough to have a name.', [WP('Rubber_duck_debugging', 'Rubber duck debugging'), SES('My bug disappears when I add a print statement. Why?', '2026-10-23')]),
     ], see=['craft/testing', 'lang/c/undefined-behaviour'])
page('craft/code-review', 'Code review', 'concept', 'craft',
     'A second pair of eyes before code lands: catches bugs, spreads knowledge and keeps style consistent. Works best on small changes with automated checks handling the mechanical parts.',
     [
      ('Small changes review well', 'Review quality drops sharply past a few hundred lines; split work into reviewable steps.', [WP('Code_review', 'Code review')], ['craft/git/rebase']),
      ('Let tools do style', 'Formatters and linters remove the bikeshedding so humans can discuss design and correctness.', [GO_DOC], ['lang/go']),
      ('Automated reviewers', 'Static analysis and AI reviewers now comment on pull requests; treat their findings as leads to verify, not orders.', [SES('How should I handle automated code-review findings?', '2026-10-24')], ['craft/ci-cd']),
     ], see=['craft/git', 'craft/ci-cd', 'craft/testing'])
page('craft/ci-cd', 'CI/CD', 'tool', 'craft',
     'Continuous integration runs the build and tests on every push; continuous delivery keeps the main branch deployable and automates releases.',
     [
      ('Integrate daily', 'The practice comes from Extreme Programming: merging often means conflicts and breakages stay small.', [WP('Continuous_integration', 'Continuous integration')], ['craft/git/branching']),
      ('Pipelines are graphs', 'Build, test, lint and deploy stages with dependencies form a DAG, scheduled by topological order.', [WP('Continuous_delivery', 'Continuous delivery')], ['dsa/graphs/toposort']),
     ], see=['craft/testing', 'craft/package-managers'])
page('craft/package-managers', 'Package managers', 'tool', 'craft',
     'Fetching, versioning and resolving dependencies: npm, pip, Cargo, Go modules. Semantic versioning, lockfiles and the supply-chain risk of trusting a thousand strangers.',
     [
      ('Semantic versioning', 'MAJOR.MINOR.PATCH: breaking, feature, fix; a convention, not a guarantee.', [DOC('https://semver.org/', 'Semantic Versioning 2.0.0')]),
      ('Lockfiles', 'package-lock.json, Cargo.lock and similar pin the whole resolved graph so builds are reproducible.', [RUST_BOOK, NODE_DOC], ['lang/rust/cargo', 'lang/javascript/node']),
      ('left-pad, 2016', 'An eleven-line package was unpublished from npm and broke builds worldwide; the incident reshaped registry policy.', [WP('Npm_left-pad_incident', 'npm left-pad incident')]),
     ], see=['craft/ci-cd', 'dsa/graphs/toposort'])
page('craft/shell', 'Shell and the Unix philosophy', 'tool', 'craft',
     'Small programs that do one thing well, composed with pipes over text streams. Doug McIlroy\'s pipes (1973) and philosophy are why the command line is still the universal glue.',
     [
      ('Write programs that do one thing well', 'McIlroy\'s summary: do one thing, work together, handle text streams because that is a universal interface.', [WP('Unix_philosophy', 'Unix philosophy')], ['sys/os']),
      ('Pipes', 'grep | sort | uniq -c | sort -rn is a data pipeline in one line; the shell is a lazy, streaming functional language in disguise.', [WP('Pipeline_(Unix)', 'Pipeline (Unix)'), SES('Count the most common words in a log file with one shell pipeline', '2026-10-26')], ['para/functional/higher-order']),
     ], see=['sys/os', 'craft/regex'])
page('craft/regex', 'Regular expressions', 'tool', 'craft',
     'Patterns for matching text, from Kleene\'s regular languages (1951) through Thompson\'s construction (1968) to today\'s backtracking engines and their catastrophic cases.',
     [
      ('Two kinds of engine', 'Automaton-based engines (RE2, Rust regex) guarantee linear time; backtracking engines (PCRE, JavaScript) support backreferences but can blow up exponentially.', [WP('Regular_expression', 'Regular expression')], ['sys/compilers/parsing']),
      ('Catastrophic backtracking', 'Nested quantifiers like (a+)+ against a non-matching string can take seconds; it is a real denial-of-service vector.', [WP('ReDoS'), SES('Why did this regex hang my server?', '2026-10-27')]),
      ('Thompson again', 'Ken Thompson\'s 1968 paper compiled regexes to machine code for the QED editor; the NFA construction bears his name.', [WP('Thompson%27s_construction', "Thompson's construction")], ['hist/thompson-ritchie']),
     ], see=['craft/shell', 'sys/compilers/parsing'])
page('craft/documentation', 'Documentation', 'concept', 'craft',
     'Writing for the next reader, including yourself: READMEs, docstrings, reference docs and the four kinds of documentation (tutorial, how-to, reference, explanation) that Diátaxis separates.',
     [
      ('Four kinds, four jobs', 'Tutorials teach, how-tos solve, references describe, explanations illuminate; mixing them is why most docs feel wrong.', [DOC('https://diataxis.fr/', 'Diátaxis')]),
      ('Docs from code', 'rustdoc, pydoc and JSDoc render comments into reference pages so documentation lives next to what it documents.', [RUST_BOOK, PY_DOC], ['lang/rust/cargo', 'lang/python']),
      ('Knuth\'s literate programming', 'Knuth proposed (1984) writing programs as essays for humans from which code is extracted; notebooks are its descendants.', [WP('Literate_programming', 'Literate programming')], ['hist/knuth']),
     ], see=['para/type-systems', 'craft/code-review'])

# ================================================================ PIONEERS & HISTORY
page('hist/lovelace', 'Ada Lovelace', 'person', 'hist',
     '1815–1852. Her 1843 notes on Babbage\'s Analytical Engine include an algorithm for Bernoulli numbers, often called the first published computer program, and the insight that such a machine could manipulate symbols, not only numbers.',
     [
      ('Note G', 'The seventh of her notes describes a step-by-step method for the Engine to compute Bernoulli numbers.', [WP('Ada_Lovelace', 'Ada Lovelace')]),
      ('Beyond number', 'She wrote that the Engine might compose music if the relations of pitched sounds could be expressed; a prediction of general-purpose computing.', [WP('Analytical_Engine', 'Analytical Engine')], [HUB]),
     ])
page('hist/turing', 'Alan Turing', 'person', 'hist',
     '1912–1954. His 1936 paper defined the abstract machine that bears his name and proved the halting problem undecidable; later he led codebreaking at Bletchley Park and proposed the imitation game.',
     [
      ('On Computable Numbers', 'The 1936 paper introduced the Turing machine and showed no general procedure can decide whether a program halts.', [WP('Alan_Turing', 'Alan Turing'), WP('Halting_problem', 'Halting problem')], ['para/functional']),
      ('Church–Turing', 'Turing machines and Church\'s lambda calculus compute the same functions; the thesis that this captures all effective computation is named for both.', [WP('Church%E2%80%93Turing_thesis', 'Church–Turing thesis')], ['para/functional']),
      ('The award', 'The ACM Turing Award, given since 1966, is named for him; several other neurons in this lobe received it.', [WP('Turing_Award', 'Turing Award')], ['hist/dijkstra', 'hist/knuth', 'hist/liskov']),
     ])
page('hist/hopper', 'Grace Hopper', 'person', 'hist',
     '1906–1992. US Navy rear admiral and computer scientist; wrote the A-0 system (1952), one of the first compilers, led FLOW-MATIC, and shaped COBOL\'s English-like syntax.',
     [
      ('Compilers were her idea first', 'A-0 translated symbolic code into machine code at a time when many believed computers could only do arithmetic.', [WP('Grace_Hopper', 'Grace Hopper')], ['sys/compilers']),
      ('The moth', 'Her team taped a moth found in a Harvard Mark II relay into the 1947 logbook as the "first actual case of bug being found"; the word was older, the story made it stick.', [WP('Software_bug', 'Software bug')], ['craft/debugging']),
     ])
page('hist/dijkstra', 'Edsger Dijkstra', 'person', 'hist',
     '1930–2002. Dutch computer scientist: shortest-path algorithm, semaphores, structured programming, "Go To Statement Considered Harmful" (1968), Turing Award 1972.',
     [
      ('Shortest paths', 'The algorithm named for him remains the standard for single-source shortest paths with non-negative weights.', [WP('Edsger_W._Dijkstra', 'Edsger W. Dijkstra')], ['dsa/graphs/dijkstra']),
      ('Considered harmful', 'His 1968 letter argued unrestricted goto made programs impossible to reason about; the title became a genre.', [WP('Considered_harmful', 'Considered harmful')]),
      ('Semaphores and the dining philosophers', 'He introduced semaphores and the classic deadlock puzzle that still teaches concurrency.', [WP('Dining_philosophers_problem', 'Dining philosophers problem')], ['para/concurrency/data-races']),
     ])
page('hist/knuth', 'Donald Knuth', 'person', 'hist',
     'Born 1938. Author of The Art of Computer Programming (from 1968), creator of TeX (1978) and literate programming, Turing Award 1974, and source of the line about premature optimisation.',
     [
      ('TAOCP', 'The multi-volume work is the reference on algorithms and their analysis; Knuth pays a hexadecimal dollar for each error found.', [WP('The_Art_of_Computer_Programming', 'The Art of Computer Programming')], ['dsa/big-o', 'dsa/sorting']),
      ('Premature optimisation', '"We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil" (1974).', [WP('Program_optimization', 'Program optimization')], ['dsa/big-o']),
      ('TeX and literate programming', 'He wrote TeX to typeset his books and proposed literate programming to write programs as literature.', [WP('TeX')], ['craft/documentation']),
     ])
page('hist/thompson-ritchie', 'Ken Thompson and Dennis Ritchie', 'person', 'hist',
     'Bell Labs colleagues who built Unix (1969) and C (1972), shared the 1983 Turing Award; Thompson went on to UTF-8 (1992) and Go (2009), Ritchie co-wrote the C book (1978).',
     [
      ('Unix', 'Started on a spare PDP-7 in 1969; rewritten in C in 1973, which made it portable and set the model for every OS since.', [WP('Unix'), WP('Dennis_Ritchie', 'Dennis Ritchie')], ['sys/os', 'lang/c']),
      ('Thompson\'s long reach', 'Regular-expression construction, UTF-8, the Plan 9 system and Go all carry Thompson\'s hand.', [WP('Ken_Thompson', 'Ken Thompson')], ['craft/regex', 'sys/unicode', 'lang/go']),
      ('Reflections on Trusting Trust', 'Thompson\'s 1984 Turing lecture showed a compiler could insert a backdoor into itself; the founding text of supply-chain security.', [WP('Backdoor_(computing)', 'Backdoor (computing)')], ['sys/compilers', 'craft/package-managers']),
     ])
page('hist/liskov', 'Barbara Liskov', 'person', 'hist',
     'Born 1939. Designed CLU (1970s), which introduced abstract data types and iterators; stated the substitution principle (1987); Turing Award 2008.',
     [
      ('CLU', 'CLU\'s clusters were abstract data types with hidden representation; the idea became classes, modules and interfaces everywhere.', [WP('Barbara_Liskov', 'Barbara Liskov'), WP('CLU_(programming_language)', 'CLU')], ['para/oop']),
      ('Substitution principle', 'Her 1987 keynote defined behavioural subtyping; it is the L in SOLID.', [WP('Liskov_substitution_principle', 'Liskov substitution principle')], ['para/oop/solid']),
     ])
page('hist/mccarthy', 'John McCarthy', 'person', 'hist',
     '1927–2011. Invented Lisp (1958), garbage collection (1959) and the term "artificial intelligence" (1955); Turing Award 1971.',
     [
      ('Lisp', 'Lisp\'s conditional expressions, recursion and symbolic processing came from his 1960 paper on recursive functions of symbolic expressions.', [WP('John_McCarthy_(computer_scientist)', 'John McCarthy')], ['lang/lisp', 'dsa/recursion']),
      ('Garbage collection', 'He described automatic memory reclamation for Lisp in 1959; every managed runtime since inherits the idea.', [WP('Garbage_collection_(computer_science)', 'Garbage collection')], ['sys/memory/gc']),
     ])
page('hist/hamilton', 'Margaret Hamilton', 'person', 'hist',
     'Born 1936. Led the team that wrote the Apollo Guidance Computer flight software at MIT; her priority-scheduling and error-recovery design let Apollo 11 land despite overloaded alarms. Popularised the term "software engineering".',
     [
      ('1202 alarm', 'Minutes before the Apollo 11 landing the computer raised overload alarms; the software shed low-priority tasks and kept flying, as designed.', [WP('Margaret_Hamilton_(software_engineer)', 'Margaret Hamilton')], ['sys/os/processes-threads']),
      ('Software engineering', 'She used the phrase to insist software deserved the same discipline as hardware; it was not a compliment at the time.', [WP('Software_engineering', 'Software engineering')], ['craft/testing']),
     ])
page('hist/torvalds', 'Linus Torvalds', 'person', 'hist',
     'Born 1969. Released Linux in 1991 as a hobby kernel that now runs most of the internet, and wrote Git in 2005 when the kernel needed a new version-control system.',
     [
      ('Just a hobby, won\'t be big', 'His 1991 newsgroup announcement called Linux "just a hobby, won\'t be big and professional like gnu".', [WP('Linus_Torvalds', 'Linus Torvalds'), WP('History_of_Linux', 'History of Linux')], ['sys/os']),
      ('Git', 'Written in April 2005 over about two weeks; he named it after himself, he said, as "the stupid content tracker".', [WP('Git')], ['craft/git']),
     ])
page('hist/van-rossum', 'Guido van Rossum', 'person', 'hist',
     'Born 1956. Created Python in 1989–1991 at CWI and led it as "Benevolent Dictator For Life" until stepping down in 2018 after the PEP 572 debate.',
     [
      ('Python\'s designer', 'Named for Monty Python, not the snake; designed to be readable and to bridge the gap between shell scripting and C.', [WP('Guido_van_Rossum', 'Guido van Rossum')], ['lang/python']),
      ('BDFL no more', 'He stepped down in July 2018 and Python moved to an elected five-person Steering Council.', [PEP(8016, 'The Steering Council Model')]),
     ])
page('hist/eich', 'Brendan Eich', 'person', 'hist',
     'Born 1961. Created JavaScript at Netscape in 1995 in about ten days, co-founded Mozilla, and later founded Brave.',
     [
      ('Mocha, LiveScript, JavaScript', 'The language changed names twice before shipping in Netscape Navigator 2; the Java-like syntax was a management requirement.', [WP('Brendan_Eich', 'Brendan Eich')], ['lang/javascript']),
     ])

# ================================================================ STUDY LOG (hidden day pages)
import datetime
def week_of(date):  # Monday of the ISO week, so the log groups by week rather than by day
    d = datetime.date.fromisoformat(date); return (d - datetime.timedelta(days=d.weekday())).isoformat()
by_day = collections.defaultdict(list)
for date, title, uri in STUDY: by_day[week_of(date)].append((date, title, uri))
cite_pages = collections.defaultdict(list)
for P in PAGES:
    for s in P['synapses']:
        for c in s['cites']:
            if c.startswith('pplx://') and P['id'] not in cite_pages[c]: cite_pages[c].append(P['id'])
for date in sorted(by_day):
    syns = [(t[:60] + ('…' if len(t) > 60 else ''), f'Study session on {d}: "{t}".', [u], cite_pages[u][:3], 'Sessions') for d, t, u in sorted(by_day[date])]
    page(f'log/{date}', 'Week of ' + date, 'day', 'log', f'{len(syns)} study session{"s" if len(syns) != 1 else ""} in the week of {date}.', syns, created=date, updated=by_day[date][-1][0])

# ================================================================ assemble
ids = {p['id'] for p in PAGES}
for p in PAGES:
    for s in p['synapses']: s['links'] = [l for l in s['links'] if l in ids]
synapses = [s for p in PAGES for s in p['synapses']]
links = {}
def addlink(a, b, kind, note=None):
    if a == b or a not in ids or b not in ids: return
    k = tuple(sorted((a, b))); L = links.setdefault(k, {'s': k[0], 't': k[1], 'w': 0, 'kinds': [], 'notes': []})
    L['w'] += 1
    if kind not in L['kinds']: L['kinds'].append(kind)
    if note and note not in L['notes'] and len(L['notes']) < 3: L['notes'].append(note)
for p in PAGES:
    for t in SEEALSO[p['id']]: addlink(p['id'], t, 'see-also')
    for s in p['synapses']:
        for t in s['links']: addlink(p['id'], t, 'mention', s['lead'])
synLinks = [{'s': s['id'], 't': t} for s in synapses for t in s['links']]
pages_by_src = collections.defaultdict(list)
for p in PAGES:
    for u in p['sources']: pages_by_src[u].append(p['id'])
co = collections.Counter()
for u, ps in pages_by_src.items():
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)): co[tuple(sorted((ps[i], ps[j])))] += 1
cocite = [{'s': a, 't': b, 'w': w} for (a, b), w in co.items()]
sources = [{'id': u, 'label': m['label'], 'kind': m['kind'], 'pages': pages_by_src[u]} for u, m in SOURCES.items() if pages_by_src.get(u)]
bad_parents = [p['id'] for p in PAGES if p.get('parent') and p['parent'] not in ids]
assert not bad_parents, bad_parents
data = {'lobes': [{'id': l['id'], 'name': l['name'], 'color': l['color'], 'hidden': l.get('hidden', False)} for l in LOBES], 'center': HUB,
        'demo': True, 'title': 'MindBlown: Programming', 'subtitle': 'example brain · a wiki about programming', 'dayName': 'study week',
        'pages': PAGES, 'synapses': synapses, 'sources': sources, 'links': list(links.values()), 'synLinks': synLinks, 'cocite': cocite, 'built': TODAY}
with open(OUT, 'w', encoding='utf-8') as f: f.write('window.MINDBLOWN = ' + json.dumps(data, ensure_ascii=False) + ';\n')
kinds = collections.Counter(s['kind'] for s in sources)
subs = sum(1 for p in PAGES if p.get('parent'))
print(f'pages={len(PAGES)} (sub-neurons={subs}) synapses={len(synapses)} sources={len(sources)} links={len(links)} cocite={len(cocite)}', dict(kinds))
