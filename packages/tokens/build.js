import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));

function flattenTokens(obj, prefix = '') {
  let result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenTokens(value, `${prefix}${key}-`));
    } else {
      let finalValue = value;
      if (Array.isArray(value)) {
         finalValue = JSON.stringify(value);
      }
      result[`${prefix}${key}`] = finalValue;
    }
  }
  return result;
}

const flatTokens = flattenTokens(tokens);

// Generate CSS
let cssContent = '/* Auto-generated tokens */\n@layer tokens {\n  :root {\n';
for (const [key, value] of Object.entries(flatTokens)) {
  cssContent += `    --sl-${key}: ${value};\n`;
}
cssContent += '  }\n}\n';
fs.writeFileSync(path.join(distDir, 'tokens.css'), cssContent);

// Generate TS object structure recursively mapping to CSS vars
function buildTsObject(obj, prefix = '') {
  let result = '{\n';
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `  "${key}": ${buildTsObject(value, `${prefix}${key}-`)},\n`;
    } else {
      result += `  "${key}": "var(--sl-${prefix}${key})",\n`;
    }
  }
  result += '}';
  return result;
}

let tsContent = `export const tokens = ${buildTsObject(tokens)};\n`;
fs.writeFileSync(path.join(distDir, 'tokens.js'), tsContent);

// Generate declaration file
function buildDtsObject(obj) {
  let result = '{\n';
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `  readonly "${key}": ${buildDtsObject(value)};\n`;
    } else {
      result += `  readonly "${key}": string;\n`;
    }
  }
  result += '}';
  return result;
}

let dtsContent = `export declare const tokens: ${buildDtsObject(tokens)};\n`;
fs.writeFileSync(path.join(distDir, 'tokens.d.ts'), dtsContent);

console.log('Tokens built successfully.');
