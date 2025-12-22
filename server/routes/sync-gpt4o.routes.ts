import { Router } from 'express';
import { autoSyncSchedulerGPT4o } from '../services/auto-sync-scheduler-gpt4o.service';
import { aiServiceGPT4oMini } from '../services/ai-service-gpt4o-mini';
import { costMonitorService } from '../services/cost-monitor.service';
import { intelligentCache } from '../services/intelligent-cache.service';

const router = Router();

// POST /api/sync-gpt4o/manual
router.post('/manual', (req, res) => {
  // Retorna imediatamente sem aguardar a conclusão
  res.status(202).json({ 
    success: true, 
    message: 'Sincronização iniciada em background',
    statusCheckUrl: '/api/sync-gpt4o/status'
  });
  
  // Executa sincronização em background (sem await)
  autoSyncSchedulerGPT4o.runManualSync().catch(error => {
    console.error('[AutoSync] Erro na sincronização manual em background:', error);
  });
});

// GET /api/sync-gpt4o/status
router.get('/status', (req, res) => {
  res.json({
    scheduler: autoSyncSchedulerGPT4o.getStatus(),
    stats: autoSyncSchedulerGPT4o.getAggregatedStats()
  });
});

// GET /api/sync-gpt4o/history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({ history: autoSyncSchedulerGPT4o.getHistory(limit) });
});

// GET /api/sync-gpt4o/costs
router.get('/costs', (req, res) => {
  res.json(costMonitorService.exportData());
});

// GET /api/sync-gpt4o/ai-metrics
router.get('/ai-metrics', (req, res) => {
  res.json(aiServiceGPT4oMini.getMetrics());
});

// GET /api/sync-gpt4o/cache-stats
router.get('/cache-stats', (req, res) => {
  res.json({
    cache: intelligentCache.getStats()
  });
});

// POST /api/sync-gpt4o/cache/clear
router.post('/cache/clear', (req, res) => {
  intelligentCache.clear();
  aiServiceGPT4oMini.clearCache();
  res.json({ success: true });
});

export default router;
