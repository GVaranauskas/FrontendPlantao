import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAlertSchema } from "@shared/schema";
import { stringifyToToon, isToonFormat } from "./toon";
import { syncPatientFromExternalAPI, syncMultiplePatientsFromExternalAPI } from "./sync";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(patients);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patients);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      const acceptToon = isToonFormat(req.get("accept"));
      if (acceptToon) {
        const toonData = stringifyToToon(patient);
        res.type("application/toon").send(toonData);
      } else {
        res.json(patient);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", async (req, res) => {
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
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

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

  const httpServer = createServer(app);

  return httpServer;
}
