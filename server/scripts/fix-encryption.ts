import { db } from "../db";
import { patients, patientsHistory } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from 'crypto';

const SENSITIVE_PATIENT_FIELDS = [
  'nome',
  'registro', 
  'dataNascimento',
  'diagnostico',
  'alergias',
  'observacoes',
  'dsEvolucaoCompleta',
  'dadosBrutosJson',
  'clinicalInsights'
] as const;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_POSITION = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

function tryDecrypt(ciphertext: string, masterKeyBase64: string): { success: boolean; value: string | null } {
  try {
    if (!ciphertext || ciphertext.length < 50) {
      return { success: true, value: ciphertext };
    }
    
    const buffer = Buffer.from(ciphertext, 'base64');
    if (buffer.length < ENCRYPTED_POSITION + 1) {
      return { success: true, value: ciphertext };
    }
    
    const masterKey = Buffer.from(masterKeyBase64, 'base64');
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, ENCRYPTED_POSITION);
    const encrypted = buffer.subarray(ENCRYPTED_POSITION);
    
    const derivedKey = deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return { success: true, value: decrypted.toString('utf8') };
  } catch {
    return { success: false, value: null };
  }
}

function encrypt(plaintext: string, masterKeyBase64: string): string {
  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const derivedKey = deriveKey(masterKey, salt);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

async function fixEncryption() {
  const currentKey = process.env.ENCRYPTION_KEY;
  const oldKey = process.env.OLD_ENCRYPTION_KEY;
  
  if (!currentKey) {
    console.error('❌ ENCRYPTION_KEY não está configurada!');
    process.exit(1);
  }
  
  console.log('🔐 Iniciando correção de criptografia...');
  console.log(`   Chave atual: ${currentKey.substring(0, 8)}...`);
  if (oldKey) {
    console.log(`   Chave antiga: ${oldKey.substring(0, 8)}...`);
  }
  
  const allPatients = await db.select().from(patients);
  console.log(`\n📊 Total de pacientes: ${allPatients.length}`);
  
  let fixed = 0;
  let alreadyOk = 0;
  let failed = 0;
  
  for (const patient of allPatients) {
    let needsUpdate = false;
    const updates: Record<string, string> = {};
    
    for (const field of SENSITIVE_PATIENT_FIELDS) {
      const value = (patient as any)[field];
      if (!value) continue;
      
      const resultCurrent = tryDecrypt(value, currentKey);
      
      if (resultCurrent.success) {
        alreadyOk++;
        continue;
      }
      
      if (oldKey) {
        const resultOld = tryDecrypt(value, oldKey);
        if (resultOld.success && resultOld.value) {
          updates[field] = encrypt(resultOld.value, currentKey);
          needsUpdate = true;
          console.log(`   ✅ ${patient.leito} - Campo '${field}' recuperado com chave antiga`);
        } else {
          console.log(`   ❌ ${patient.leito} - Campo '${field}' não pode ser recuperado`);
          failed++;
        }
      } else {
        console.log(`   ⚠️ ${patient.leito} - Campo '${field}' precisa da chave antiga`);
        failed++;
      }
    }
    
    if (needsUpdate && Object.keys(updates).length > 0) {
      await db.update(patients).set(updates).where(eq(patients.id, patient.id));
      fixed++;
      console.log(`   💾 ${patient.leito} atualizado com ${Object.keys(updates).length} campos`);
    }
  }
  
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Já corretos: ${alreadyOk}`);
  console.log(`   🔧 Corrigidos: ${fixed}`);
  console.log(`   ❌ Falhas: ${failed}`);
  
  if (failed > 0 && !oldKey) {
    console.log('\n💡 Dica: Configure OLD_ENCRYPTION_KEY com a chave anterior para recuperar os dados.');
  }
}

fixEncryption()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
