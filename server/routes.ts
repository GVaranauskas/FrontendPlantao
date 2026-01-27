import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { verifyAccessToken } from "./security/jwt";
import { storage } from "./storage";
import { insertPatientSchema, insertAlertSchema, insertNursingUnitTemplateSchema, insertNursingUnitManualSchema, updateNursingUnitSchema } from "@shared/schema";
import { stringifyToToon, isToonFormat } from "./toon";
import { syncPatientFromExternalAPI, syncMultiplePatientsFromExternalAPI, syncEvolucoesByEnfermaria, syncEvolucoesByUnitIds, syncAllEvolucoes } from "./sync";
import { n8nIntegrationService } from "./services/n8n-integration-service";
import { unidadesInternacaoService } from "./services/unidades-internacao.service";
import { nursingUnitsSyncService } from "./services/nursing-units-sync.service";
import { logger } from "./lib/logger";
import { asyncHandler, AppError } from "./middleware/error-handler";
import { requireRole, requireRoleWithAuth } from "./middleware/rbac";
import { authMiddleware, authWithFirstAccessCheck } from "./middleware/auth";
import { validateLeitoParam, validateEnfermariaParam, validateUnitIdsBody, validateUUIDParam, validateQueryNumber } from "./middleware/input-validation";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import syncGPT4oRoutes from "./routes/sync-gpt4o.routes";
import { patientNotesService } from "./services/patient-notes.service";

