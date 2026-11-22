// The World in One Day — 22 November 2026.
// A deterministic Node-stdlib-only program that draws a 1024x1024 PNG
// newspaper front page summing up Sunday 22 November 2026's world news.
// No network, no dependencies. Run twice, same bytes both times.
//
// Stories (all first reported on Sunday 22 November 2026):
//  1. Peru — magnitude 6.7 quake shakes the Andes near Junin, felt in Lima.
//  2. United Nations — talks on lethal autonomous weapons fall short.
//  3. Sudan — Tasis Alliance seizes the Bau region in Blue Nile.
//  4. Hong Kong — Election Committee voting opens, about 5,700 voters.
//  5. Washington — Trump says an Iran deal could last 20 years.
//  6. India — illicit alcohol kills 11 and sickens 180 in Manipur.
//  7. Europe — EU proposes a 3% levy on big tech; France rejects it.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

const PAPER = [246, 241, 227];
const INK = [26, 26, 26];
const NAVY = [22, 35, 63];
const RED = [179, 38, 30];
const GOLD = [201, 162, 39];
const PANEL = [255, 253, 246];
const GREY = [90, 86, 76];

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn from scratch. Each glyph is 7 rows of 5 cells.
// ---------------------------------------------------------------------------
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
};

// ---------------------------------------------------------------------------
// Canvas: an RGB buffer with rect / line / text drawing.
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPixel(i, j, c);
  }
}

