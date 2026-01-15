import { describe, it, expect, beforeAll } from 'vitest';

// Importar diretamente a instância exportada
import { encryptionService } from './encryption.service';

describe('EncryptionService', () => {
  beforeAll(() => {
    // Verificar se o serviço está habilitado
    if (!encryptionService.isEnabled()) {
      console.warn('⚠️ Encryption service não está habilitado - verifique ENCRYPTION_KEY');
    }
  });

  describe('encrypt e decrypt', () => {
    it('deve criptografar e descriptografar corretamente (se habilitado)', () => {
      const plaintext = 'João da Silva';

      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeTruthy();

      if (encryptionService.isEnabled()) {
        expect(encrypted).not.toBe(plaintext);
      } else {
        expect(encrypted).toBe(plaintext);
      }

      const decrypted = encryptionService.decrypt(encrypted!);

      expect(decrypted).toBe(plaintext);
    });

    it('deve gerar valores criptografados diferentes para mesma entrada (se habilitado)', () => {
      const plaintext = 'Teste';

      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      if (encryptionService.isEnabled()) {
        // Devem ser diferentes devido ao salt e IV únicos
        expect(encrypted1).not.toBe(encrypted2);
      } else {
        // Se desabilitado, retornam o plaintext
        expect(encrypted1).toBe(plaintext);
        expect(encrypted2).toBe(plaintext);
      }

      // Ambos descriptografam para o mesmo valor
      expect(encryptionService.decrypt(encrypted1!)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2!)).toBe(plaintext);
    });

    it('deve retornar null para entrada null', () => {
      expect(encryptionService.encrypt(null)).toBeNull();
    });

    it('deve retornar null para entrada undefined', () => {
      expect(encryptionService.encrypt(undefined)).toBeNull();
    });

    it('deve retornar null ao descriptografar null', () => {
      expect(encryptionService.decrypt(null)).toBeNull();
    });

    it('deve criptografar strings com caracteres especiais', () => {
      const plaintext = 'Alérgico à penicilina! @#$%';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted!);

      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar strings longas', () => {
      const plaintext = 'Paciente apresentou melhora clínica significativa '.repeat(10);

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted!);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('integridade (authTag)', () => {
    it('deve retornar ciphertext se dados modificados (se habilitado)', () => {
      const plaintext = 'Teste de integridade';
      const encrypted = encryptionService.encrypt(plaintext);

      if (encryptionService.isEnabled()) {
        // Modificar um byte do valor criptografado
        const buffer = Buffer.from(encrypted!, 'base64');
        buffer[buffer.length - 1] = buffer[buffer.length - 1] ^ 0xff;
        const tampered = buffer.toString('base64');

        // Descriptografia falha silenciosamente e retorna o ciphertext
        const result = encryptionService.decrypt(tampered);
        expect(result).toBe(tampered);
      } else {
        // Se desabilitado, não há criptografia para testar
        expect(encrypted).toBe(plaintext);
      }
    });
  });

  describe('isEnabled', () => {
    it('deve retornar boolean', () => {
      // Este teste não exige true porque ENCRYPTION_KEY pode não estar configurada em dev
      expect(typeof encryptionService.isEnabled()).toBe('boolean');
    });
  });

  describe('encryptFields e decryptFields', () => {
    it('deve criptografar objeto completo (se habilitado)', () => {
      const data = {
        nome: 'João Silva',
        registro: '12345',
        diagnostico: 'Pneumonia',
        alergias: 'Penicilina',
      };

      const encrypted = encryptionService.encryptFields(data, [
        'nome',
        'registro',
        'diagnostico',
        'alergias',
      ]);

      if (encryptionService.isEnabled()) {
        // Se habilitado, campos devem estar criptografados
        expect(encrypted.nome).not.toBe(data.nome);
        expect(encrypted.registro).not.toBe(data.registro);
        expect(encrypted.diagnostico).not.toBe(data.diagnostico);
        expect(encrypted.alergias).not.toBe(data.alergias);

        // Descriptografar
        const decrypted = encryptionService.decryptFields(encrypted, [
          'nome',
          'registro',
          'diagnostico',
          'alergias',
        ]);

        // Deve recuperar valores originais
        expect(decrypted.nome).toBe(data.nome);
        expect(decrypted.registro).toBe(data.registro);
        expect(decrypted.diagnostico).toBe(data.diagnostico);
        expect(decrypted.alergias).toBe(data.alergias);
      } else {
        // Se não habilitado, dados devem permanecer iguais
        expect(encrypted).toEqual(data);
      }
    });

    it('deve preservar campos não criptografados', () => {
      const data = {
        nome: 'João Silva', // criptografado
        leito: '101A', // não criptografado
        idade: 65, // não criptografado
      };

      const encrypted = encryptionService.encryptFields(data, ['nome']);

      if (encryptionService.isEnabled()) {
        expect(encrypted.nome).not.toBe(data.nome); // criptografado
      }
      // Campos não criptografados sempre preservados
      expect(encrypted.leito).toBe(data.leito);
      expect(encrypted.idade).toBe(data.idade);
    });
  });
});
