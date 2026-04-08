const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 81;
const tabsDir = path.join(__dirname, 'src', 'static', 'tabs');

function createIcon(drawFunc) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawFunc(ctx, SIZE);
  return canvas.toBuffer('image/png');
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============ TODAY - Checklist icon ============
function drawToday(ctx, size, active) {
  const cx = size / 2, cy = size / 2;
  const s = size / 81;
  const mainColor = active ? '#4A9B8E' : '#9E9E9E';
  const bgColor = active ? '#E8F5E9' : '#F5F5F5';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 22 * s, 20 * s, 37 * s, 42 * s, 4 * s);
  ctx.fill();

  ctx.fillStyle = mainColor;
  drawRoundedRect(ctx, 22 * s, 20 * s, 37 * s, 12 * s, 4 * s);
  ctx.fill();
  ctx.fillRect(22 * s, 28 * s, 37 * s, 4 * s);

  ctx.fillStyle = active ? '#E0E0E0' : '#BDBDBD';
  ctx.fillRect(28 * s, 38 * s, 20 * s, 3 * s);
  ctx.fillRect(28 * s, 46 * s, 25 * s, 3 * s);

  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(50 * s, 52 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(46 * s, 52 * s);
  ctx.lineTo(49 * s, 55 * s);
  ctx.lineTo(55 * s, 48 * s);
  ctx.stroke();
}

// ============ HISTORY - Clock icon ============
function drawHistory(ctx, size, active) {
  const cx = size / 2, cy = size / 2;
  const s = size / 81;
  const mainColor = active ? '#FF9800' : '#9E9E9E';
  const handColor = active ? '#E65100' : '#757575';
  const bgColor = active ? '#FFF3E0' : '#F5F5F5';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 24 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  ctx.fillStyle = mainColor;
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90 - 90) * Math.PI / 180;
    const x = cx + Math.cos(angle) * 18 * s;
    const y = cy + Math.sin(angle) * 18 * s;
    ctx.beginPath();
    ctx.arc(x, y, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = handColor;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(-120 * Math.PI / 180) * 12 * s, cy + Math.sin(-120 * Math.PI / 180) * 12 * s);
  ctx.stroke();

  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(60 * Math.PI / 180) * 17 * s, cy + Math.sin(60 * Math.PI / 180) * 17 * s);
  ctx.stroke();

  ctx.fillStyle = handColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ============ SCHEDULE - Calendar icon ============
function drawSchedule(ctx, size, active) {
  const cx = size / 2, cy = size / 2;
  const s = size / 81;
  const mainColor = active ? '#1976D2' : '#9E9E9E';
  const dotColor = active ? '#BBDEFB' : '#BDBDBD';
  const bgColor = active ? '#E3F2FD' : '#F5F5F5';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 18 * s, 18 * s, 45 * s, 46 * s, 6 * s);
  ctx.fill();

  ctx.fillStyle = mainColor;
  drawRoundedRect(ctx, 18 * s, 18 * s, 45 * s, 14 * s, 6 * s);
  ctx.fill();
  ctx.fillRect(18 * s, 28 * s, 45 * s, 4 * s);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(30 * s, 25 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(51 * s, 25 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dotColor;
  const dotPositions = [
    [28, 40], [40.5, 40], [53, 40],
    [28, 52], [40.5, 52], [53, 52]
  ];
  dotPositions.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x * s, y * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ============ POINTS - Star coin icon ============
function drawPoints(ctx, size, active) {
  const cx = size / 2, cy = size / 2;
  const s = size / 81;
  const goldColor = active ? '#FFD700' : '#BDBDBD';
  const orangeColor = active ? '#FFA000' : '#9E9E9E';
  const bgColor = active ? '#FFF8E1' : '#F5F5F5';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = goldColor;
  ctx.beginPath();
  const starOuter = 24 * s, starInner = 12 * s;
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? starOuter : starInner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = orangeColor;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? starOuter * 0.5 : starInner * 0.5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ============ LOTTERY - Gacha/wish icon ============
function drawLottery(ctx, size, active) {
  const cx = size / 2, cy = size / 2;
  const s = size / 81;
  const mainColor = active ? '#FFB300' : '#BDBDBD';
  const innerColor = active ? '#FF6F00' : '#9E9E9E';
  const bgColor = active ? '#FFF8E1' : '#F5F5F5';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = active ? '#FFD54F' : '#BDBDBD';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 - 90) * Math.PI / 180;
    const x = cx + Math.cos(angle) * 20 * s;
    const y = cy + Math.sin(angle) * 20 * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = innerColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10 * s);
  ctx.lineTo(cx + 8 * s, cy);
  ctx.lineTo(cx, cy + 10 * s);
  ctx.lineTo(cx - 8 * s, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = active ? '#FFB300' : '#BDBDBD';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5 * s);
  ctx.lineTo(cx + 4 * s, cy);
  ctx.lineTo(cx, cy + 5 * s);
  ctx.lineTo(cx - 4 * s, cy);
  ctx.closePath();
  ctx.fill();
}

// Generate icons - normal (gray) and active (color)
const icons = [
  ['today', drawToday],
  ['history', drawHistory],
  ['schedule', drawSchedule],
  ['points', drawPoints],
  ['lottery', drawLottery]
];

icons.forEach(function(entry) {
  var name = entry[0];
  var draw = entry[1];
  // Normal state - gray
  fs.writeFileSync(path.join(tabsDir, name + '.png'), createIcon(function(ctx, size) { draw(ctx, size, false); }));
  // Active state - color
  fs.writeFileSync(path.join(tabsDir, name + '-active.png'), createIcon(function(ctx, size) { draw(ctx, size, true); }));
  console.log('Generated ' + name + '.png (gray) and ' + name + '-active.png (color)');
});

console.log('Done!');