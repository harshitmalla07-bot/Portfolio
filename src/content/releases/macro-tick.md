---
title: MACRO-TICK
type: LP
started: 2026-02-01
finished: 2026-04-30
catalog: 2
rpm: '33⅓'
tagline: A real-time embedded trading terminal. An ESP32-S3 streams live equity prices to a 16×2 character LCD, and a hold-to-arm button makes accidental trades physically impossible.
role: Firmware and hardware bring-up
stack: [ESP32-S3, C++ (PlatformIO), I2C, UART, Python]
status: Working prototype
color: '#FAC775'
ink: '#412402'
spin: 5.2
motif: waveform
photos:
  - src: ../../assets/releases/macro-tick/breadboard-bringup.jpg
    alt: An ESP32-S3 on a breadboard, wired to a backlit 16×2 character LCD, with a mechanical key switch on a lead and a decoupling capacitor on the rail.
    caption: Breadboard bring-up with the ESP32-S3, a 16×2 I2C LCD and a mechanical key switch.
tracks:
  - { title: Live prices on a 16×2 LCD over I2C, kind: Display }
  - { title: Custom 115200-baud UART protocol from a Python host, kind: Protocol }
  - { title: 4-state hold-to-arm execution FSM, kind: Safety }
  - { title: 'Breadboard bring-up: pull-ups, decoupling, bus stability', kind: Hardware }
  - { title: Python market-data simulator, kind: Verification }
# TODO: add the GitHub repo link if this one goes public
links: {}
---

MACRO-TICK is a desk-side terminal for watching and trading equities. Firmware written in C++ with PlatformIO runs on an ESP32-S3 and drives a 16×2 character LCD over a 100 kHz I2C bus with 4.7 kΩ pull-ups. Live prices stream in from a Python host over a custom 115200-baud UART protocol.

Because a stray button press could place a real trade, execution is guarded by a 4-state hold-to-arm state machine: idle, pressed, armed, cooldown. The button has to be held for 200 ms to arm, the terminal disarms itself after 2 seconds, and a 2-second cooldown follows every action. That makes an accidental trade physically impossible from the hardware side.

I brought up and debugged the whole hardware stack on a breadboard, including I2C bus stability, pull-up sizing and supply decoupling with a 100 µF capacitor. Then I validated the firmware against a Python market-data simulator before connecting it to a live brokerage API.