// Helper to get formatted timestamp
const getTimestamp = () => new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).replace(',', ' UTC');

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/patients", authWithFirstAccessCheck, asyncHandler(async (req, res, next) => {
    const patients = await storage.getAllPatients();
    const acceptToon = isToonFormat(req.get("accept"));
    if (acceptToon) {
      const toonData = stringifyToToon(patients);
      res.type("application/toon").send(toonData);
    } else {
      res.json(patients);
    }
  }));

  app.get("/api/patients/:id", authWithFirstAccessCheck, validateUUIDParam('id'), asyncHandler(async (req, res, next) => {
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Patient not found", { patientId: req.params.id });
    }
    const acceptToon = isToonFormat(req.get("accept"));
    if (acceptToon) {
      const toonData = stringifyToToon(patient);
      res.type("application/toon").send(toonData);
    } else {
      res.json(patient);
    }
  }));

  app.post("/api/patients", authWithFirstAccessCheck, asyncHandler(async (req, res, next) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      const contentType = req.get("content-type");
      if (isToonFormat(contentType)) {
        const toonData = stringifyToToon(patient);
        res.status(201).type("application/toon").send(toonData);
      } else {
        res.status(201).json(patient);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        throw new AppError(400, "Invalid patient data", { error: error.message });
      }
      throw error;
    }
  }));

  app.patch("/api/patients/:id", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validatedData);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      const contentType = req.get("content-type");
      if (isToonFormat(contentType)) {
        const toonData = stringifyToToon(patient);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patient);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid patient data" });
      }
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), async (req, res) => {
    try {
      const success = await storage.deletePatient(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Patient notes endpoints
  app.patch("/api/patients/:id/notes", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const { notasPaciente } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ 
          error: "Usuário não autenticado",
          message: "Você precisa estar logado para atualizar notas" 
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.get("user-agent") || "unknown";

      const updatedPatient = await patientNotesService.updatePatientNotes(
        id,
        notasPaciente,
        userId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: "Notas atualizadas com sucesso",
        data: {
          notasPaciente: updatedPatient.notasPaciente,
          notasUpdatedAt: updatedPatient.notasUpdatedAt,
          notasUpdatedBy: updatedPatient.notasUpdatedBy,
        },
      });
    } catch (error: any) {
      console.error("Erro ao atualizar notas do paciente:", error);
      res.status(500).json({ 
        error: "Erro ao atualizar notas do paciente",
        message: error.message 
      });
    }
  });

  app.get("/api/patients/:id/notes-history", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const history = await patientNotesService.getPatientNotesHistory(id);
      res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error: any) {
      console.error("Erro ao buscar histórico de notas:", error);
      res.status(500).json({ 
        error: "Erro ao buscar histórico de notas",
        message: error.message 
      });
    }
  });

  app.get("/api/patients/:id/notes", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await patientNotesService.getPatientNotes(id);
      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      console.error("Erro ao buscar notas do paciente:", error);
      res.status(500).json({
        error: "Erro ao buscar notas do paciente",
        message: error.message
      });
    }
  });

  app.delete("/api/patients/:id/notes", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ 
          error: "Usuário não autenticado",
          message: "Você precisa estar logado para excluir notas" 
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.get("user-agent") || "unknown";

      const result = await patientNotesService.deletePatientNotes(
        id,
        userId,
        reason || null,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: "Nota excluída com sucesso",
        notifiedUser: result.notifiedUserId ? true : false,
        eventId: result.event.id,
      });
    } catch (error: any) {
      console.error("Erro ao excluir nota do paciente:", error);
      
      if (error.message === "Apenas administradores podem excluir notas de pacientes") {
        return res.status(403).json({ 
          error: "Acesso negado",
          message: error.message 
        });
      }
      
      if (error.message === "Este paciente não possui notas para excluir") {
        return res.status(404).json({ 
          error: "Nota não encontrada",
          message: error.message 
        });
      }

      res.status(500).json({ 
        error: "Erro ao excluir nota do paciente",
        message: error.message 
      });
    }
  });

  app.get("/api/patients/:id/note-events", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const events = await patientNotesService.getNoteEvents(id);
      res.status(200).json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error: any) {
      console.error("Erro ao buscar eventos de notas:", error);
      res.status(500).json({ 
        error: "Erro ao buscar eventos de notas",
        message: error.message 
      });
    }
  });

  // ==========================================
  // Patients History Endpoints (Histórico de altas/transferências)
  // ==========================================

  app.get("/api/patients-history", authWithFirstAccessCheck, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const filters: any = {};
      if (req.query.nome) filters.nome = req.query.nome as string;
      if (req.query.registro) filters.registro = req.query.registro as string;
      if (req.query.leito) filters.leito = req.query.leito as string;
      if (req.query.codigoAtendimento) filters.codigoAtendimento = req.query.codigoAtendimento as string;
      if (req.query.motivoArquivamento) filters.motivoArquivamento = req.query.motivoArquivamento as string;
      if (req.query.dsEnfermaria) filters.dsEnfermaria = req.query.dsEnfermaria as string;
      if (req.query.dataInicio) filters.dataInicio = new Date(req.query.dataInicio as string);
      if (req.query.dataFim) filters.dataFim = new Date(req.query.dataFim as string);

      const result = await storage.getPatientsHistoryPaginated({ page, limit }, filters);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao buscar histórico de pacientes:", error);
      res.status(500).json({ 
        error: "Erro ao buscar histórico de pacientes",
        message: error.message 
      });
    }
  });

  app.get("/api/patients-history/stats", authWithFirstAccessCheck, async (req, res) => {
    try {
      const stats = await storage.getPatientsHistoryStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("Erro ao buscar estatísticas do histórico:", error);
      res.status(500).json({ 
        error: "Erro ao buscar estatísticas do histórico",
        message: error.message 
      });
    }
  });

  app.get("/api/patients-history/:id", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getPatientsHistoryById(id);
      if (!record) {
        return res.status(404).json({ error: "Registro de histórico não encontrado" });
      }
      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      console.error("Erro ao buscar registro de histórico:", error);
      res.status(500).json({ 
        error: "Erro ao buscar registro de histórico",
        message: error.message 
      });
    }
  });

  app.post("/api/patients-history/:id/reactivate", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const historyRecord = await storage.getPatientsHistoryById(id);
      if (!historyRecord) {
        return res.status(404).json({ error: "Registro de histórico não encontrado" });
      }

      const reactivatedPatient = await storage.reactivatePatient(id);
      console.log(`[Reativação] Paciente ${historyRecord.nome} (${historyRecord.codigoAtendimento}) reativado por ${req.user?.username}`);

      res.status(200).json({
        success: true,
        message: `Paciente ${historyRecord.nome} reativado com sucesso`,
        data: reactivatedPatient,
      });
    } catch (error: any) {
      console.error("Erro ao reativar paciente:", error);
      res.status(500).json({ 
        error: "Erro ao reativar paciente",
        message: error.message 
      });
    }
  });

  // ==========================================
  // User Notifications Endpoints
  // ==========================================

  app.get("/api/notifications", authWithFirstAccessCheck, async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const unreadOnly = req.query.unreadOnly === "true";
      const notifications = await patientNotesService.getUserNotifications(userId, unreadOnly);
      const unreadCount = await patientNotesService.getUnreadNotificationsCount(userId);

      res.status(200).json({
        success: true,
        data: notifications,
        unreadCount,
      });
    } catch (error: any) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ 
        error: "Erro ao buscar notificações",
        message: error.message 
      });
    }
  });

  app.patch("/api/notifications/:id/read", authWithFirstAccessCheck, validateUUIDParam('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const notification = await patientNotesService.markNotificationAsRead(id, userId);
      if (!notification) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ 
        error: "Erro ao marcar notificação como lida",
        message: error.message 
      });
    }
  });

  app.post("/api/notifications/mark-all-read", authWithFirstAccessCheck, async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      await patientNotesService.markAllNotificationsAsRead(userId);

      res.status(200).json({
        success: true,
        message: "Todas as notificações foram marcadas como lidas",
      });
    } catch (error: any) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
      res.status(500).json({ 
        error: "Erro ao marcar notificações como lidas",
        message: error.message 
      });
    }
  });

  app.get("/api/notifications/unread-count", authWithFirstAccessCheck, async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const count = await patientNotesService.getUnreadNotificationsCount(userId);

      res.status(200).json({
        success: true,
        count,
      });
    } catch (error: any) {
      console.error("Erro ao buscar contagem de notificações:", error);
      res.status(500).json({ 
        error: "Erro ao buscar contagem de notificações",
        message: error.message 
      });
    }
  });

  // Admin endpoint to get patient stats
  app.get("/api/admin/patients/stats", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const patients = await storage.getAllPatients();
    res.json({
      totalPatients: patients.length,
      timestamp: new Date().toISOString()
    });
  }));

  // Admin endpoint to trigger manual sync
  app.post("/api/admin/patients/sync", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const unitIds = '22,23';
    logger.info(`Admin triggered manual sync for units: ${unitIds}`);
    
    const result = await syncEvolucoesByUnitIds(unitIds);
    const patients = await storage.getAllPatients();
    
    res.json({
      success: true,
      message: 'Sincronização concluída',
      syncResult: result,
      totalPatients: patients.length
    });
  }));

  // Admin endpoint to clear all patients (for database reset)
  app.delete("/api/admin/patients/clear-all", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { confirm } = req.body;
    if (confirm !== 'CONFIRMAR_LIMPEZA') {
      throw new AppError(400, 'Confirmação necessária: envie {"confirm": "CONFIRMAR_LIMPEZA"}');
    }
    
    const patients = await storage.getAllPatients();
    const totalBefore = patients.length;
    
    let deleted = 0;
    for (const patient of patients) {
      const success = await storage.deletePatient(patient.id);
      if (success) deleted++;
    }
    
    logger.info(`Admin cleared all patients: ${deleted}/${totalBefore} deleted`);
    
    res.json({ 
      success: true, 
      message: `${deleted} pacientes removidos`,
      totalBefore,
      deleted,
      remaining: totalBefore - deleted
    });
  }));

  app.get("/api/alerts", authWithFirstAccessCheck, async (req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(alerts);
        res.type("application/toon").send(toonData);
      } else {
        res.json(alerts);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", authWithFirstAccessCheck, async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      const contentType = req.get("content-type");
      if (isToonFormat(contentType)) {
        const toonData = stringifyToToon(alert);
        res.status(201).type("application/toon").send(toonData);
      } else {
        res.status(201).json(alert);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.delete("/api/alerts/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), async (req, res) => {
    try {
      const success = await storage.deleteAlert(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Sync endpoints for external API integration - PROTECTED with validation
  app.post("/api/sync/patient/:leito", authWithFirstAccessCheck, validateLeitoParam, async (req, res) => {
    try {
      const leito = req.params.leito;
      const patient = await syncPatientFromExternalAPI(leito);
      
      if (!patient) {
        return res.status(404).json({ message: "Failed to sync patient data from external API" });
      }

      const contentType = req.get("content-type");
      if (isToonFormat(contentType)) {
        const toonData = stringifyToToon(patient);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patient);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to sync patient" });
    }
  });

  app.post("/api/sync/patients", authWithFirstAccessCheck, async (req, res) => {
    try {
      const { leitos } = req.body;
      
      if (!Array.isArray(leitos) || leitos.length === 0) {
        return res.status(400).json({ message: "leitos array is required" });
      }
      
      // Validate each leito format
      for (const leito of leitos) {
        if (typeof leito !== 'string' || !/^[0-9]{1,3}$/.test(leito)) {
          return res.status(400).json({ message: "Invalid leito format in array" });
        }
      }

      const patients = await syncMultiplePatientsFromExternalAPI(leitos);
      
      const contentType = req.get("content-type");
      if (isToonFormat(contentType)) {
        const toonData = stringifyToToon(patients);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patients);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to sync patients" });
    }
  });

  // PRODUÇÃO: Unidades fixas 22,23
  const PRODUCTION_UNIT_IDS = "22,23";
  
  // N8N Evolucoes sync endpoint - PRODUÇÃO: apenas unidades 22,23
  app.post("/api/sync/evolucoes", authWithFirstAccessCheck, validateUnitIdsBody, async (req, res) => {
    try {
      logger.info(`[${getTimestamp()}] [Sync] Request received, body: ${JSON.stringify(req.body)}`);
      
      const { unitIds, forceUpdate } = req.body || {};
      // PRODUÇÃO: Sempre usar 22,23 como padrão, ignorar string vazia
      const params = (unitIds && unitIds.trim() !== "") ? unitIds : PRODUCTION_UNIT_IDS;
      const force = forceUpdate === true;
      
      logger.info(`[${getTimestamp()}] [Sync] Syncing evolucoes with params: ["${params}"], forceUpdate: ${force}`);
      const patients = await syncEvolucoesByUnitIds(params, force);
      
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(patients);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patients);
      }
    } catch (error) {
      logger.error(`[${getTimestamp()}] [Sync] Failed to sync evolucoes:`, error instanceof Error ? error : undefined);
      res.status(500).json({ message: "Failed to sync evolucoes" });
    }
  });

  // N8N Evolucoes sync endpoint - specific unit (legacy)
  app.post("/api/sync/evolucoes/:enfermaria", authWithFirstAccessCheck, validateEnfermariaParam, async (req, res) => {
    try {
      const enfermaria = req.params.enfermaria;
      
      if (!enfermaria || enfermaria.trim() === "") {
        return res.status(400).json({ message: "enfermaria parameter is required" });
      }

      const patients = await syncEvolucoesByEnfermaria(enfermaria);
      
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(patients);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patients);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to sync evolucoes" });
    }
  });

  // Import endpoints - PROTECTED with authentication
  app.post("/api/import/evolucoes", authWithFirstAccessCheck, async (req, res) => {
    try {
      const { enfermaria, templateId } = req.body;
      
      // Validate enfermaria format to prevent injection
      if (!enfermaria || typeof enfermaria !== 'string' || enfermaria.trim() === "") {
        return res.status(400).json({ message: "enfermaria is required" });
      }
      
      // Validate enfermaria format (should be alphanumeric with optional A/B suffix)
      if (!/^[0-9]{1,3}[A-Za-z]?$/.test(enfermaria.trim())) {
        return res.status(400).json({ message: "Invalid enfermaria format" });
      }

      // Load template if provided
      let template = null;
      if (templateId) {
        template = await storage.getTemplate(templateId);
        if (!template) {
          throw new AppError(404, "Template not found", { templateId });
        }
        logger.info(`[${getTimestamp()}] [Import] Using template: ${template.name} (${templateId})`);
      }

      logger.info(`[${getTimestamp()}] [Import] Starting import for enfermaria: ${enfermaria}`);
      
      const stats = {
        total: 0,
        importados: 0,
        erros: 0,
        detalhes: [] as Array<{ leito: string; status: string; mensagem?: string }>
      };

      // Fetch evolucoes from N8N
      const evolucoes = await n8nIntegrationService.fetchEvolucoes(enfermaria);
      
      if (!evolucoes || evolucoes.length === 0) {
        logger.info(`[${getTimestamp()}] [Import] No evolucoes found for enfermaria: ${enfermaria}`);
        
        // Save history even with no evolucoes
        await storage.createImportHistory({
          enfermaria,
          total: 0,
          importados: 0,
          erros: 0,
          detalhes: [],
          duracao: 0
        });
        
        return res.json({
          success: true,
          enfermaria,
          stats: { ...stats, total: 0 },
          mensagem: "Nenhuma evolução encontrada para esta enfermaria"
        });
      }

      stats.total = evolucoes.length;

      // Process each evolução
      for (const evolucao of evolucoes) {
        try {
          const leito = evolucao.leito || evolucao.ds_leito_completo || "";
          
          if (!leito) {
            stats.erros++;
            stats.detalhes.push({ 
              leito: "DESCONHECIDO", 
              status: "erro", 
              mensagem: "Leito não encontrado na evolução" 
            });
            logger.warn(`[${getTimestamp()}] [Import] Leito not found, skipping`);
            continue;
          }

          // Process and validate
          const processada = await n8nIntegrationService.processEvolucao(leito, evolucao);
          const validacao = n8nIntegrationService.validateProcessedData(processada);

          if (!validacao.valid) {
            stats.erros++;
            stats.detalhes.push({ 
              leito, 
              status: "erro", 
              mensagem: validacao.errors.join("; ") 
            });
            logger.warn(`[${getTimestamp()}] [Import] Validation failed for leito ${leito}: ${validacao.errors.join(', ')}`);
            continue;
          }

          // UPSERT atômico: usa codigoAtendimento ou leito como chave única
          const codigoAtendimento = processada.dadosProcessados.codigoAtendimento?.toString().trim() || '';
          
          try {
            let patient;
            if (codigoAtendimento) {
              patient = await storage.upsertPatientByCodigoAtendimento(processada.dadosProcessados);
            } else {
              patient = await storage.upsertPatientByLeito(processada.dadosProcessados);
            }
            
            stats.importados++;
            stats.detalhes.push({ 
              leito, 
              status: "importado", 
              mensagem: processada.pacienteName 
            });
            logger.info(`[${getTimestamp()}] [Import] Upserted patient for leito: ${leito} (${processada.pacienteName})`);
          } catch (upsertError) {
            stats.erros++;
            stats.detalhes.push({ 
              leito, 
              status: "erro", 
              mensagem: upsertError instanceof Error ? upsertError.message : "Falha no UPSERT" 
            });
            logger.error(`[${getTimestamp()}] [Import] UPSERT failed for leito: ${leito}: ${upsertError}`);
          }
        } catch (error) {
          const leito = evolucao.leito || "DESCONHECIDO";
          stats.erros++;
          stats.detalhes.push({ 
            leito, 
            status: "erro", 
            mensagem: error instanceof Error ? error.message : "Erro desconhecido" 
          });
          logger.error(`[${getTimestamp()}] [Import] Error processing leito ${leito}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info(`[${getTimestamp()}] [Import] Completed import for enfermaria ${enfermaria}. Total: ${stats.total}, Importados: ${stats.importados}, Erros: ${stats.erros}`);

      // Save import history
      await storage.createImportHistory({
        enfermaria,
        total: stats.total,
        importados: stats.importados,
        erros: stats.erros,
        detalhes: stats.detalhes,
        duracao: 0
      });

      return res.json({
        success: true,
        enfermaria,
        templateId: template?.id,
        stats,
        mensagem: `Import concluído: ${stats.importados} importados, ${stats.erros} erros`
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      logger.error(`[${getTimestamp()}] [Import] Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ 
        success: false, 
        message: "Erro fatal ao importar evolucoes",
        erro: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // List enfermarias endpoint - PROTECTED
  app.get("/api/enfermarias", authWithFirstAccessCheck, async (req, res) => {
    try {
      // Fetch enfermarias from external API
      const enfermarias = await unidadesInternacaoService.fetchUnidades();

      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(enfermarias);
        res.type("application/toon").send(toonData);
      } else {
        res.json(enfermarias);
      }
    } catch (error) {
      logger.error(`[${getTimestamp()}] [Enfermarias] Failed to fetch: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to fetch enfermarias" });
    }
  });

  // Import status endpoint - test N8N connectivity - PROTECTED
  app.get("/api/import/status", authWithFirstAccessCheck, async (req, res) => {
    try {
      const startTime = Date.now();
      
      logger.info(`[${getTimestamp()}] [Status] Testing N8N API connectivity...`);
      
      // Try to fetch evolucoes for a test enfermaria
      const testEnfermaria = "10A";
      const result = await n8nIntegrationService.fetchEvolucoes(testEnfermaria);
      
      const endTime = Date.now();
      const latency = endTime - startTime;

      const apiUrl = process.env.N8N_API_URL || "https://dev-n8n.7care.com.br/webhook/evolucoes";
      
      if (result !== null) {
        logger.info(`[${getTimestamp()}] [Status] N8N API is online (latency: ${latency}ms)`);
        return res.json({
          status: "online",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: apiUrl
        });
      } else {
        logger.info(`[${getTimestamp()}] [Status] N8N API returned null (latency: ${latency}ms)`);
        return res.json({
          status: "offline",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: apiUrl
        });
      }
    } catch (error) {
      const latency = 0;
      const apiUrl = process.env.N8N_API_URL || "https://dev-n8n.7care.com.br/webhook/evolucoes";
      logger.error(`[${getTimestamp()}] [Status] N8N API test failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return res.json({
        status: "offline",
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
        api_url: apiUrl,
        erro: error instanceof Error ? error.message : "Connection timeout"
      });
    }
  });

  // Import history endpoint - PROTECTED
  app.get("/api/import/history", authWithFirstAccessCheck, async (req, res) => {
    try {
      const history = await storage.getAllImportHistory();
      
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(history);
        res.type("application/toon").send(toonData);
      } else {
        res.json(history);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch import history" });
    }
  });

  // Import stats endpoint - estatísticas consolidadas - PROTECTED
  app.get("/api/import/stats", authWithFirstAccessCheck, async (req, res) => {
    try {
      const stats = await storage.getImportStats();
      res.json(stats);
    } catch (error) {
      logger.error(`[${getTimestamp()}] [Stats] Failed to get import stats: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to fetch import stats" });
    }
  });

  // Cleanup old logs endpoint - retenção de 30 dias por padrão - ADMIN ONLY
  app.delete("/api/import/cleanup", ...requireRoleWithAuth('admin'), validateQueryNumber('days', 7, 365), async (req, res) => {
    try {
      const rawDays = parseInt(req.query.days as string);
      const daysToKeep = isNaN(rawDays) ? 30 : Math.max(7, Math.min(365, rawDays));
      
      const deleted = await storage.deleteOldImportHistory(daysToKeep);
      logger.info(`[${getTimestamp()}] [Cleanup] Deleted ${deleted} old import logs (retention: ${daysToKeep} days)`);
      res.json({ 
        success: true, 
        deleted, 
        retentionDays: daysToKeep,
        message: `Removed ${deleted} logs older than ${daysToKeep} days`
      });
    } catch (error) {
      logger.error(`[${getTimestamp()}] [Cleanup] Failed to cleanup old logs: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to cleanup old logs" });
    }
  });

  // ==========================================
  // Dedupe Patients Endpoint - ADMIN ONLY
  // Remove duplicate patients keeping the most recent by importedAt
  // ==========================================
  app.post("/api/admin/dedupe-patients", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    logger.info(`[${getTimestamp()}] [Dedupe] Starting patient deduplication...`);
    
    const allPatients = await storage.getAllPatients();
    const patientsByLeito = new Map<string, typeof allPatients>();
    
    // Group patients by leito
    for (const patient of allPatients) {
      const key = patient.leito || 'unknown';
      if (!patientsByLeito.has(key)) {
        patientsByLeito.set(key, []);
      }
      patientsByLeito.get(key)!.push(patient);
    }
    
    let duplicatesRemoved = 0;
    const removedIds: string[] = [];
    
    // For each leito with multiple patients, keep only the most recent
    for (const [leito, patients] of patientsByLeito) {
      if (patients.length > 1) {
        // Sort by importedAt descending (most recent first)
        patients.sort((a, b) => {
          const dateA = a.importedAt ? new Date(a.importedAt).getTime() : 0;
          const dateB = b.importedAt ? new Date(b.importedAt).getTime() : 0;
          return dateB - dateA;
        });
        
        // Keep the first (most recent), delete the rest
        for (let i = 1; i < patients.length; i++) {
          try {
            await storage.deletePatient(patients[i].id);
            removedIds.push(patients[i].id);
            duplicatesRemoved++;
            logger.info(`[Dedupe] Removed duplicate for leito ${leito}: ${patients[i].id}`);
          } catch (error) {
            logger.error(`[Dedupe] Failed to remove ${patients[i].id}: ${error}`);
          }
        }
      }
    }
    
    logger.info(`[${getTimestamp()}] [Dedupe] Completed: ${duplicatesRemoved} duplicates removed`);
    res.json({
      success: true,
      duplicatesRemoved,
      removedIds,
      totalPatientsAfter: allPatients.length - duplicatesRemoved,
      message: `Removed ${duplicatesRemoved} duplicate patient records`
    });
  }));

  // ==========================================
  // Remove orphan patients that no longer exist in N8N
  // ==========================================
  app.post("/api/admin/cleanup-orphans", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    logger.info(`[${getTimestamp()}] [Cleanup] Starting orphan patient cleanup...`);
    
    // Fetch current data from N8N to get valid leitos
    const unitIds = '22,23'; // PROD units
    logger.info(`[Cleanup] Fetching N8N data for units: ${unitIds}`);
    
    const rawData = await n8nIntegrationService.fetchEvolucoes(unitIds, false);
    
    if (rawData === null) {
      logger.error('[Cleanup] Failed to fetch N8N data - cannot determine orphans');
      return res.status(502).json({
        success: false,
        message: 'Falha ao buscar dados do N8N. Tente novamente mais tarde.'
      });
    }
    
    // Collect valid identifiers from N8N (only 10A* enfermarias)
    // Store both individual sets AND the mapping between codigoAtendimento and leito
    const ALLOWED_ENFERMARIA_PATTERN = /^10A/;
    const n8nCodigosAtendimento = new Set<string>();
    const n8nLeitos = new Set<string>();
    const n8nCodigoToLeito = new Map<string, string>(); // Maps codigoAtendimento -> current leito
    
    for (const rawPatient of rawData) {
      const leito = rawPatient.leito || 'DESCONHECIDO';
      
      try {
        const processed = await n8nIntegrationService.processEvolucao(leito, rawPatient);
        
        if (processed.erros.length > 0) continue;
        
        const dsEnfermaria = processed.dadosProcessados.dsEnfermaria || '';
        if (!ALLOWED_ENFERMARIA_PATTERN.test(dsEnfermaria)) continue;
        
        const codigo = processed.dadosProcessados.codigoAtendimento;
        const leitoProcessado = processed.dadosProcessados.leito;
        
        if (codigo) {
          n8nCodigosAtendimento.add(codigo);
          if (leitoProcessado) {
            n8nCodigoToLeito.set(codigo, leitoProcessado);
          }
        }
        if (leitoProcessado) {
          n8nLeitos.add(leitoProcessado);
        }
      } catch (error) {
        logger.warn(`[Cleanup] Error processing leito ${leito}: ${error}`);
      }
    }
    
    logger.info(`[Cleanup] N8N reference sets: ${n8nLeitos.size} leitos, ${n8nCodigosAtendimento.size} códigos`);
    
    // Get all patients from database
    const allPatients = await storage.getAllPatients();
    let removedCount = 0;
    const removedPatients: { id: string; leito: string; nome: string; reason: string }[] = [];
    
    for (const patient of allPatients) {
      let shouldRemove = false;
      let removeReason = '';
      
      // Case 1: Patient HAS codigoAtendimento
      if (patient.codigoAtendimento) {
        if (!n8nCodigosAtendimento.has(patient.codigoAtendimento)) {
          // codigoAtendimento doesn't exist in N8N - patient was discharged
          shouldRemove = true;
          removeReason = 'alta hospitalar (código não existe no N8N)';
        } else if (patient.leito) {
          // codigoAtendimento exists - check if leito matches
          const n8nLeito = n8nCodigoToLeito.get(patient.codigoAtendimento);
          if (n8nLeito && n8nLeito !== patient.leito) {
            // Patient was transferred to a different bed - this is an orphan record
            shouldRemove = true;
            removeReason = `transferência de leito (${patient.leito} -> ${n8nLeito})`;
            logger.info(`[Cleanup] Patient ${patient.codigoAtendimento} transferred: leito ${patient.leito} -> ${n8nLeito}`);
          }
        }
      } 
      // Case 2: Patient WITHOUT codigoAtendimento - check by leito
      else if (patient.leito) {
        if (!n8nLeitos.has(patient.leito)) {
          shouldRemove = true;
          removeReason = 'leito não existe no N8N';
        }
      }
      
      if (shouldRemove) {
        try {
          await storage.deletePatient(patient.id);
          removedCount++;
          removedPatients.push({
            id: patient.id,
            leito: patient.leito || 'unknown',
            nome: patient.nome || 'unknown',
            reason: removeReason
          });
          logger.info(`[Cleanup] Removed orphan: ${patient.leito} (${patient.nome}) - ${removeReason}`);
        } catch (error) {
          logger.error(`[Cleanup] Error removing patient ${patient.id}: ${error}`);
        }
      }
    }
    
    const finalPatients = await storage.getAllPatients();
    
    logger.info(`[${getTimestamp()}] [Cleanup] Completed: ${removedCount} orphans removed`);
    res.json({
      success: true,
      orphansRemoved: removedCount,
      removedPatients,
      n8nLeitosCount: n8nLeitos.size,
      totalPatientsAfter: finalPatients.length,
      message: removedCount > 0 
        ? `Removidos ${removedCount} pacientes órfãos (alta hospitalar)`
        : 'Nenhum paciente órfão encontrado - banco já está sincronizado'
    });
  }));

  // ==========================================
  // Security Audit Endpoints - ADMIN ONLY
  // ==========================================
  
  // Get security audit logs (blocked attacks, SQL injection attempts, etc.)
  app.get("/api/security/audit", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { getSecurityLogs } = await import("./middleware/input-validation");
    const logs = getSecurityLogs();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    
    res.json({
      total: logs.length,
      logs: logs.slice(-limit).reverse(), // Most recent first
      timestamp: new Date().toISOString()
    });
  }));
  
  // Clear security audit logs - ADMIN ONLY
  app.delete("/api/security/audit", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { clearSecurityLogs, getSecurityLogs } = await import("./middleware/input-validation");
    const count = getSecurityLogs().length;
    clearSecurityLogs();
    logger.info(`[${getTimestamp()}] [Security] Cleared ${count} audit logs`);
    res.json({ success: true, cleared: count });
  }));

  const httpServer = createServer(app);

  // Setup WebSocket for real-time notifications on specific path
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    // Extract token from query string for WebSocket authentication
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    
    if (url.pathname === "/ws/import") {
      const token = url.searchParams.get("token");
      
      // Validate token
      if (!token) {
        logger.warn(`[WebSocket] Connection rejected: No token provided`);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      
      // Verify JWT token using centralized JWT service
      try {
        const payload = verifyAccessToken(token);
        if (!payload) {
          logger.warn(`[WebSocket] Connection rejected: Invalid token`);
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } catch (error) {
        logger.warn(`[WebSocket] Connection rejected: Token verification failed`);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    logger.info(`[WebSocket] Authenticated client connected to /ws/import`);
    
    // Send welcome message
    ws.send(JSON.stringify({ type: "connected", message: "Connected to import notifications" }));

    ws.on("close", () => {
      logger.info(`[WebSocket] Client disconnected`);
    });

    ws.on("error", (error) => {
      logger.error(`[WebSocket] Error:`, error);
    });
  });

  // Export broadcast function for import notifications
  (app as any).broadcastImportEvent = (event: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(event));
      }
    });
  };

  // ==========================================
  // Patient Status Recalculation
  // ==========================================
  
  // Recalculate status for all patients based on filled fields
  app.post("/api/patients/recalculate-status", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const patients = await storage.getAllPatients();
    let updated = 0;
    let unchanged = 0;
    
    for (const patient of patients) {
      // Calcula o status baseado nos campos preenchidos
      const hasLeito = !!patient.leito && patient.leito.trim() !== "";
      const hasNome = !!patient.nome && patient.nome.trim() !== "";
      const hasDataInternacao = !!patient.dataInternacao && patient.dataInternacao.trim() !== "";
      const hasDiagnostico = !!patient.diagnostico && patient.diagnostico.trim() !== "";
      const hasObservacoes = !!patient.observacoes && patient.observacoes.trim() !== "";
      const hasDadosClinicosRelevantes = hasDiagnostico || hasObservacoes;
      const hasMobilidade = !!patient.mobilidade && patient.mobilidade.trim() !== "";
      
      const newStatus = (hasLeito && hasNome && hasDataInternacao && hasDadosClinicosRelevantes && hasMobilidade) 
        ? "complete" 
        : "pending";
      
      if (patient.status !== newStatus) {
        await storage.updatePatient(patient.id, { status: newStatus });
        updated++;
        logger.info(`[${getTimestamp()}] [Status] Patient ${patient.leito} updated: ${patient.status} -> ${newStatus}`);
      } else {
        unchanged++;
      }
    }
    
    logger.info(`[${getTimestamp()}] [Status] Recalculation complete: ${updated} updated, ${unchanged} unchanged`);
    res.json({ 
      message: "Status recalculation complete",
      updated,
      unchanged,
      total: patients.length
    });
  }));

  // Template Management Routes - PROTECTED
  app.get("/api/templates", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const templates = await storage.getAllTemplates();
    res.json(templates);
  }));

  app.get("/api/templates/:id", authWithFirstAccessCheck, validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const template = await storage.getTemplate(req.params.id);
    if (!template) {
      throw new AppError(404, "Template not found", { templateId: req.params.id });
    }
    res.json(template);
  }));

  app.post("/api/templates", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    try {
      const validatedData = insertNursingUnitTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        throw new AppError(400, "Invalid template data", { error: error.message });
      }
      throw error;
    }
  }));

  app.patch("/api/templates/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    try {
      const validatedData = insertNursingUnitTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(req.params.id, validatedData);
      if (!template) {
        throw new AppError(404, "Template not found", { templateId: req.params.id });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        throw new AppError(400, "Invalid template data", { error: error.message });
      }
      throw error;
    }
  }));

  app.delete("/api/templates/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const success = await storage.deleteTemplate(req.params.id);
    if (!success) {
      throw new AppError(404, "Template not found", { templateId: req.params.id });
    }
    res.status(204).send();
  }));

  // =====================================================
  // Nursing Units Management Routes (Enfermarias Locais)
  // =====================================================

  // List all nursing units (admin) - PROTECTED
  app.get("/api/nursing-units", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const units = await storage.getAllNursingUnits();
    res.json(units);
  }));

  // List only active nursing units (for dropdowns) - PROTECTED
  app.get("/api/nursing-units/active", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const units = await storage.getActiveNursingUnits();
    res.json(units);
  }));

  // Get single nursing unit by ID - PROTECTED
  app.get("/api/nursing-units/:id", authWithFirstAccessCheck, validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const unit = await storage.getNursingUnit(req.params.id);
    if (!unit) {
      throw new AppError(404, "Unidade de enfermagem não encontrada", { unitId: req.params.id });
    }
    res.json(unit);
  }));

  // Create nursing unit manually (admin)
  app.post("/api/nursing-units", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    try {
      const validatedData = insertNursingUnitManualSchema.parse(req.body);
      
      // Generate externalId if not provided (for manual creations)
      let externalId = validatedData.externalId;
      if (!externalId) {
        // Generate a unique negative ID for manual creations (to distinguish from API-synced units)
        const existingUnits = await storage.getAllNursingUnits();
        const minExternalId = Math.min(...existingUnits.map(u => u.externalId), 0);
        externalId = minExternalId - 1;
      }
      
      // Check for duplicates
      const existingByExtId = await storage.getNursingUnitByExternalId(externalId);
      if (existingByExtId) {
        throw new AppError(409, "Já existe uma unidade com este ID externo", { externalId });
      }
      
      const existingByCodigo = await storage.getNursingUnitByCodigo(validatedData.codigo);
      if (existingByCodigo) {
        throw new AppError(409, "Já existe uma unidade com este código", { codigo: validatedData.codigo });
      }
      
      const unitData = { ...validatedData, externalId };
      const unit = await storage.createNursingUnit(unitData);
      logger.info(`[${getTimestamp()}] [NursingUnits] Created unit: ${unit.nome} (${unit.codigo})`);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "ZodError") {
        throw new AppError(400, "Dados inválidos para unidade de enfermagem", { error: error.message });
      }
      throw error;
    }
  }));

  // Update nursing unit (admin) - ID validated
  app.patch("/api/nursing-units/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    try {
      const validatedData = updateNursingUnitSchema.parse(req.body);
      const unit = await storage.updateNursingUnit(req.params.id, validatedData);
      if (!unit) {
        throw new AppError(404, "Unidade de enfermagem não encontrada", { unitId: req.params.id });
      }
      logger.info(`[${getTimestamp()}] [NursingUnits] Updated unit: ${unit.nome} (${unit.codigo})`);
      res.json(unit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "ZodError") {
        throw new AppError(400, "Dados inválidos para unidade de enfermagem", { error: error.message });
      }
      throw error;
    }
  }));

  // Delete nursing unit (admin) - ID validated
  app.delete("/api/nursing-units/:id", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const success = await storage.deleteNursingUnit(req.params.id);
    if (!success) {
      throw new AppError(404, "Unidade de enfermagem não encontrada", { unitId: req.params.id });
    }
    logger.info(`[${getTimestamp()}] [NursingUnits] Deleted unit: ${req.params.id}`);
    res.status(204).send();
  }));

  // =====================================================
  // Nursing Units Sync & Changes Management
  // =====================================================

  // Trigger manual sync with external API (admin only)
  app.post("/api/nursing-units/sync", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { autoApprove } = req.body;
    logger.info(`[${getTimestamp()}] [NursingUnitsSync] Manual sync triggered (autoApprove: ${autoApprove || false})`);
    
    const result = await nursingUnitsSyncService.syncUnits(autoApprove === true);
    res.json(result);
  }));

  // Get pending changes count (for badge) - PROTECTED
  app.get("/api/nursing-unit-changes/count", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const count = await storage.getPendingChangesCount();
    res.json({ count });
  }));

  // List all pending changes - PROTECTED
  app.get("/api/nursing-unit-changes/pending", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const changes = await storage.getPendingNursingUnitChanges();
    res.json(changes);
  }));

  // List all changes (history) - PROTECTED
  app.get("/api/nursing-unit-changes", authWithFirstAccessCheck, asyncHandler(async (req, res) => {
    const changes = await storage.getAllNursingUnitChanges();
    res.json(changes);
  }));

  // Approve a change (admin only) - ID validated
  app.post("/api/nursing-unit-changes/:id/approve", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const { reviewerId } = req.body;
    if (!reviewerId) {
      throw new AppError(400, "reviewerId é obrigatório");
    }
    
    const result = await nursingUnitsSyncService.approveChange(req.params.id, reviewerId);
    if (!result.success) {
      throw new AppError(400, result.message);
    }
    
    logger.info(`[${getTimestamp()}] [NursingUnitChanges] Change ${req.params.id} approved by ${reviewerId}`);
    res.json(result);
  }));

  // Reject a change (admin only) - ID validated
  app.post("/api/nursing-unit-changes/:id/reject", ...requireRoleWithAuth('admin'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const { reviewerId } = req.body;
    if (!reviewerId) {
      throw new AppError(400, "reviewerId é obrigatório");
    }
    
    const result = await nursingUnitsSyncService.rejectChange(req.params.id, reviewerId);
    if (!result.success) {
      throw new AppError(400, result.message);
    }
    
    logger.info(`[${getTimestamp()}] [NursingUnitChanges] Change ${req.params.id} rejected by ${reviewerId}`);
    res.json(result);
  }));

  // Approve all pending changes (admin only)
  app.post("/api/nursing-unit-changes/approve-all", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { reviewerId } = req.body;
    if (!reviewerId) {
      throw new AppError(400, "reviewerId é obrigatório");
    }
    
    const result = await nursingUnitsSyncService.approveAllPending(reviewerId);
    logger.info(`[${getTimestamp()}] [NursingUnitChanges] Bulk approval by ${reviewerId}: ${result.approved} approved, ${result.errors} errors`);
    res.json(result);
  }));

  // ==========================================
  // AI Analysis Routes (Claude primary, OpenAI fallback)
  // ==========================================
  
  app.post("/api/ai/analyze-patient/:id", ...requireRoleWithAuth('admin', 'enfermagem'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Paciente não encontrado");
    }
    
    const analysis = await aiService.analyzePatient(patient);
    logger.info(`[${getTimestamp()}] [AI] Patient ${req.params.id} analyzed via ${aiService.getProvider()}`);
    res.json(analysis);
  }));

  app.post("/api/ai/analyze-patients", ...requireRoleWithAuth('admin', 'enfermagem'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patients = await storage.getAllPatients();
    
    if (patients.length === 0) {
      throw new AppError(404, "Nenhum paciente encontrado");
    }
    
    const analysis = await aiService.analyzeMultiplePatients(patients);
    logger.info(`[${getTimestamp()}] [AI] Analyzed ${patients.length} patients via ${aiService.getProvider()}`);
    res.json(analysis);
  }));

  app.post("/api/ai/care-recommendations/:id", ...requireRoleWithAuth('admin', 'enfermagem'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Paciente não encontrado");
    }
    
    const recommendations = await aiService.generateCareRecommendations(patient);
    logger.info(`[${getTimestamp()}] [AI] Care recommendations generated for patient ${req.params.id} via ${aiService.getProvider()}`);
    res.json({ recomendacoes: recommendations });
  }));

  // Clinical analysis for shift handover - single patient
  // UNIFIED: Uses the same service as batch sync for consistent results
  app.post("/api/ai/clinical-analysis/:id", ...requireRoleWithAuth('admin', 'enfermagem'), validateUUIDParam('id'), asyncHandler(async (req, res) => {
    const { unifiedClinicalAnalysisService } = await import("./services/unified-clinical-analysis.service");
    const { changeDetectionService } = await import("./services/change-detection.service");
    const { forceRefresh = false } = req.body || {};
    
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Paciente não encontrado");
    }
    
    // Detect if patient data has changed (for response metadata)
    const changeDetection = changeDetectionService.detectChanges(patient.id, {
      diagnostico: patient.diagnostico,
      alergias: patient.alergias,
      observacoes: patient.observacoes,
      braden: patient.braden,
      mobilidade: patient.mobilidade,
      dispositivos: patient.dispositivos,
      atb: patient.atb,
      aporteSaturacao: patient.aporteSaturacao,
      curativos: patient.curativos,
      exames: patient.exames,
      dieta: patient.dieta,
      eliminacoes: patient.eliminacoes,
      previsaoAlta: patient.previsaoAlta,
      cirurgia: patient.cirurgia,
      dataNascimento: patient.dataNascimento,
      sexo: patient.sexo,
    });

    // Use unified service (same as batch sync)
    const result = await unifiedClinicalAnalysisService.analyze(patient, {
      useCache: true,
      forceRefresh,
      caller: 'individual'
    });
    
    const { insights, fromCache } = result;
    
    // Store in database
    await storage.updatePatient(patient.id, {
      clinicalInsights: insights,
      clinicalInsightsUpdatedAt: new Date(),
    });
    
    logger.info(`[${getTimestamp()}] [AI] Clinical analysis for patient ${req.params.id} - Alert level: ${insights.nivel_alerta} (${changeDetection.changedFields.length} fields changed)`);
    
    res.json({ insights, changeDetection, fromCache });
  }));

  // Clinical analysis for shift handover - all patients (batch)
  app.post("/api/ai/clinical-analysis-batch", ...requireRoleWithAuth('admin', 'enfermagem'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const { changeDetectionService } = await import("./services/change-detection.service");
    const { intelligentCache } = await import("./services/intelligent-cache.service");
    const { forceRefresh = false } = req.body || {};
    const patients = await storage.getAllPatients();
    
    if (patients.length === 0) {
      throw new AppError(404, "Nenhum paciente encontrado");
    }

    const results: Array<{ id: string; leito: string; nome: string; insights: any; error?: string; cached?: boolean }> = [];
    const summaryStats = { vermelho: 0, amarelo: 0, verde: 0, errors: 0, cached: 0 };
    const failedPatients: string[] = [];
    const patientInsightsMap = new Map<string, any>();
    const patientsNeedingAnalysis: typeof patients = [];

    // First pass: use existing database cache for patients that already have insights
    for (const patient of patients) {
      if (!forceRefresh && patient.clinicalInsights && typeof patient.clinicalInsights === 'object') {
        const insights = patient.clinicalInsights as any;
        if (insights.nivel_alerta) {
          results.push({ id: patient.id, leito: patient.leito, nome: patient.nome, insights, cached: true, error: undefined });
          patientInsightsMap.set(patient.id, insights);
          summaryStats.cached++;
          if (insights.nivel_alerta === "VERMELHO") summaryStats.vermelho++;
          else if (insights.nivel_alerta === "AMARELO") summaryStats.amarelo++;
          else summaryStats.verde++;
          continue;
        }
      }
      patientsNeedingAnalysis.push(patient);
    }

    logger.info(`[${getTimestamp()}] [AI] Clinical batch: ${summaryStats.cached} from DB cache, ${patientsNeedingAnalysis.length} need analysis`);

    // Process single patient analysis (only for those without cached insights)
    const processPatient = async (patient: typeof patients[0]) => {
      try {
        const changeDetection = changeDetectionService.detectChanges(patient.id, {
          diagnostico: patient.diagnostico,
          alergias: patient.alergias,
          observacoes: patient.observacoes,
          braden: patient.braden,
          mobilidade: patient.mobilidade,
          dispositivos: patient.dispositivos,
          atb: patient.atb,
          aporteSaturacao: patient.aporteSaturacao,
          curativos: patient.curativos,
          exames: patient.exames,
          dieta: patient.dieta,
          eliminacoes: patient.eliminacoes,
          previsaoAlta: patient.previsaoAlta,
          cirurgia: patient.cirurgia,
          dataNascimento: patient.dataNascimento,
          sexo: patient.sexo,
        });

        let insights: any;
        let usedCache = false;
        const cacheKey = `clinical-analysis:${patient.id}`;

        // Try intelligent cache first
        const cachedInsights = intelligentCache.get(cacheKey, changeDetection.currentHash);
        
        if (cachedInsights && !changeDetection.hasChanged) {
          insights = cachedInsights;
          usedCache = true;
          logger.debug(`[${getTimestamp()}] [AI] Patient ${patient.leito} using intelligent cache`);
        } else {
          const analysis = await aiService.performClinicalAnalysis(patient);
          insights = aiService.extractClinicalInsights(analysis);
          
          await storage.updatePatient(patient.id, {
            clinicalInsights: insights,
            clinicalInsightsUpdatedAt: new Date(),
          });
          
          const criticality = insights.nivel_alerta === "VERMELHO" ? "critical" : 
                             insights.nivel_alerta === "AMARELO" ? "high" : "medium";
          intelligentCache.set(cacheKey, insights, {
            contentHash: changeDetection.currentHash,
            criticality,
            dataStability: changeDetection.changePercentage === 0 ? 100 : 50
          });
          
          logger.debug(`[${getTimestamp()}] [AI] Patient ${patient.leito} analyzed: ${insights.nivel_alerta} (${changeDetection.changedFields.length} fields changed)`);
        }
        
        if (!insights || !insights.nivel_alerta) {
          throw new Error("Análise retornou dados incompletos");
        }
        
        return { id: patient.id, leito: patient.leito, nome: patient.nome, insights, cached: usedCache, error: undefined };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        logger.warn(`[${getTimestamp()}] [AI] Failed to analyze patient ${patient.leito}: ${errorMsg}`);
        return { id: patient.id, leito: patient.leito, nome: patient.nome, insights: null, cached: false, error: errorMsg };
      }
    };

    // Process only patients needing analysis in parallel batches (5 at a time)
    const BATCH_SIZE = 5;
    if (patientsNeedingAnalysis.length > 0) {
      logger.info(`[${getTimestamp()}] [AI] Starting batch clinical analysis for ${patientsNeedingAnalysis.length} patients (${BATCH_SIZE} concurrent)`);
      
      for (let i = 0; i < patientsNeedingAnalysis.length; i += BATCH_SIZE) {
        const batch = patientsNeedingAnalysis.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(processPatient));
        
        for (const result of batchResults) {
          results.push(result);
          if (result.insights) {
            patientInsightsMap.set(result.id, result.insights);
            if (result.cached) summaryStats.cached++;
            if (result.insights.nivel_alerta === "VERMELHO") summaryStats.vermelho++;
            else if (result.insights.nivel_alerta === "AMARELO") summaryStats.amarelo++;
            else summaryStats.verde++;
          } else {
            summaryStats.errors++;
            failedPatients.push(result.leito);
          }
        }
        
        logger.debug(`[${getTimestamp()}] [AI] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(patientsNeedingAnalysis.length / BATCH_SIZE)} completed`);
      }
    }
    
    // Generate enhanced analysis with problem classification
    const analiseGeral = await aiService.generateEnhancedGeneralAnalysis(patients, patientInsightsMap);
    
    const successCount = summaryStats.vermelho + summaryStats.amarelo + summaryStats.verde;
    logger.info(`[${getTimestamp()}] [AI] Batch clinical analysis completed: ${successCount}/${patients.length} successful (${summaryStats.vermelho} critical, ${summaryStats.amarelo} warning, ${summaryStats.verde} ok), ${summaryStats.cached} cached, ${summaryStats.errors} errors`);
    
    if (failedPatients.length > 0) {
      logger.warn(`[${getTimestamp()}] [AI] Failed patients: ${failedPatients.join(", ")}`);
    }
    
    res.json({
      total: patients.length,
      success: successCount,
      summary: summaryStats,
      analiseGeral,
      leitosAtencao: results
        .filter(r => r.insights?.nivel_alerta === "VERMELHO")
        .map(r => ({ leito: r.leito, nome: r.nome, recomendacoes: r.insights?.recomendacoes_enfermagem || [], alertas: r.insights?.principais_alertas || [] })),
      leitosAlerta: results
        .filter(r => r.insights?.nivel_alerta === "AMARELO")
        .map(r => ({ leito: r.leito, nome: r.nome, recomendacoes: r.insights?.recomendacoes_enfermagem || [], alertas: r.insights?.principais_alertas || [] })),
      failedPatients,
      results,
    });
  }));

  // Cache monitoring endpoint (admin only)
  app.get("/api/admin/cache-stats", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { intelligentCache } = await import("./services/intelligent-cache.service");
    const stats = intelligentCache.getStats();
    res.json({
      cacheStats: stats,
      recommendation: stats.hitRate > 70 ? "Cache working efficiently" : "Cache needs optimization"
    });
  }));

  // =============================================
  // ANALYTICS & USAGE TRACKING ENDPOINTS
  // =============================================

  // Track page view or action event
  app.post("/api/analytics/events", authMiddleware, asyncHandler(async (req, res) => {
    const { eventType, pagePath, pageTitle, actionName, actionCategory, entityType, entityId, referrer, metadata, sessionId } = req.body;
    
    if (!eventType || (eventType !== 'page_view' && eventType !== 'action')) {
      throw new AppError(400, "eventType must be 'page_view' or 'action'");
    }
    
    const user = (req as any).user;
    const event = await storage.createAnalyticsEvent({
      sessionId: sessionId || null,
      userId: user?.id || null,
      userName: user?.name || null,
      userRole: user?.role || null,
      eventType,
      pagePath: pagePath || null,
      pageTitle: pageTitle || null,
      actionName: actionName || null,
      actionCategory: actionCategory || null,
      entityType: entityType || null,
      entityId: entityId || null,
      referrer: referrer || null,
      metadata: metadata || null
    });
    
    // Increment session counters if sessionId provided
    if (sessionId) {
      await storage.incrementSessionCounts(
        sessionId,
        eventType === 'page_view' ? 1 : 0,
        eventType === 'action' ? 1 : 0
      );
    }
    
    res.status(201).json(event);
  }));

  // Batch track events (for performance)
  app.post("/api/analytics/events/batch", authMiddleware, asyncHandler(async (req, res) => {
    const { events, sessionId } = req.body;
    
    if (!Array.isArray(events) || events.length === 0) {
      throw new AppError(400, "events must be a non-empty array");
    }
    
    const user = (req as any).user;
    const eventsToInsert = events.map(e => ({
      sessionId: sessionId || e.sessionId || null,
      userId: user?.id || null,
      userName: user?.name || null,
      userRole: user?.role || null,
      eventType: e.eventType,
      pagePath: e.pagePath || null,
      pageTitle: e.pageTitle || null,
      actionName: e.actionName || null,
      actionCategory: e.actionCategory || null,
      entityType: e.entityType || null,
      entityId: e.entityId || null,
      referrer: e.referrer || null,
      metadata: e.metadata || null
    }));
    
    const count = await storage.createAnalyticsEventsBatch(eventsToInsert);
    
    // Increment session counters
    if (sessionId) {
      const pageViews = events.filter(e => e.eventType === 'page_view').length;
      const actions = events.filter(e => e.eventType === 'action').length;
      await storage.incrementSessionCounts(sessionId, pageViews, actions);
    }
    
    res.status(201).json({ inserted: count });
  }));

  // Start a new session (called on login)
  app.post("/api/analytics/sessions", authMiddleware, asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const { userAgent, ipAddress } = req.body;
    
    // Parse user agent for device/browser info
    const deviceType = userAgent?.includes('Mobile') ? 'mobile' : 'desktop';
    const browser = userAgent?.includes('Chrome') ? 'Chrome' : 
                    userAgent?.includes('Firefox') ? 'Firefox' : 
                    userAgent?.includes('Safari') ? 'Safari' : 'Other';
    
    const session = await storage.createSession({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userAgent: userAgent || null,
      ipAddress: ipAddress || req.ip || null,
      deviceType,
      browser,
      pageViewCount: 0,
      actionCount: 0,
      isActive: true
    });
    
    res.status(201).json(session);
  }));

  // End a session (called on logout)
  app.post("/api/analytics/sessions/:id/end", authMiddleware, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { logoutReason } = req.body;
    
    const session = await storage.endSession(id, logoutReason);
    if (!session) {
      throw new AppError(404, "Session not found");
    }
    
    res.json(session);
  }));

  // Heartbeat to keep session active
  app.post("/api/analytics/sessions/:id/heartbeat", authMiddleware, asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.updateSessionActivity(id);
    res.json({ success: true });
  }));

  // Admin: Get usage metrics (aggregated)
  app.get("/api/admin/analytics/metrics", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const metrics = await storage.getUsageMetrics(start, end);
    res.json(metrics);
  }));

  // Admin: Get sessions statistics
  app.get("/api/admin/analytics/sessions", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const stats = await storage.getSessionsStats(start, end);
    res.json(stats);
  }));

  // Admin: Get top pages
  app.get("/api/admin/analytics/top-pages", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { limit, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const pages = await storage.getTopPages(Number(limit) || 10, start, end);
    res.json(pages);
  }));

  // Admin: Get top actions
  app.get("/api/admin/analytics/top-actions", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { limit, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const actions = await storage.getTopActions(Number(limit) || 10, start, end);
    res.json(actions);
  }));

  // Admin: Get user activity
  app.get("/api/admin/analytics/users/:userId", ...requireRoleWithAuth('admin'), validateUUIDParam('userId'), asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const activity = await storage.getUserActivity(userId, start, end);
    res.json(activity);
  }));

  // Admin: Get events list (paginated)
  app.get("/api/admin/analytics/events", ...requireRoleWithAuth('admin'), asyncHandler(async (req, res) => {
    const { page, limit, userId, eventType, pagePath, actionName, actionCategory, startDate, endDate } = req.query;
    
    const events = await storage.getAnalyticsEvents({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      userId: userId as string,
      eventType: eventType as 'page_view' | 'action',
      pagePath: pagePath as string,
      actionName: actionName as string,
      actionCategory: actionCategory as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });
    
    res.json(events);
  }));

  // Register authentication routes
  registerAuthRoutes(app);
  registerUserRoutes(app);

  // Register sync-gpt4o routes
  app.use('/api/sync-gpt4o', syncGPT4oRoutes);

  return httpServer;
}
