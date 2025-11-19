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
      {
        leito: "1",
        especialidadeRamal: "CLÍNICA MÉDICA - NEFROLOGIA",
        nome: "JOSÉ MANDEL BERNARD",
        registro: "12345/6",
        dataNascimento: "12/03/1955",
        dataInternacao: "10/11/2025",
        rqBradenScp: "Q: 15",
        diagnosticoComorbidades: "IRC",
        alergias: "NEGA",
        mobilidade: "D",
        dieta: "DIETA BRANDA HIPOSSÓDICA",
        eliminacoes: "D+ E+",
        dispositivos: "AVP MSE 12/11",
        atb: "S/ATB",
        curativos: "PELE ÍNTEGRA",
        aporteSaida: "A.A SAT 97%",
        examesRealizadosPendentes: "REALIZADO QR + U - URINA",
        dataProgramacaoCirurgica: "",
        observacoesIntercorrencias: "CIRURGIA ERBDH",
        previsaoAlta: "08/12",
        alerta: null,
        status: "complete"
      },
      {
        leito: "2",
        especialidadeRamal: "CARDIO",
        nome: "RAIMUNDO ROBERTO ALVES TEIXEIRA",
        registro: "98765/4",
        dataNascimento: "25/08/1948",
        dataInternacao: "14/10/2025",
        rqBradenScp: "Q: 15",
        diagnosticoComorbidades: "FAA RV - IC Ponta B",
        alergias: "NEGA",
        mobilidade: "D",
        dieta: "DIETA PASTOSA",
        eliminacoes: "D+ E+",
        dispositivos: "S/AVP",
        curativos: "PELE ÍNTEGRA",
        atb: "AMOXACILINA 08/10/17",
        aporteSaida: "A.A SAT 98%",
        examesRealizadosPendentes: "DAT-14A",
        dataProgramacaoCirurgica: "",
        observacoesIntercorrencias: "EXTRAÇÃO DENTÁRIA 14A TEVE SANGRAMENTO ABUNDANTE",
        previsaoAlta: "BANHO DIÁRIO 8-10/11",
        alerta: "medium",
        status: "pending"
      },
      {
        leito: "4",
        especialidadeRamal: "CM",
        nome: "ALZEY DIAS DOMINGUES",
        registro: "23456/18",
        dataNascimento: "18/07/1962",
        dataInternacao: "10/10/2025",
        rqBradenScp: "Q: 18",
        diagnosticoComorbidades: "CARCINOMA DE HEPATÓCITAS",
        alergias: "IODO",
        mobilidade: "C",
        dieta: "DIETA GERAL",
        eliminacoes: "D+ E- (2 dias)",
        dispositivos: "AVP MSE 12/11",
        atb: "S/ATB",
        curativos: "PELE ÍNTEGRA",
        aporteSaida: "A.A SAT 97%",
        examesRealizadosPendentes: "DAY 27A MADRUGADA NORMALIZADO 12/11",
        dataProgramacaoCirurgica: "COLANGIOPANCREATOGRAFIA",
        observacoesIntercorrencias: "REALIZADO CONSULTA COM ONCOLOGISTA, AGUARDA EXAMES DE RESSONÂNCIA MAGNÉTICA AGENDADA PARA 15/11",
        previsaoAlta: "BANHO DIÁRIO 8-10/11",
        alerta: "critical",
        status: "complete"
      },
      {
        leito: "5",
        especialidadeRamal: "GASTRO CIRURGIA",
        nome: "SEBASTIÃO FERREIRA DA SILVA",
        registro: "87654/10",
        dataNascimento: "05/05/1970",
        dataInternacao: "",
        rqBradenScp: "",
        diagnosticoComorbidades: "COLANGIOCARCINOMA + COMORBIDADES",
        alergias: "D",
        mobilidade: "",
        dieta: "DIETA LÍQUIDA + FIBRA SUGESTÃO",
        eliminacoes: "D+ E+",
        dispositivos: "AVP MSE 12/11",
        atb: "S/ATB",
        curativos: "PELE ÍNTEGRA",
        aporteSaida: "A.A SAT 98%",
        examesRealizadosPendentes: "DAT-11B",
        dataProgramacaoCirurgica: "AG COLONOSCOPIA 08/04 CAM",
        observacoesIntercorrencias: "",
        previsaoAlta: "BANHO DIÁRIO 8-10/11",
        alerta: null,
        status: "complete"
      }
    ];

    mockPatients.forEach(p => {
      const id = randomUUID();
      this.patients.set(id, { ...p, id } as Patient);
    });

    const mockAlerts: InsertAlert[] = [
      { leito: "2", priority: "high", title: "Sangramento Pós-Procedimento", description: "Sangramento abundante após extração dentária - monitorar", time: "Há 15 minutos" },
      { leito: "4", priority: "high", title: "Ressonância Agendada", description: "Exame de ressonância magnética agendado para 15/11", time: "Há 2 horas" },
      { leito: "4", priority: "medium", title: "Consulta Oncologia", description: "Aguardando resultado de consulta com oncologista", time: "Há 45 minutos" },
      { leito: "5", priority: "medium", title: "Colonoscopia Agendada", description: "Colonoscopia agendada para 08/04", time: "Há 30 minutos" },
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
