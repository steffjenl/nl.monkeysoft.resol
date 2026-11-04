'use strict';

const net = require('net');
const Packet = require('resol-vbus/src/packet');

/** Build a DeltaSol MX style live packet (dst 0x0010, src 0x7E11, cmd 0x0100). */
function mxPacket(int16Values, source = 0x7E11) {
  const buf = Buffer.alloc(Math.ceil(int16Values.length * 2 / 4) * 4);
  int16Values.forEach((v, i) => buf.writeInt16LE(v, i * 2));
  return new Packet({
    destinationAddress: 0x0010,
    sourceAddress: source,
    command: 0x0100,
    frameCount: buf.length / 4,
    frameData: buf,
  });
}

/** Minimal fake KM2: +HELLO / PASS / DATA handshake, then streams packets. */
function startFakeKm2({ password = 'vbus', packets = [], intervalMs = 50 } = {}) {
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buf = '';
    let timer = null;
    socket.write('+HELLO\r\n');
    socket.on('data', (d) => {
      if (timer) return;
      buf += d.toString('latin1');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (line.startsWith('PASS ')) {
          if (line.slice(5) === password) socket.write('+OK\r\n');
          else { socket.write('-ERROR: bad password\r\n'); socket.end(); }
        } else if (line === 'DATA') {
          socket.write('+OK\r\n');
          const send = () => packets.forEach((p) => socket.write(p.toLiveBuffer()));
          send();
          timer = setInterval(send, intervalMs);
          socket.on('close', () => clearInterval(timer));
        }
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    port: server.address().port,
    close: () => new Promise((r) => { sockets.forEach((s) => s.destroy()); server.close(r); }),
  })));
}

module.exports = { mxPacket, startFakeKm2 };
