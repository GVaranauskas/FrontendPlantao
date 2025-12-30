import { Router } from 'express';
import { autoSyncSchedulerGPT4o } from '../services/auto-sync-scheduler-gpt4o.service';
import { aiServiceGPT4oMini } from '../services/ai-service-gpt4o-mini';
import { costMonitorService } from '../services/cost-monitor.service';
import { intelligentCache } from '../services/intelligent-cache.service';
import { validateUnitIdsBody } from '../middleware/input-validation';
import { requireRole } from '../middleware/rbac';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/sync-gpt4o/manual - requires admin or enfermeiro role
router.post('/manual', requireRole('admin', 'enfermeiro'), validateUnitIdsBody, (req, res) => {
  // Support specific unit IDs via request body
  const { unitIds } = req.body || {};
  
  // Retorna imediatamente sem aguardar a conclusão
  res.status(202).json({ 
    success: true, 
    message: 'Sincronização iniciada em background',
    statusCheckUrl: '/api/sync-gpt4o/status',
    unitIds: unitIds || 'all'
  });
  
  // Executa sincronização em background (sem await)
  autoSyncSchedulerGPT4o.runManualSync(unitIds).catch(error => {
    console.error('[AutoSync] Erro na sincronização manual em background:', error);
  });
});

// GET /api/sync-gpt4o/status - PROTECTED
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    scheduler: autoSyncSchedulerGPT4o.getStatus(),
    stats: autoSyncSchedulerGPT4o.getAggregatedStats()
  });
});

// GET /api/sync-gpt4o/detailed-status (for UI indicator) - PROTECTED
router.get('/detailed-status', authMiddleware, (req, res) => {
  res.json(autoSyncSchedulerGPT4o.getDetailedStatus());
});

// GET /api/sync-gpt4o/history - PROTECTED
router.get('/history', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({ history: autoSyncSchedulerGPT4o.getHistory(limit) });
});

// GET /api/sync-gpt4o/costs - ADMIN ONLY (sensitive cost data)
router.get('/costs', requireRole('admin'), (req, res) => {
  res.json(costMonitorService.exportData());
});

// GET /api/sync-gpt4o/ai-metrics - PROTECTED
router.get('/ai-metrics', authMiddleware, (req, res) => {
  res.json(aiServiceGPT4oMini.getMetrics());
});

// GET /api/sync-gpt4o/cache-stats - PROTECTED
router.get('/cache-stats', authMiddleware, (req, res) => {
  res.json({
    cache: intelligentCache.getStats()
  });
});

// POST /api/sync-gpt4o/cache/clear - ADMIN ONLY
router.post('/cache/clear', requireRole('admin'), (req, res) => {
  intelligentCache.clear();
  aiServiceGPT4oMini.clearCache();
  res.json({ success: true });
});

export default router;
