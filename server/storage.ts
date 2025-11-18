import { type User, type InsertUser, type Patient, type InsertPatient, type Alert, type InsertAlert } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

  getAllAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  deleteAlert(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private alerts: Map<string, Alert>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.alerts = new Map();
    this.seedData();
  }

  private seedData() {
    const mockPatients = [
      {leito: "1", nome: "JOSÉ MANDEL BERNARD", internacao: "19/11", braden: "0;15", diagnostico: "INC", alergias: "NEGA", delta: "D", eliminacoes: "DIURESE NORMAL", dispositivos: "D - E+", atb: "ANP NEST", outros: "SANTB", aporte: "PELE INTEGRA", exames: "AAA-19%", cirurgia: "REALIZOU RP", observacoes: "ESTÁVEL", previsaoAlta: "DAT EF", alerta: null, status: "complete"},
      {leito: "5", nome: "ANA PAULA OLIVEIRA", internacao: "12/11", braden: "0;10", diagnostico: "APENDICITE AGUDA", alergias: "PENICILINA", delta: "C", eliminacoes: "EVACUAÇÃO AUSENTE", dispositivos: "D - E-", atb: "METRONIDAZOL", outros: "ANALGÉSICO", aporte: "JEJUM", exames: "LEUCOCITOSE", cirurgia: "APENDICECTOMIA", observacoes: "PÓS-OP", previsaoAlta: "22/11", alerta: "medium", status: "pending"},
      {leito: "12", nome: "LUCAS MARTINS RIBEIRO", internacao: "17/11", braden: "0;14", diagnostico: "LOMBALGIA", alergias: "NEGA", delta: "C", eliminacoes: "NORMAL", dispositivos: "NENHUM", atb: "DIPIRONA", outros: "MIORRELAXANTE", aporte: "DIETA NORMAL", exames: "RX COLUNA", cirurgia: "NENHUMA", observacoes: "DOR MODERADA", previsaoAlta: "22/11", alerta: "critical", status: "complete"},
      {leito: "15", nome: "TATIANE ROCHA BARROS", internacao: "15/11", braden: "0;18", diagnostico: "ANEMIA FERROPRIVA", alergias: "NEGA", delta: "A", eliminacoes: "NORMAL", dispositivos: "NENHUM", atb: "SULFATO FERROSO", outros: "VITAMINA C", aporte: "DIETA RICA EM FERRO", exames: "HEMOGRAMA", cirurgia: "NENHUMA", observacoes: "COMPENSADA", previsaoAlta: "20/11", alerta: "critical", status: "complete"},
    ];

    mockPatients.forEach(p => {
      const id = randomUUID();
      this.patients.set(id, { ...p, id } as Patient);
    });

    const mockAlerts: InsertAlert[] = [
      { leito: "12", priority: "high", title: "Alergia Grave", description: "Alergia a Penicilina sem observação adequada no prontuário", time: "Há 15 minutos" },
      { leito: "15", priority: "high", title: "Sinais Vitais", description: "Sinais vitais fora dos parâmetros há mais de 2 horas", time: "Há 2 horas" },
      { leito: "5", priority: "medium", title: "Escala de Braden", description: "Escala não preenchida para avaliação de úlcera", time: "Há 45 minutos" },
      { leito: "8", priority: "low", title: "Medicação", description: "Medicação pendente de atualização", time: "Há 30 minutos" },
    ];

    mockAlerts.forEach(a => {
      const id = randomUUID();
      this.alerts.set(id, { ...a, id });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient = { ...insertPatient, id } as Patient;
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updated = { ...patient, ...updates };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert = { ...insertAlert, id };
    this.alerts.set(id, alert);
    return alert;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alerts.delete(id);
  }
}

export const storage = new MemStorage();
