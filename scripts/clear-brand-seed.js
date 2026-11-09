// Clears stock-build branding, or stages an explicitly selected distribution
// brand for this build. Brand artwork can stay outside the source tree.

const fs = require('fs');
const path = require('path');

const seedDir = path.resolve(__dirname, '..', 'builds', 'brand-seed');
const sourceValue = String(process.env.POSNIC_BRAND_SEED_SOURCE || '').trim();
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const maxLogoBytes = 8 * 1024 * 1024;

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function validatePng(file, label) {
  const stats = fs.statSync(file);
  if (!stats.isFile()) throw new Error(`${label} must be a regular PNG file.`);
  if (stats.size < pngSignature.length || stats.size > maxLogoBytes) {
    throw new Error(`${label} must be between 8 bytes and 8 MB.`);
  }
  const fd = fs.openSync(file, 'r');
  const signature = Buffer.alloc(pngSignature.length);
  try {
    fs.readSync(fd, signature, 0, signature.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (!signature.equals(pngSignature)) throw new Error(`${label} is not a PNG file.`);
}

function loadExternalBrand() {
  if (!sourceValue) return null;

  const configuredPath = path.resolve(sourceValue);
  if (!fs.existsSync(configuredPath)) throw new Error('POSNIC_BRAND_SEED_SOURCE does not exist.');
  const sourceDir = fs.realpathSync(configuredPath);
  if (!fs.statSync(sourceDir).isDirectory()) throw new Error('POSNIC_BRAND_SEED_SOURCE must point to a folder.');
  if (isWithin(seedDir, sourceDir)) {
    throw new Error('POSNIC_BRAND_SEED_SOURCE must be outside builds/brand-seed, which this build clears.');
  }

  const descriptorPath = path.join(sourceDir, 'brand.json');
  if (!fs.existsSync(descriptorPath)) throw new Error('The brand folder must contain brand.json.');
  const descriptorText = fs.readFileSync(descriptorPath, 'utf8');
  if (Buffer.byteLength(descriptorText, 'utf8') > 64 * 1024) throw new Error('brand.json must be no larger than 64 KB.');

  let descriptor;
  try {
    descriptor = JSON.parse(descriptorText);
  } catch {
    throw new Error('brand.json must contain valid JSON.');
  }
  if (!descriptor || Array.isArray(descriptor) || typeof descriptor !== 'object') {
    throw new Error('brand.json must contain a JSON object.');
  }
  if (descriptor.enabled === false || typeof descriptor.name !== 'string' || !descriptor.name.trim()) {
    throw new Error('brand.json must enable the brand and include a non-empty name.');
  }

  const logoPath = path.join(sourceDir, 'brand-logo.png');
  if (!fs.existsSync(logoPath)) throw new Error('The brand folder must contain brand-logo.png.');
  validatePng(logoPath, 'brand-logo.png');

  const loginLogoPath = path.join(sourceDir, 'brand-login-logo.png');
  const selectedLoginLogo = fs.existsSync(loginLogoPath) ? loginLogoPath : logoPath;
  validatePng(selectedLoginLogo, path.basename(selectedLoginLogo));

  const brand = {
    ...descriptor,
    enabled: true,
    name: descriptor.name.trim(),
    version: typeof descriptor.version === 'string' && descriptor.version.trim()
      ? descriptor.version.trim()
      : 'custom',
    hasLogo: true,
    hasLoginLogo: true,
  };
  delete brand.updatedAt;

  return { brand, logoPath, loginLogoPath: selectedLoginLogo };
}

function clearSeed() {
  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
    fs.writeFileSync(path.join(seedDir, '.gitkeep'), '');
    return;
  }

  for (const entry of fs.readdirSync(seedDir)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(seedDir, entry), { recursive: true, force: true });
  }
}

try {
  // Validate external files before clearing existing build output.
  const external = loadExternalBrand();
  clearSeed();

  if (!external) {
    console.log('[brand-seed] empty, as a stock build needs it to be');
  } else {
    fs.writeFileSync(path.join(seedDir, 'brand.json'), `${JSON.stringify(external.brand, null, 2)}\n`);
    fs.copyFileSync(external.logoPath, path.join(seedDir, 'brand-logo.png'));
    fs.copyFileSync(external.loginLogoPath, path.join(seedDir, 'brand-login-logo.png'));
    console.log('[brand-seed] staged the explicitly selected distribution brand');
  }
} catch (error) {
  console.error(`[brand-seed] ${error.message}`);
  process.exitCode = 1;
}
