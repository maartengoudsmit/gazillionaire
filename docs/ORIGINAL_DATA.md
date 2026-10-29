# Recovering the original game's numbers

Status of reverse-engineering the 1996 executable (`GAZ2.EXE`, Visual Basic 3 p-code). Nothing here has been applied to the web game's rules yet.

**Confidence key:** *Verified* = read directly from the binary or the interpreter code. *Inferred* = a reading of the values and nearby text that has not been confirmed by disassembly.

## How the executable is built

* The game is a 16-bit NE executable: 92 code segments (~900 KB), carved out of the Wise installer on the CD.
* Code is **VB3 p-code**, a *direct-threaded* bytecode. Each instruction starts with a 16-bit word that is the **offset of a handler** inside segment 25 of `VBRUN300.DLL` (35,428 bytes, the interpreter). Handlers end with `es: lodsw; jmp ax` (bytes `26 ad ff e0`) and read their operands from the same stream. There are 339 such handler tails.
* Strings and numbers sit **inline in the code**. There is no external data file (`CONFIG.DAT` only holds settings).

## Literal encodings (verified against the interpreter's handler code)

| Opcode word | Meaning | Operand layout |
|---|---|---|
| `9a 38` | string literal | `size:u16, id:u16, len:u16, text[len], 0, pad to even`; `size` covers everything after itself |
| `34 38` | 16-bit integer | `i16` |
| `8d 38` | 32-bit integer | `i32` |
| `7a 38` | double | `f64` (193 occurrences, 31 distinct values) |

## What the literal scan found

### Credit limits scale with net worth (Trader's Union / Mr. Zinn)
*Verified:* the values and their order. *Inferred:* that they are credit limits, and the exact band boundaries. A cascade of net-worth comparisons, each assigning a pair of amounts (offsets `0x4c27c`–`0x4cb90`):

* Bands every 100,000 up to 1,000,000, then every 1,000,000 up to 10,000,000, then a band at 100,000,000.
* One series steps from **50,000 up to 200,000** (+5,000 per band to 100,000, then +10,000), another from **35,000 / 37,500 / 40,000 up to 130,000**, with matching second-column values from 5,000 and 10,000 upward.
* Which column is Trader's Union and which is Zinn is not yet confirmed.
* *Verified:* the literals **50,000** and **75,000** sit within a few hundred bytes of the matching credit-limit dialogue text, and **40,000 + 60,000** sit beside Zinn's "one time" offer text. Which procedure applies them has not been traced.

### Net-worth milestones
* *Verified:* ten literals `100,000,000 … 1,000,000,000` in steps of 100M at `0x48ac4`, each beside one of the "Emperor has even promised…" lines. The headline text says the first company above a net worth gets the news.
* *Inferred:* tiers `1,000,000 … 100,000,000` at `0x2a4e` and `0x55c9e` are another net-worth ladder; their purpose is unknown.
* `999,999,999` appears once near a `Money:` label (`0xa4f70`); *inferred* to be a display cap.

### Other tables seen (values verified, meaning not established)
* 18 values `40, 80 … 720` (`0x3a580`); there are 18 commodities, so this may be per-commodity, but that is a guess.
* `15, 70, 85, 80, 85, 60, 85, 85, 75, 85` (`0xcbea`, `0xdb2c`).
* `5, 10, 7.5, 15, 10, 20, 12.5 … 32.5` thousands (`0x4c28e`).
* `200 ×14` then `50, 60, 30, 40, 65, 15 …` (`0x4ce46`, `0x83d78`).
* `1000, 1000, 2000, 2000 … 10000, 10000` (`0x4ceae`, repeated at `0x4d190`, `0x83d2e`, `0x84010`).
* `20, 100, 40, 120, 65, 80, 11, 50, 130 …` (`0x78fcc`).

### Fractional constants (verified: all 31 distinct values)
`0.01` (80×), `0.02` (21×), `0.25` (20×), `0.05`, `0.04`, `0.15`, `0.5`, `0.8`, `0.85`, `0.95`, `0.99`, `1.01`, `1.02`, `1.15`, `1.2`, `1.5`, `2.25`, `2.5`, `3.25`, `3.3`, `4.75`, `7.5`, `10.5`, `0.2`, `0.202`, `0.455`, `0.545`, `0.6`, `0.75`, `0.9`, `0.03`.
Their small number *suggests* the market and AI formulas are built from a few simple pieces.

### Not found as literals
Commodity base prices, ship sizes/prices, engine costs and fuel prices were not found as obvious literal tables. They are probably computed or set through patterns the scan doesn't yet recognise. The ship names (`0x43052`) are assigned in a UI routine only.

## Disassembly feasibility

Feasible, because the interpreter is available and the opcode set is finite.

* 339 handlers, many sharing fall-through code (e.g. opcode `0x315b` is one entry in a chain of `mov ax, imm` loads), so a real 16-bit x86 decoder is needed to derive operand lengths automatically.
* The ~200 most common opcodes cover about 70% of all instruction occurrences; ~300 cover about 80%.

Rough effort (focused work):

| Phase | Work | Estimate |
|---|---|---|
| A | x86-16 subset decoder; derive operand length of every handler | 1–2 days |
| B | Name the ~120 opcodes that matter (arithmetic, compare, jumps, array/variable access, calls, floating point, string ops) | 2–4 days |
| C | Procedure boundaries, jump targets, variable/array naming, readable listing | ~2 days |
| D | Pseudo-code recovery for the subsystems we need (market, ships, economy, AI), mostly by hand | 3–5 days |
| E | Port to JavaScript and cross-check | 2–4 days |

Total: roughly 2–3 weeks if the full logic is wanted; about half if limited to the market and economy. The largest risk is verification: without running the original, a recovered formula can only be checked by reading it, not by comparing outputs.
