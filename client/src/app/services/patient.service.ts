import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Patient {
  id: string;
  leito: string;
  especialidadeRamal: string;
  nome: string;
  registro: string;
  dataNascimento: string | null;
  dataInternacao: string | null;
  rqBradenScp: string | null;
  diagnosticoComorbidades: string | null;
  alergias: string | null;
  mobilidade: 'A' | 'D' | 'DA' | null;
  dieta: string | null;
  eliminacoes: string | null;
  dispositivos: string | null;
  atb: string | null;
  curativos: string | null;
  aporteSaida: string | null;
  examesRealizadosPendentes: string | null;
  dataProgramacaoCirurgica: string | null;
  observacoesIntercorrencias: string | null;
  previsaoAlta: string | null;
  alertStatus?: 'critical' | 'medium' | null;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = '/api/patients';

  constructor(private http: HttpClient) {}

  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  getPatient(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  createPatient(patient: Partial<Patient>): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, patient);
  }

  updatePatient(id: string, patient: Partial<Patient>): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiUrl}/${id}`, patient);
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
