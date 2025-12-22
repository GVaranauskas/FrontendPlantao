import type { Express } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { requireRole } from '../middleware/rbac';
import { autoSyncSchedulerGPT4o } from '../services/auto-sync-scheduler-gpt4o.service';
import { aiServiceGPT4oMini } from '../services/ai-service-gpt4o-mini';
import { costMonitorService } from '../services/cost-monitor.service';
import { intelligentCache } from '../services/intelligent-cache.service';

export function registerSyncGPT4oRoutes(app: Express) {
  // POST /api/sync-gpt4o/manual - Executar sincronização manual
  app.post('/api/sync-gpt4o/manual', requireRole('admin'), asyncHandler(async (req, res) => {
    try {
      const result = await autoSyncSchedulerGPT4o.runManualSync();
      res.json({
        success: true,
        result,
        message: 'Sincronização manual concluída'
      });
    } catch (error) {
      throw new AppError(500, 'Erro ao executar sincronização manual', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }));

  // GET /api/sync-gpt4o/status - Status do scheduler
  app.get('/api/sync-gpt4o/status', requireRole('admin'), asyncHandler(async (req, res) => {
    res.json({
      scheduler: autoSyncSchedulerGPT4o.getStatus(),
      stats: autoSyncSchedulerGPT4o.getAggregatedStats()
    });
  }));

  // GET /api/sync-gpt4o/history - Histórico de sincronizações
  app.get('/api/sync-gpt4o/history', requireRole('admin'), asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = autoSyncSchedulerGPT4o.getHistory(limit);
    res.json({ history });
  }));

  // GET /api/sync-gpt4o/costs - Dados de custos
  app.get('/api/sync-gpt4o/costs', requireRole('admin'), asyncHandler(async (req, res) => {
    const data = costMonitorService.exportData();
    res.json(data);
  }));

  // GET /api/sync-gpt4o/ai-metrics - Métricas de IA
  app.get('/api/sync-gpt4o/ai-metrics', requireRole('admin'), asyncHandler(async (req, res) => {
    const metrics = aiServiceGPT4oMini.getMetrics();
    res.json(metrics);
  }));

  // GET /api/sync-gpt4o/cache-stats - Estatísticas de cache
  app.get('/api/sync-gpt4o/cache-stats', requireRole('admin'), asyncHandler(async (req, res) => {
    const stats = intelligentCache.getStats();
    const savings = intelligentCache.estimateSavings(0.03);
    res.json({
      cache: stats,
      savings
    });
  }));

  // POST /api/sync-gpt4o/cache/clear - Limpar cache
  app.post('/api/sync-gpt4o/cache/clear', requireRole('admin'), asyncHandler(async (req, res) => {
    intelligentCache.clear();
    aiServiceGPT4oMini.clearCache();
    res.json({
      success: true,
      message: 'Cache limpo com sucesso'
    });
  }));

  // GET /api/sync-gpt4o/dashboard - Dashboard consolidado
  app.get('/api/sync-gpt4o/dashboard', requireRole('admin'), asyncHandler(async (req, res) => {
    const schedulerStatus = autoSyncSchedulerGPT4o.getStatus();
    const schedulerStats = autoSyncSchedulerGPT4o.getAggregatedStats();
    const aiMetrics = aiServiceGPT4oMini.getMetrics();
    const costData = costMonitorService.exportData();
    const cacheStats = intelligentCache.getStats();

    res.json({
      scheduler: {
        status: schedulerStatus,
        stats: schedulerStats
      },
      ai: aiMetrics,
      costs: {
        summaries: costData.summaries,
        alerts: costData.alerts,
        topOperations: costData.topOperations
      },
      cache: {
        stats: cacheStats,
        savings: intelligentCache.estimateSavings(0.03)
      },
      timestamp: new Date().toISOString()
    });
  }));
}
