---
title: PHANTOM-16
category: Digital design
started: 2026-05-01
# No `finished` date yet: shows as "In progress since May 2026".
tagline: A 16-bit, 5-stage pipelined RISC processor, designed from scratch in synthesizable Verilog for a Tang Nano 9K FPGA.
role: RTL design and verification
stack: [Verilog, Icarus Verilog, Tang Nano 9K FPGA]
status: In progress. ALU and register file verified
color: '#AFA9EC'
ink: '#26215C'
spin: 3.6
motif: pipeline
highlights:
  - { title: '5-stage pipeline: IF, ID, EX, MEM, WB', kind: Architecture }
  - { title: 'Custom 23-instruction ISA in R, I and J formats', kind: ISA }
  - { title: 9-operation latch-free ALU, kind: RTL }
  - { title: 8×16 register file with dual read ports, kind: RTL }
  - { title: 'Memory-mapped UART, GPIO and 7-segment I/O', kind: Design }
  - { title: 'Self-checking testbench, 20 of 20 passing', kind: Verification }
links:
  source: https://github.com/harshitmalla07-bot/PHANTOM-16
  journal: https://github.com/harshitmalla07-bot/PHANTOM-16/blob/main/JOURNAL.md
---

I'm designing a 16-bit RISC processor from scratch in synthesizable Verilog, targeting a Sipeed Tang Nano 9K FPGA (GW1NR-9C). Before writing any RTL, I wrote a full product requirements document covering the ISA, the microarchitecture, the hazard and forwarding scheme, and a verification plan that targets 100% statement coverage.

The ISA is frozen at 23 instructions across three fixed-width encoding formats (R, I and J). It has an 8-register ABI with R0 hardwired to zero, plus a memory-mapped I/O region for UART, GPIO and 7-segment display peripherals.

The ALU and register file are implemented and verified. The ALU supports 9 operations and is purely combinational with no latches, and its `alu_op` encoding mirrors the R-type `funct` field so decoding costs nothing. The 8×16 register file has two read ports and write-after-read semantics, chosen to match the planned MEM→WB forwarding path.

A self-checking Icarus Verilog testbench suite passes 20 of 20 unit tests, including 16-bit overflow wrap, arithmetic versus logical right shifts (sign preservation), and same-cycle read-during-write on the register file.

Every decision goes into a public design journal. One favorite: HALT is encoded as `0x0000`. FPGA block RAM powers up as all zeros, so if the program counter ever runs off the end of valid code, the CPU halts cleanly instead of executing garbage.