function frameRect(x: number, y: number, w: number, h: number, c: number[], t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: number[], t: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    for (let a = -t; a <= t; a++) {
      for (let b = -t; b <= t; b++) setPixel(x + a, y + b, c);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: number[]): void {
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = FONT[up[ci]] ?? FONT["?"];
    const ox = x + ci * 6 * scale;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          fillRect(ox + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawTextCentred(s: string, cx: number, y: number, scale: number, c: number[]): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Word-wrap plain text to a pixel width at the given scale.
function wrap(s: string, maxW: number, scale: number): string[] {
  const maxChars = Math.max(1, Math.floor((maxW + scale) / (6 * scale)));
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder: filter 0 scanlines, zlib deflate, CRC32. Fully deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Layout: newspaper front page.
// ---------------------------------------------------------------------------
interface Story {
  kicker: string;
  color: number[];
  headline: string;
  body: string;
}

const STORIES: Story[] = [
  {
    kicker: "UNITED NATIONS",
    color: NAVY,
    headline: "UN TALKS ON ROBOT WEAPONS FALL SHORT",
    body: "States fail to agree enforceable rules on lethal autonomous weapons, despite calls for a binding treaty.",
  },
  {
    kicker: "SUDAN",
    color: RED,
    headline: "TASIS ALLIANCE SEIZES BAU IN BLUE NILE",
    body: "The alliance takes the key Bau region in Sudan's Blue Nile, the latest advance in the civil war.",
  },
  {
    kicker: "HONG KONG",
    color: NAVY,
    headline: "HONG KONG VOTERS PICK ELECTION BODY",
    body: "About 5,700 voters choose members of the powerful Election Committee, which picks the city's leader.",
  },
  {
    kicker: "WASHINGTON",
    color: RED,
    headline: "TRUMP: IRAN DEAL COULD LAST 20 YEARS",
    body: "The president says a lasting nuclear deal is possible and hints at 'ultimate regime change' in Tehran.",
  },
  {
    kicker: "INDIA",
    color: NAVY,
    headline: "TOXIC LIQUOR KILLS 11 IN MANIPUR",
    body: "Illicit alcohol leaves 11 dead and 180 ill in north-east India, in the latest deadly bootleg batch.",
  },
  {
    kicker: "EUROPE",
    color: RED,
    headline: "EU EYES 3% LEVY ON BIG TECH",
    body: "Brussels proposes a levy on tech giants in a slimmer budget plan. France rejects the idea at once.",
  },
];

function drawMasthead(): void {
  fillRect(0, 0, W, 158, NAVY);
  drawTextCentred("THE WORLD IN ONE DAY", W / 2, 32, 7, PAPER);
  fillRect(92, 96, 840, 3, GOLD);
  drawTextCentred("SUNDAY 22 NOVEMBER 2026", W / 2, 114, 3, GOLD);
}

function drawLead(): void {
  // Lead panel: Peru quake. x 28..996, y 178..468.
  fillRect(28, 178, 968, 290, PANEL);
  frameRect(28, 178, 968, 290, INK, 3);
  fillRect(28, 178, 968, 6, RED);
  drawText("PERU  -  EARTHQUAKE", 48, 200, 2, RED);
  drawText("6.7 QUAKE SHAKES", 48, 226, 5, INK);
  drawText("PERU'S ANDES", 48, 266, 5, INK);
  const body = wrap(
    "A strong tremor rattles the Andes near Junin and is felt 300 km away in Lima. No deaths are reported, though homes are damaged and power is cut.",
    560,
    3,
  );
  let by = 322;
  for (const l of body) {
    drawText(l, 48, by, 3, INK);
    by += 27;
  }
  // Right-hand art: mountains and a seismograph trace.
  const ax = 660;
  const ay = 200;
  const aw = 316;
  const ah = 248;
  fillRect(ax, ay, aw, ah, [232, 226, 205]);
  frameRect(ax, ay, aw, ah, INK, 2);
  // Mountain silhouettes.
  line(ax + 10, ay + ah - 12, ax + 110, ay + 60, NAVY, 2);
  line(ax + 110, ay + 60, ax + 210, ay + ah - 12, NAVY, 2);
  line(ax + 120, ay + ah - 12, ax + 200, ay + 90, NAVY, 2);
  line(ax + 200, ay + 90, ax + 300, ay + ah - 12, NAVY, 2);
  // Seismograph zigzag across the middle.
  const trace: Array<[number, number]> = [
    [0, 0], [18, 0], [26, -26], [34, 22], [42, -10], [50, 34], [58, -30],
    [66, 12], [74, -18], [82, 26], [90, -8], [98, 0], [116, 0], [124, -20],
    [132, 16], [140, -28], [148, 30], [156, -12], [164, 8], [172, 0],
    [190, 0], [198, -14], [206, 10], [214, 0], [232, 0], [250, -8],
    [258, 6], [266, 0], [284, 0], [296, 0],
  ];
  const ty = ay + 150;
  for (let i = 0; i + 1 < trace.length; i++) {
    line(ax + 10 + trace[i][0], ty + trace[i][1], ax + 10 + trace[i + 1][0], ty + trace[i + 1][1], RED, 1);
  }
  fillRect(ax + 8, ay + ah - 30, aw - 16, 22, [232, 226, 205]);
  drawText("MAGNITUDE 6.7 - JUNIN, PERU", ax + 10, ay + ah - 26, 2, INK);
}

function drawPanel(s: Story, x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PANEL);
  frameRect(x, y, w, h, INK, 2);
  fillRect(x, y, w, 5, s.color);
  drawText(s.kicker, x + 16, y + 16, 2, s.color);
  const head = wrap(s.headline, w - 32, 3);
  let hy = y + 38;
  for (const l of head.slice(0, 2)) {
    drawText(l, x + 16, hy, 3, INK);
    hy += 26;
  }
  const body = wrap(s.body, w - 32, 2);
  let by = hy + 5;
  for (const l of body.slice(0, 3)) {
    drawText(l, x + 16, by, 2, GREY);
    by += 18;
  }
}

function drawFooter(): void {
  fillRect(28, 968, 968, 2, INK);
  drawTextCentred(
    "DRAWN BY A PROGRAM FROM THE DAY'S REPORTS - SEVEN STORIES, ONE DAY",
    W / 2,
    984,
    2,
    GREY,
  );
}

function main(): void {
  drawMasthead();
  drawLead();
  const cols = [28, 520];
  const rows = [486, 646, 806];
  const pw = 476;
  const ph = 150;
  for (let i = 0; i < STORIES.length; i++) {
    drawPanel(STORIES[i], cols[i % 2], rows[Math.floor(i / 2)], pw, ph);
  }
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  const png = encodePng();
  writeFileSync(`${outDir}/entry.png`, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`entry.png ${png.length} bytes sha256 ${sha}`);
}

main();
