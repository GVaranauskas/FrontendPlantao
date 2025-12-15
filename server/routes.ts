import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertPatientSchema, insertAlertSchema, insertNursingUnitTemplateSchema, insertNursingUnitManualSchema, updateNursingUnitSchema } from "@shared/schema";
import { stringifyToToon, isToonFormat } from "./toon";
import { syncPatientFromExternalAPI, syncMultiplePatientsFromExternalAPI, syncEvolucoesByEnfermaria, syncEvolucoesByUnitIds, syncAllEvolucoes } from "./sync";
import { n8nIntegrationService } from "./services/n8n-integration-service";
import { unidadesInternacaoService } from "./services/unidades-internacao.service";
import { nursingUnitsSyncService } from "./services/nursing-units-sync.service";
import { logger } from "./lib/logger";
import { asyncHandler, AppError } from "./middleware/error-handler";
import { requireRole } from "./middleware/rbac";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";

// Helper to get formatted timestamp
const getTimestamp = () => new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).replace(',', ' UTC');

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/patients", asyncHandler(async (req, res, next) => {
    const patients = await storage.getAllPatients();
    const acceptToon = isToonFormat(req.get("accept"));
    if (acceptToon) {
      const toonData = stringifyToToon(patients);
      res.type("application/toon").send(toonData);
    } else {
      res.json(patients);
    }
  }));

  app.get("/api/patients/:id", asyncHandler(async (req, res, next) => {
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

  app.post("/api/patients", asyncHandler(async (req, res, next) => {
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

  app.patch("/api/patients/:id", async (req, res) => {
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

  app.delete("/api/patients/:id", async (req, res) => {
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

  app.get("/api/alerts", async (req, res) => {
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

  app.post("/api/alerts", async (req, res) => {
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

  app.delete("/api/alerts/:id", async (req, res) => {
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

  // Sync endpoints for external API integration
  app.post("/api/sync/patient/:leito", async (req, res) => {
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

  app.post("/api/sync/patients", async (req, res) => {
    try {
      const { leitos } = req.body;
      
      if (!Array.isArray(leitos) || leitos.length === 0) {
        return res.status(400).json({ message: "leitos array is required" });
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

  // N8N Evolucoes sync endpoint - all units (params: [""])
  app.post("/api/sync/evolucoes", async (req, res) => {
    try {
      logger.info(`[${getTimestamp()}] [Sync] Request received, body: ${JSON.stringify(req.body)}`);
      
      const { unitIds, forceUpdate } = req.body || {};
      // unitIds can be empty string for all units, or comma-separated IDs like "22,23"
      const params = unitIds !== undefined ? unitIds : "";
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
  app.post("/api/sync/evolucoes/:enfermaria", async (req, res) => {
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

  // Import endpoints
  app.post("/api/import/evolucoes", async (req, res) => {
    try {
      const { enfermaria, templateId } = req.body;
      
      if (!enfermaria || enfermaria.trim() === "") {
        return res.status(400).json({ message: "enfermaria is required" });
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

          // Check if patient exists by leito AND enfermaria
          const existingPatients = await storage.getAllPatients();
          const patientEnfermaria = processada.dadosProcessados.dsEnfermaria || enfermaria;
          const existingPatient = existingPatients.find(p => 
            p.leito === leito && p.dsEnfermaria === patientEnfermaria
          );

          let patient;
          if (existingPatient) {
            // Update existing
            patient = await storage.updatePatient(existingPatient.id, processada.dadosProcessados);
            if (patient) {
              stats.importados++;
              stats.detalhes.push({ 
                leito, 
                status: "atualizado", 
                mensagem: processada.pacienteName 
              });
              logger.info(`[${getTimestamp()}] [Import] Updated patient for leito: ${leito} (${processada.pacienteName})`);
            } else {
              stats.erros++;
              stats.detalhes.push({ 
                leito, 
                status: "erro", 
                mensagem: "Falha ao atualizar paciente" 
              });
              logger.error(`[${getTimestamp()}] [Import] Failed to update patient for leito: ${leito}`);
            }
          } else {
            // Create new
            patient = await storage.createPatient(processada.dadosProcessados);
            stats.importados++;
            stats.detalhes.push({ 
              leito, 
              status: "criado", 
              mensagem: processada.pacienteName 
            });
            logger.info(`[${getTimestamp()}] [Import] Created new patient for leito: ${leito} (${processada.pacienteName})`);
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

  // List enfermarias endpoint
  app.get("/api/enfermarias", async (req, res) => {
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

  // Import status endpoint - test N8N connectivity
  app.get("/api/import/status", async (req, res) => {
    try {
      const startTime = Date.now();
      
      logger.info(`[${getTimestamp()}] [Status] Testing N8N API connectivity...`);
      
      // Try to fetch evolucoes for a test enfermaria
      const testEnfermaria = "10A";
      const result = await n8nIntegrationService.fetchEvolucoes(testEnfermaria);
      
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (result !== null) {
        logger.info(`[${getTimestamp()}] [Status] N8N API is online (latency: ${latency}ms)`);
        return res.json({
          status: "online",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: "https://dev-n8n.7care.com.br/webhook/evolucoes"
        });
      } else {
        logger.info(`[${getTimestamp()}] [Status] N8N API returned null (latency: ${latency}ms)`);
        return res.json({
          status: "offline",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: "https://dev-n8n.7care.com.br/webhook/evolucoes"
        });
      }
    } catch (error) {
      const latency = 0;
      logger.error(`[${getTimestamp()}] [Status] N8N API test failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return res.json({
        status: "offline",
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
        api_url: "https://dev-n8n.7care.com.br/webhook/evolucoes",
        erro: error instanceof Error ? error.message : "Connection timeout"
      });
    }
  });

  // Import history endpoint
  app.get("/api/import/history", async (req, res) => {
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

  // Import stats endpoint - estatísticas consolidadas
  app.get("/api/import/stats", async (req, res) => {
    try {
      const stats = await storage.getImportStats();
      res.json(stats);
    } catch (error) {
      logger.error(`[${getTimestamp()}] [Stats] Failed to get import stats: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to fetch import stats" });
    }
  });

  // Cleanup old logs endpoint - retenção de 30 dias por padrão
  app.delete("/api/import/cleanup", async (req, res) => {
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

  const httpServer = createServer(app);

  // Setup WebSocket for real-time notifications on specific path
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws/import") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    console.log("[WebSocket] Client connected to /ws/import");
    
    // Send welcome message
    ws.send(JSON.stringify({ type: "connected", message: "Connected to import notifications" }));

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
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
  app.post("/api/patients/recalculate-status", requireRole('admin'), asyncHandler(async (req, res) => {
    const patients = await storage.getAllPatients();
    let updated = 0;
    let unchanged = 0;
    
    for (const patient of patients) {
      // Calcula o status baseado nos campos preenchidos
      const hasLeito = !!patient.leito && patient.leito.trim() !== "";
      const hasNome = !!patient.nome && patient.nome.trim() !== "";
      const hasDataInternacao = !!patient.dataInternacao && patient.dataInternacao.trim() !== "";
      const hasDiagnostico = !!patient.diagnosticoComorbidades && patient.diagnosticoComorbidades.trim() !== "";
      const hasObservacoes = !!patient.observacoesIntercorrencias && patient.observacoesIntercorrencias.trim() !== "";
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

  // Template Management Routes
  app.get("/api/templates", asyncHandler(async (req, res) => {
    const templates = await storage.getAllTemplates();
    res.json(templates);
  }));

  app.get("/api/templates/:id", asyncHandler(async (req, res) => {
    const template = await storage.getTemplate(req.params.id);
    if (!template) {
      throw new AppError(404, "Template not found", { templateId: req.params.id });
    }
    res.json(template);
  }));

  app.post("/api/templates", asyncHandler(async (req, res) => {
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

  app.patch("/api/templates/:id", asyncHandler(async (req, res) => {
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

  app.delete("/api/templates/:id", asyncHandler(async (req, res) => {
    const success = await storage.deleteTemplate(req.params.id);
    if (!success) {
      throw new AppError(404, "Template not found", { templateId: req.params.id });
    }
    res.status(204).send();
  }));

  // =====================================================
  // Nursing Units Management Routes (Enfermarias Locais)
  // =====================================================

  // List all nursing units (admin)
  app.get("/api/nursing-units", asyncHandler(async (req, res) => {
    const units = await storage.getAllNursingUnits();
    res.json(units);
  }));

  // List only active nursing units (for dropdowns)
  app.get("/api/nursing-units/active", asyncHandler(async (req, res) => {
    const units = await storage.getActiveNursingUnits();
    res.json(units);
  }));

  // Get single nursing unit by ID
  app.get("/api/nursing-units/:id", asyncHandler(async (req, res) => {
    const unit = await storage.getNursingUnit(req.params.id);
    if (!unit) {
      throw new AppError(404, "Unidade de enfermagem não encontrada", { unitId: req.params.id });
    }
    res.json(unit);
  }));

  // Create nursing unit manually (admin)
  app.post("/api/nursing-units", requireRole('admin'), asyncHandler(async (req, res) => {
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

  // Update nursing unit (admin)
  app.patch("/api/nursing-units/:id", requireRole('admin'), asyncHandler(async (req, res) => {
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

  // Delete nursing unit (admin)
  app.delete("/api/nursing-units/:id", requireRole('admin'), asyncHandler(async (req, res) => {
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
  app.post("/api/nursing-units/sync", requireRole('admin'), asyncHandler(async (req, res) => {
    const { autoApprove } = req.body;
    logger.info(`[${getTimestamp()}] [NursingUnitsSync] Manual sync triggered (autoApprove: ${autoApprove || false})`);
    
    const result = await nursingUnitsSyncService.syncUnits(autoApprove === true);
    res.json(result);
  }));

  // Get pending changes count (for badge)
  app.get("/api/nursing-unit-changes/count", asyncHandler(async (req, res) => {
    const count = await storage.getPendingChangesCount();
    res.json({ count });
  }));

  // List all pending changes
  app.get("/api/nursing-unit-changes/pending", asyncHandler(async (req, res) => {
    const changes = await storage.getPendingNursingUnitChanges();
    res.json(changes);
  }));

  // List all changes (history)
  app.get("/api/nursing-unit-changes", asyncHandler(async (req, res) => {
    const changes = await storage.getAllNursingUnitChanges();
    res.json(changes);
  }));

  // Approve a change (admin only)
  app.post("/api/nursing-unit-changes/:id/approve", requireRole('admin'), asyncHandler(async (req, res) => {
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

  // Reject a change (admin only)
  app.post("/api/nursing-unit-changes/:id/reject", requireRole('admin'), asyncHandler(async (req, res) => {
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
  app.post("/api/nursing-unit-changes/approve-all", requireRole('admin'), asyncHandler(async (req, res) => {
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
  
  app.post("/api/ai/analyze-patient/:id", requireRole('admin', 'enfermeiro'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Paciente não encontrado");
    }
    
    const analysis = await aiService.analyzePatient(patient);
    logger.info(`[${getTimestamp()}] [AI] Patient ${req.params.id} analyzed via ${aiService.getProvider()}`);
    res.json(analysis);
  }));

  app.post("/api/ai/analyze-patients", requireRole('admin', 'enfermeiro'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patients = await storage.getAllPatients();
    
    if (patients.length === 0) {
      throw new AppError(404, "Nenhum paciente encontrado");
    }
    
    const analysis = await aiService.analyzeMultiplePatients(patients);
    logger.info(`[${getTimestamp()}] [AI] Analyzed ${patients.length} patients via ${aiService.getProvider()}`);
    res.json(analysis);
  }));

  app.post("/api/ai/care-recommendations/:id", requireRole('admin', 'enfermeiro'), asyncHandler(async (req, res) => {
    const { aiService } = await import("./services/ai-service");
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      throw new AppError(404, "Paciente não encontrado");
    }
    
    const recommendations = await aiService.generateCareRecommendations(patient);
    logger.info(`[${getTimestamp()}] [AI] Care recommendations generated for patient ${req.params.id} via ${aiService.getProvider()}`);
    res.json({ recomendacoes: recommendations });
  }));

  // Register authentication routes
  registerAuthRoutes(app);
  registerUserRoutes(app);

  return httpServer;
}
