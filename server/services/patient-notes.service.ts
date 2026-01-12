import { db } from "@db";
import { patients, patientNotesHistory, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Service para gerenciar Notas dos Pacientes
 * Inclui: criação, atualização, busca e histórico completo
 */
export class PatientNotesService {
  /**
   * Atualiza as notas de um paciente e registra no histórico automaticamente
   *
   * @param patientId - ID do paciente
   * @param notasPaciente - Conteúdo da nota (máximo 200 caracteres)
   * @param userId - ID do usuário que está fazendo a alteração
   * @param ipAddress - IP do usuário
   * @param userAgent - Navegador do usuário
   */
  async updatePatientNotes(
    patientId: string,
    notasPaciente: string | null,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    // Validação: máximo 200 caracteres
    if (notasPaciente && notasPaciente.length > 200) {
      throw new Error("Notas do paciente não podem exceder 200 caracteres");
    }

    // Buscar paciente atual para pegar o valor anterior da nota
    const [currentPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!currentPatient) {
      throw new Error("Paciente não encontrado");
    }

    // Buscar informações do usuário que está fazendo a alteração
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

    // Atualizar o paciente com a nova nota
    const [updatedPatient] = await db
      .update(patients)
      .set({
        notasPaciente: notasPaciente,
        notasUpdatedAt: agora,
        notasUpdatedBy: userId,
        // Se é a primeira nota, registrar criação também
        ...(notaAnterior === null && {
          notasCreatedAt: agora,
          notasCreatedBy: userId,
        }),
      })
      .where(eq(patients.id, patientId))
      .returning();

    // Registrar no histórico APENAS se houve mudança real
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

  /**
   * Busca o histórico completo de alterações das notas de um paciente
   * Ordenado do mais recente para o mais antigo
   *
   * @param patientId - ID do paciente
   */
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

  /**
   * Busca as notas atuais de um paciente com informações de quem editou
   *
   * @param patientId - ID do paciente
   */
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

// Exportar instância única do service (singleton)
export const patientNotesService = new PatientNotesService();
