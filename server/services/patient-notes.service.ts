import { db } from "../lib/database";
import { patients, patientNotesHistory, users, patientNoteEvents, userNotifications } from "@shared/schema";
import type { NoteEventAction, PatientNoteEvent } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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

  async deletePatientNotes(
    patientId: string,
    adminUserId: string,
    reason: string | null,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; notifiedUserId?: string; event: PatientNoteEvent }> {
    const [currentPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!currentPatient) {
      throw new Error("Paciente não encontrado");
    }

    if (!currentPatient.notasPaciente) {
      throw new Error("Este paciente não possui notas para excluir");
    }

    const [adminUser] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    if (!adminUser) {
      throw new Error("Usuário administrador não encontrado");
    }

    if (adminUser.role !== "admin") {
      throw new Error("Apenas administradores podem excluir notas de pacientes");
    }

    const targetUserId = currentPatient.notasUpdatedBy || currentPatient.notasCreatedBy;
    let targetUserName: string | null = null;

    if (targetUserId) {
      const [targetUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
      targetUserName = targetUser?.name || null;
    }

    const previousValue = currentPatient.notasPaciente;
    const agora = new Date();

    await db
      .update(patients)
      .set({
        notasPaciente: null,
        notasUpdatedAt: agora,
        notasUpdatedBy: adminUserId,
      })
      .where(eq(patients.id, patientId));

    const [event] = await db
      .insert(patientNoteEvents)
      .values({
        patientId: patientId,
        patientName: currentPatient.nome,
        patientLeito: currentPatient.leito,
        action: "delete",
        previousValue: previousValue,
        newValue: null,
        performedById: adminUserId,
        performedByName: adminUser.name,
        performedByRole: adminUser.role,
        targetUserId: targetUserId,
        targetUserName: targetUserName,
        reason: reason,
        ipAddress: ipAddress,
        userAgent: userAgent,
      })
      .returning();

    await db.insert(patientNotesHistory).values({
      patientId: patientId,
      notaAnterior: previousValue,
      notaNova: null,
      alteradoPorId: adminUserId,
      alteradoPorNome: adminUser.name,
      alteradoEm: agora,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });

    if (targetUserId && targetUserId !== adminUserId) {
      await this.createNotification(
        targetUserId,
        "note_deleted",
        "Nota de paciente excluída",
        `Sua nota para o paciente ${currentPatient.nome} (leito ${currentPatient.leito}) foi excluída por ${adminUser.name}${reason ? `: "${reason}"` : "."}`,
        event.id,
        patientId
      );
    }

    return {
      success: true,
      notifiedUserId: targetUserId && targetUserId !== adminUserId ? targetUserId : undefined,
      event,
    };
  }

  async createNoteEvent(
    patientId: string,
    action: NoteEventAction,
    userId: string,
    previousValue: string | null,
    newValue: string | null,
    ipAddress: string,
    userAgent: string
  ): Promise<PatientNoteEvent> {
    const [patient] = await db
      .select({ nome: patients.nome, leito: patients.leito })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    const [user] = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!patient || !user) {
      throw new Error("Paciente ou usuário não encontrado");
    }

    const [event] = await db
      .insert(patientNoteEvents)
      .values({
        patientId,
        patientName: patient.nome,
        patientLeito: patient.leito,
        action,
        previousValue,
        newValue,
        performedById: userId,
        performedByName: user.name,
        performedByRole: user.role,
        ipAddress,
        userAgent,
      })
      .returning();

    return event;
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedEventId?: string,
    relatedPatientId?: string
  ) {
    const [notification] = await db
      .insert(userNotifications)
      .values({
        userId,
        type,
        title,
        message,
        relatedEventId,
        relatedPatientId,
        isRead: false,
      })
      .returning();

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const conditions = [eq(userNotifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(userNotifications.isRead, false));
    }

    const notifications = await db
      .select()
      .from(userNotifications)
      .where(and(...conditions))
      .orderBy(desc(userNotifications.createdAt))
      .limit(50);

    return notifications;
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    const [notification] = await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(userNotifications.id, notificationId),
          eq(userNotifications.userId, userId)
        )
      )
      .returning();

    return notification;
  }

  async markAllNotificationsAsRead(userId: string) {
    await db
      .update(userNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );

    return result.length;
  }

  async getNoteEvents(patientId: string): Promise<PatientNoteEvent[]> {
    const events = await db
      .select()
      .from(patientNoteEvents)
      .where(eq(patientNoteEvents.patientId, patientId))
      .orderBy(desc(patientNoteEvents.createdAt));

    return events;
  }
}

export const patientNotesService = new PatientNotesService();
