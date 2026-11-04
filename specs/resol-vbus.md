# VBus-over-TCP (what the app speaks)

Source: working PHP reader (`harenbaltix/app/Resol/VBus*.php`) and the `resol-vbus` library (`src/tcp-connection.js`).

## Handshake (TCP, default port 7053)
```
S: +HELLO\r\n
C: PASS <password>\r\n      (default "vbus")
S: +OK...\r\n               ("-..." = rejected)
C: CHANNEL <n>\r\n          (only if channel != 0)
C: DATA\r\n
S: +OK...\r\n               then raw binary VBus stream
```
Note: the `+OK` line and first binary bytes may arrive in one TCP chunk. `resol-vbus` handles this.
`resol-vbus` also supports `CONNECT <viaTag>` (VBus.net) and `CHANNELLIST`; not used.

## Frame format (protocol 1.0)
```
0xAA | dst(2 LE) | src(2 LE) | 0x10 | cmd(2 LE) | frameCount | hdrChecksum | frame*N
frame = 4 data bytes (7 bit) | septett | checksum      (6 bytes)
payload byte k of a frame = data[k] | ((septett >> k) & 1) << 7
checksum = (0x7F - sum of bytes) & 0x7F  (header: bytes 1..8, frame: first 5 bytes)
```
Decoding is done by `resol-vbus` (`Connection#receive`); the PHP decoder is the reference implementation.

## Live data packets
Controllers broadcast packets to destination `0x0010` every few seconds. DeltaSol MX: `src 0x7E11`, `cmd 0x0100`, packet id `00_0010_7E11_10_0100`. Packets addressed to other destinations carry no sensor data and are ignored (`isLiveDataPacket`).

## Sentinels
Temperature raw `8888` (= 888.8 °C) means "sensor not connected"; raw `0x7FFF` (3276.7) similar. Both mapped to "no value".

## Values (VBus 2.0, write)
`Connection#getValueById(address, valueId)` / `setValueById(address, valueId, value, {save})` using datagrams. The app waits for a free bus slot, writes, reads back and releases (`lib/writer.js`). Hardware-unverified.

## KM2 specifics
- `GET /cgi-bin/get_resol_device_information` returns firmware info (not needed).
- DL2-style HTTP `/dlx/download/live` is **not** used (unverified); TCP is.
