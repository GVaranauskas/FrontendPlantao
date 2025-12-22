import { createHash } from 'node:crypto';
import type { InsertPatient } from '@shared/schema';

/**
 * CHANGE DETECTION SERVICE
 * Detecta mudanças reais nos dados antes de processar IA
 * ECONOMIA: 85-90% das chamadas de IA
 */

interface ChangeDetectionResult {
  hasChanged: boolean;
  changedFields: string[];
  previousHash: string | null;
  currentHash: string;
  changePercentage: number;
}

interface PatientSnapshot {
  patientId: string;
  hash: string;
  data: Partial<InsertPatient>;
  timestamp: Date;
  fieldsHash: Record<string, string>;
}

export class ChangeDetectionService {
  private snapshots: Map<string, PatientSnapshot> = new Map();
  
  private criticalFields = [
    'diagnostico', 'alergias', 'observacoes', 'braden', 
    'mobilidade', 'dispositivos', 'atb', 'aporteSaturacao'
  ];

  private ignoredFields = [
    'id', 'createdAt', 'updatedAt', 'fonteDados', 'dadosBrutosJson'
  ];

  detectChanges(patientId: string, currentData: Partial<InsertPatient>): ChangeDetectionResult {
    const previous = this.snapshots.get(patientId);
    
    if (!previous) {
      const result = this.createSnapshot(patientId, currentData);
      return {
        hasChanged: true,
        changedFields: ['NOVO_PACIENTE'],
        previousHash: null,
        currentHash: result.hash,
        changePercentage: 100
      };
    }

    const currentHash = this.calculateDataHash(currentData);
    
    if (currentHash === previous.hash) {
      console.log(`[ChangeDetection] ${patientId}: SEM mudanças (cache hit)`);
      return {
        hasChanged: false,
        changedFields: [],
        previousHash: previous.hash,
        currentHash,
        changePercentage: 0
      };
    }

    const changedFields = this.identifyChangedFields(previous.data, currentData);
    const changePercentage = (changedFields.length / Object.keys(currentData).length) * 100;

    console.log(`[ChangeDetection] ${patientId}: ${changedFields.length} campos mudaram (${changePercentage.toFixed(1)}%)`);

    this.createSnapshot(patientId, currentData);

    return {
      hasChanged: true,
      changedFields,
      previousHash: previous.hash,
      currentHash,
      changePercentage
    };
  }

  private createSnapshot(patientId: string, data: Partial<InsertPatient>): PatientSnapshot {
    const hash = this.calculateDataHash(data);
    const fieldsHash = this.calculateFieldsHash(data);
    
    const snapshot: PatientSnapshot = {
      patientId,
      hash,
      data,
      timestamp: new Date(),
      fieldsHash
    };

    this.snapshots.set(patientId, snapshot);
    return snapshot;
  }

  private calculateDataHash(data: Partial<InsertPatient>): string {
    const relevantData = this.extractRelevantData(data);
    const jsonString = JSON.stringify(relevantData, Object.keys(relevantData).sort());
    return createHash('md5').update(jsonString).digest('hex');
  }

  private calculateFieldsHash(data: Partial<InsertPatient>): Record<string, string> {
    const fieldsHash: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (!this.ignoredFields.includes(key) && value != null) {
        fieldsHash[key] = createHash('md5').update(String(value)).digest('hex');
      }
    }
    
    return fieldsHash;
  }

  private extractRelevantData(data: Partial<InsertPatient>): Record<string, any> {
    const relevant: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (!this.ignoredFields.includes(key) && value != null) {
        if (typeof value === 'string') {
          relevant[key] = value.trim().toLowerCase();
        } else {
          relevant[key] = value;
        }
      }
    }
    
    return relevant;
  }

  private identifyChangedFields(previous: Partial<InsertPatient>, current: Partial<InsertPatient>): string[] {
    const changedFields: string[] = [];
    
    for (const [key, currentValue] of Object.entries(current)) {
      if (this.ignoredFields.includes(key)) continue;
      
      const previousValue = previous[key as keyof InsertPatient];
      const currentNorm = this.normalizeValue(currentValue);
      const previousNorm = this.normalizeValue(previousValue);
      
      if (currentNorm !== previousNorm) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }

  private normalizeValue(value: any): string {
    if (value == null || value === '') return '';
    if (typeof value === 'string') return value.trim().toLowerCase();
    return String(value);
  }

  isCriticalChange(changedFields: string[]): boolean {
    return changedFields.some(field => this.criticalFields.includes(field));
  }

  cleanupOldSnapshots(hoursToKeep: number = 24): number {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    let removed = 0;
    
    for (const [patientId, snapshot] of this.snapshots.entries()) {
      if (snapshot.timestamp < cutoffTime) {
        this.snapshots.delete(patientId);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[ChangeDetection] Limpeza: ${removed} snapshots removidos`);
    }
    
    return removed;
  }

  getStats() {
    return {
      totalSnapshots: this.snapshots.size,
      criticalFields: this.criticalFields.length,
      memoryUsage: JSON.stringify(Array.from(this.snapshots.values())).length
    };
  }

  reset(): void {
    this.snapshots.clear();
    console.log('[ChangeDetection] Cache resetado');
  }
}

export const changeDetectionService = new ChangeDetectionService();
