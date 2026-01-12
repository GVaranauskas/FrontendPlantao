import { db } from "../lib/database";
import { patients, patientNotesHistory, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class PatientNotesService {
  async updatePatientNotes(
    patientId: string,
    notasPaciente: string | null,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    if (notasPaciente && notasPaciente.length > 200) {
      throw new Error("Notas do paciente não podem exceder 200 caracteres");
    }

    const [currentPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!currentPatient) {
      throw new Error("Paciente não encontrado");
    }

    const [user] = await db
      .select({
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const notaAnterior = currentPatient.notasPaciente;
    const agora = new Date();

    const [updatedPatient] = await db
      .update(patients)
      .set({
        notasPaciente: notasPaciente,
        notasUpdatedAt: agora,
        notasUpdatedBy: userId,
        ...(notaAnterior === null && {
          notasCreatedAt: agora,
          notasCreatedBy: userId,
        }),
      })
      .where(eq(patients.id, patientId))
      .returning();

    if (notaAnterior !== notasPaciente) {
      await db.insert(patientNotesHistory).values({
        patientId: patientId,
        notaAnterior: notaAnterior,
        notaNova: notasPaciente,
        alteradoPorId: userId,
        alteradoPorNome: user.username,
        alteradoEm: agora,
        ipAddress: ipAddress,
        userAgent: userAgent,
      });
    }

    return updatedPatient;
  }

  async getPatientNotesHistory(patientId: string) {
    const history = await db
      .select({
        id: patientNotesHistory.id,
        notaAnterior: patientNotesHistory.notaAnterior,
        notaNova: patientNotesHistory.notaNova,
        alteradoPorNome: patientNotesHistory.alteradoPorNome,
        alteradoEm: patientNotesHistory.alteradoEm,
        ipAddress: patientNotesHistory.ipAddress,
      })
      .from(patientNotesHistory)
      .where(eq(patientNotesHistory.patientId, patientId))
      .orderBy(desc(patientNotesHistory.alteradoEm));

    return history;
  }

  async getPatientNotes(patientId: string) {
    const [result] = await db
      .select({
        notasPaciente: patients.notasPaciente,
        notasUpdatedAt: patients.notasUpdatedAt,
        notasUpdatedBy: patients.notasUpdatedBy,
        notasCreatedAt: patients.notasCreatedAt,
        notasCreatedBy: patients.notasCreatedBy,
        updatedByUsername: users.username,
      })
      .from(patients)
      .leftJoin(users, eq(patients.notasUpdatedBy, users.id))
      .where(eq(patients.id, patientId))
      .limit(1);

    return result || null;
  }
}

export const patientNotesService = new PatientNotesService();
