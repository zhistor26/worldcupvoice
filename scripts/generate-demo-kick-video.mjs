/**
 * Generate a short synthetic football kickaround MP4 for WorldCupVoice demos.
 * Requires ffmpeg on PATH. Output: samples/worldcupvoice-demo-kick.mp4
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'samples');
const outFile = path.join(outDir, 'worldcupvoice-demo-kick.mp4');
const durationSec = 45;
const fps = 30;

function resolveFfmpeg() {
  const onPath = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (onPath.status === 0) {
    return 'ffmpeg';
  }
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return null;
  }
}

const ffmpeg = resolveFfmpeg();
if (!ffmpeg) {
  console.error('ERROR: ffmpeg not found. Install ffmpeg or run: npm install @ffmpeg-installer/ffmpeg');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// Green pitch, white ball, red/blue player blocks, simple pass/kick motion.
const vf = [
  'drawbox=x=0:y=0:w=iw:h=ih:color=0x1a6b2e:t=fill',
  "drawbox=x='40+mod(t*55,1100)':y='280+40*sin(t*1.7)':w=28:h=28:color=white@1:t=fill",
  "drawbox=x='180+120*sin(t*0.9)':y='360+25*sin(t*2.1)':w=36:h=56:color=0xcc2222@0.95:t=fill",
  "drawbox=x='720+100*sin(t*1.1+1)':y='340+30*cos(t*1.8)':w=36:h=56:color=0x2244cc@0.95:t=fill",
  "drawbox=x='480+80*cos(t*1.3)':y='400+20*sin(t*2.4)':w=36:h=56:color=0xcc2222@0.85:t=fill",
  "drawtext=text='WorldCupVoice Demo':x=(w-tw)/2:y=48:fontsize=34:fontcolor=white:borderw=2:bordercolor=0x00000080",
  "drawtext=text='Red vs Blue kickaround':x=(w-tw)/2:y=92:fontsize=22:fontcolor=white@0.85",
].join(',');

const args = [
  '-y',
  '-f',
  'lavfi',
  '-i',
  `color=c=0x1a6b2e:s=1280x720:d=${durationSec}:r=${fps}`,
  '-vf',
  vf,
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  outFile,
];

console.log('Generating demo kickaround video...');
console.log(`  output: ${outFile}`);
console.log(`  duration: ${durationSec}s @ ${fps}fps`);

const result = spawnSync(ffmpeg, args, { encoding: 'utf8', stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const stat = fs.statSync(outFile);
console.log(`OK: ${(stat.size / 1024 / 1024).toFixed(2)} MiB`);
