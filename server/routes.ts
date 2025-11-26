import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertPatientSchema, insertAlertSchema } from "@shared/schema";
import { stringifyToToon, isToonFormat } from "./toon";
import { syncPatientFromExternalAPI, syncMultiplePatientsFromExternalAPI, syncEvolucoesByEnfermaria } from "./sync";
import { n8nIntegrationService } from "./services/n8n-integration-service";
import { logger } from "./lib/logger";
import { asyncHandler, AppError } from "./middleware/error-handler";

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

  // N8N Evolucoes sync endpoint
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
      const { enfermaria } = req.body;
      
      if (!enfermaria || enfermaria.trim() === "") {
        return res.status(400).json({ message: "enfermaria is required" });
      }

      console.log(`[Import] Starting import for enfermaria: ${enfermaria}`);
      
      const stats = {
        total: 0,
        importados: 0,
        erros: 0,
        detalhes: [] as Array<{ leito: string; status: string; mensagem?: string }>
      };

      // Fetch evolucoes from N8N
      const evolucoes = await n8nIntegrationService.fetchEvolucoes(enfermaria);
      
      if (!evolucoes || evolucoes.length === 0) {
        console.log(`[Import] No evolucoes found for enfermaria: ${enfermaria}`);
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
            console.warn(`[Import] Leito not found, skipping`);
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
            console.warn(`[Import] Validation failed for leito ${leito}:`, validacao.errors);
            continue;
          }

          // Check if patient exists
          const existingPatients = await storage.getAllPatients();
          const existingPatient = existingPatients.find(p => p.leito === leito);

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
              console.log(`[Import] Updated patient for leito: ${leito} (${processada.pacienteName})`);
            } else {
              stats.erros++;
              stats.detalhes.push({ 
                leito, 
                status: "erro", 
                mensagem: "Falha ao atualizar paciente" 
              });
              console.error(`[Import] Failed to update patient for leito: ${leito}`);
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
            console.log(`[Import] Created new patient for leito: ${leito} (${processada.pacienteName})`);
          }
        } catch (error) {
          const leito = evolucao.leito || "DESCONHECIDO";
          stats.erros++;
          stats.detalhes.push({ 
            leito, 
            status: "erro", 
            mensagem: error instanceof Error ? error.message : "Erro desconhecido" 
          });
          console.error(`[Import] Error processing leito ${leito}:`, error);
        }
      }

      console.log(`[Import] Completed import for enfermaria ${enfermaria}. Stats:`, stats);

      return res.json({
        success: true,
        enfermaria,
        stats,
        mensagem: `Import concluído: ${stats.importados} importados, ${stats.erros} erros`
      });
    } catch (error) {
      console.error("[Import] Fatal error:", error);
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
      // Predefined list of enfermarias
      const enfermarias = [
        { codigo: "10A02", nome: "Enfermaria 10A02" },
        { codigo: "10A03", nome: "Enfermaria 10A03" },
        { codigo: "10A04", nome: "Enfermaria 10A04" },
        { codigo: "10B01", nome: "Enfermaria 10B01" },
        { codigo: "10B02", nome: "Enfermaria 10B02" },
        { codigo: "10C01", nome: "Enfermaria 10C01" },
      ];

      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(enfermarias);
        res.type("application/toon").send(toonData);
      } else {
        res.json(enfermarias);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enfermarias" });
    }
  });

  // Import status endpoint - test N8N connectivity
  app.get("/api/import/status", async (req, res) => {
    try {
      const startTime = Date.now();
      
      console.log("[Status] Testing N8N API connectivity...");
      
      // Try to fetch evolucoes for a test enfermaria
      const testEnfermaria = "10A";
      const result = await n8nIntegrationService.fetchEvolucoes(testEnfermaria);
      
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (result !== null) {
        console.log(`[Status] N8N API is online (latency: ${latency}ms)`);
        return res.json({
          status: "online",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: "https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes"
        });
      } else {
        console.log(`[Status] N8N API returned null (latency: ${latency}ms)`);
        return res.json({
          status: "offline",
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
          api_url: "https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes"
        });
      }
    } catch (error) {
      const latency = 0;
      console.error("[Status] N8N API test failed:", error);
      
      return res.json({
        status: "offline",
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
        api_url: "https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes",
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

  return httpServer;
}
