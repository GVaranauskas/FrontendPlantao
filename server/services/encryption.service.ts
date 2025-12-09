import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

class EncryptionService {
  private masterKey: Buffer;
  private initialized: boolean = false;

  constructor() {
    const masterKeyBase64 = process.env.ENCRYPTION_KEY;
    
    if (!masterKeyBase64) {
      console.warn('[Encryption] ENCRYPTION_KEY not set - encryption disabled');
      this.masterKey = Buffer.alloc(KEY_LENGTH);
      return;
    }

    try {
      this.masterKey = Buffer.from(masterKeyBase64, 'base64');

      if (this.masterKey.length !== KEY_LENGTH) {
        throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (got ${this.masterKey.length})`);
      }

      this.initialized = true;
      console.log('[Encryption] Service initialized with AES-256-GCM');
    } catch (error) {
      console.error('[Encryption] Failed to initialize:', error);
      this.masterKey = Buffer.alloc(KEY_LENGTH);
    }
  }

  isEnabled(): boolean {
    return this.initialized;
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    
    if (!this.initialized) {
      return plaintext;
    }

    try {
      const salt = randomBytes(SALT_LENGTH);
      const key = scryptSync(this.masterKey, salt, KEY_LENGTH);
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      const result = Buffer.concat([salt, iv, authTag, encrypted]);
      
      return result.toString('base64');
    } catch (error) {
      console.error('[Encryption] Encrypt failed:', error);
      throw new Error('Encryption failed');
    }
  }

  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;
    
    if (!this.initialized) {
      return ciphertext;
    }

    try {
      const buffer = Buffer.from(ciphertext, 'base64');
      
      if (buffer.length < ENCRYPTED_POSITION) {
        return ciphertext;
      }
      
      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
      const authTag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = buffer.subarray(ENCRYPTED_POSITION);
      
      const key = scryptSync(this.masterKey, salt, KEY_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      return ciphertext;
    }
  }

  encryptFields<T extends Record<string, unknown>>(obj: T, fields: Array<keyof T>): T {
    if (!this.initialized) return obj;
    
    const result = { ...obj };
    for (const field of fields) {
      if (typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string) as T[keyof T];
      }
    }
    return result;
  }

  decryptFields<T extends Record<string, unknown>>(obj: T, fields: Array<keyof T>): T {
    if (!this.initialized) return obj;
    
    const result = { ...obj };
    for (const field of fields) {
      if (typeof result[field] === 'string') {
        result[field] = this.decrypt(result[field] as string) as T[keyof T];
      }
    }
    return result;
  }
}

export const encryptionService = new EncryptionService();

export const SENSITIVE_PATIENT_FIELDS = [
  'nome',
  'registro', 
  'dataNascimento',
  'diagnosticoComorbidades',
  'alergias',
  'observacoesIntercorrencias',
  'dsEvolucaoCompleta'
] as const;
