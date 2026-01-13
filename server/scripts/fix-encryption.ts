import { db } from "../lib/database";
import { patients } from "../../shared/schema";
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

const REQUIRED_FIELDS: Record<string, string> = {
  'nome': '[Dados não recuperáveis]',
  'registro': '[N/A]'
};

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
    if (!ciphertext) {
      return { success: true, value: null };
    }
    
    // Se não parece ser base64 criptografado, retorna como texto plano
    if (ciphertext.length < 50 || !/^[A-Za-z0-9+/=]+$/.test(ciphertext)) {
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

async function fixEncryption() {
  const currentKey = process.env.ENCRYPTION_KEY;
  
  if (!currentKey) {
    console.error('❌ ENCRYPTION_KEY não está configurada!');
    process.exit(1);
  }
  
  console.log('🔐 Iniciando limpeza de campos com criptografia incorreta...');
  console.log(`   Chave atual: ${currentKey.substring(0, 8)}...`);
  
  const allPatients = await db.select().from(patients);
  console.log(`\n📊 Total de pacientes: ${allPatients.length}`);
  
  let patientsFixed = 0;
  let fieldsCleared = 0;
  let fieldsOk = 0;
  
  for (const patient of allPatients) {
    const updates: Record<string, string | null> = {};
    let patientHasIssues = false;
    
    for (const field of SENSITIVE_PATIENT_FIELDS) {
      const value = (patient as Record<string, unknown>)[field] as string;
      if (!value) continue;
      
      const result = tryDecrypt(value, currentKey);
      
      if (result.success) {
        fieldsOk++;
      } else {
        // Campo não pode ser descriptografado - usar placeholder ou limpar
        const placeholder = REQUIRED_FIELDS[field] || null;
        updates[field] = placeholder;
        patientHasIssues = true;
        fieldsCleared++;
        console.log(`   🧹 ${patient.leito || 'Sem leito'} - Campo '${field}' ${placeholder ? 'substituído' : 'limpo'} (dados irrecuperáveis)`);
      }
    }
    
    if (patientHasIssues && Object.keys(updates).length > 0) {
      await db.update(patients).set(updates).where(eq(patients.id, patient.id));
      patientsFixed++;
    }
  }
  
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Campos OK: ${fieldsOk}`);
  console.log(`   🧹 Campos limpos: ${fieldsCleared}`);
  console.log(`   👥 Pacientes atualizados: ${patientsFixed}`);
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
