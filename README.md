# Resol VBus for Homey

Homey app (`nl.monkeysoft.resol`) that reads Resol solar/heating controllers (DeltaSol MX, BS, SLT, ... any controller known to the `resol-vbus` specification) through a **KM2, DL2, DL3 or VBus/LAN** module using VBus-over-TCP (port 7053). No cloud, no native modules.

- One Homey device per controller found on the VBus, or one device per temperature sensor (to spread them over rooms).
- Capabilities are created dynamically from the live data: temperatures, pump speeds / outputs, irradiation, flow, pressure, operating hours, heat quantity, error flag.
- Flow cards: value changed, controller error, data lost/restored, value above/below, controller online, output running.
- Experimental: write a controller value (VBus v2) behind a per-device switch.

Docs: [docs/SETUP.md](docs/SETUP.md) · Specs: [specs/](specs/)

## Development

```
npm install
npm test                  # unit tests + fake KM2 (no hardware needed)
homey app build           # regenerates app.json from .homeycompose
homey app validate --level publish
homey app run             # needs a real KM2 on the LAN
```

Built on [resol-vbus](https://github.com/danielwippermann/resol-vbus) (MIT, pinned to 0.29.0; upstream is in maintenance mode).

Capability icons: [Tabler Icons](https://github.com/tabler/tabler-icons) (MIT), see [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
