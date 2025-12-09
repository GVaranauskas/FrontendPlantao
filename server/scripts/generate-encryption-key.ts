import { randomBytes } from 'node:crypto';

const KEY_LENGTH = 32;

const key = randomBytes(KEY_LENGTH);
const keyBase64 = key.toString('base64');

console.log('='.repeat(60));
console.log('AES-256-GCM Encryption Key Generator');
console.log('='.repeat(60));
console.log('');
console.log('Generated Key (Base64):');
console.log('');
console.log(keyBase64);
console.log('');
console.log('Add this to your environment variables as:');
console.log('');
console.log(`ENCRYPTION_KEY=${keyBase64}`);
console.log('');
console.log('IMPORTANT:');
console.log('- Store this key securely');
console.log('- Never commit to version control');
console.log('- Backup in a secure location');
console.log('- Losing this key = losing access to encrypted data');
console.log('='.repeat(60));
