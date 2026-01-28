import { Router } from 'express';
import { autoSyncSchedulerGPT4o } from '../services/auto-sync-scheduler-gpt4o.service';
import { aiServiceGPT4oMini } from '../services/ai-service-gpt4o-mini';
import { costMonitorService } from '../services/cost-monitor.service';
import { intelligentCache } from '../services/intelligent-cache.service';
import { validateUnitIdsBody } from '../middleware/input-validation';
import { requireRoleWithAuth } from '../middleware/rbac';
import { authWithFirstAccessCheck } from '../middleware/auth';

const router = Router();

// POST /api/sync-gpt4o/manual - requires admin or enfermagem role with firstAccess check
router.post('/manual', ...requireRoleWithAuth('admin', 'enfermagem'), validateUnitIdsBody, (req, res) => {
  const { unitIds, forceUpdate } = req.body || {};
  const shouldForceUpdate = forceUpdate === true;
  
  const syncId = autoSyncSchedulerGPT4o.initSyncStatus();
  
  console.log(`[API] /sync-gpt4o/manual - syncId: ${syncId}, unitIds: ${unitIds || 'default'}, forceUpdate: ${shouldForceUpdate}`);
  
  res.status(202).json({ 
    success: true, 
    message: 'Sincronização iniciada em background',
    syncId: syncId,
    statusCheckUrl: `/api/sync-gpt4o/status/${syncId}`,
    unitIds: unitIds || 'all',
    forceUpdate: shouldForceUpdate
  });
  
  autoSyncSchedulerGPT4o.runManualSyncWithId(syncId, unitIds, shouldForceUpdate).catch(error => {
    console.error('[AutoSync] Erro na sincronização manual em background:', error);
  });
});

// GET /api/sync-gpt4o/status - PROTECTED
router.get('/status', ...authWithFirstAccessCheck, (req, res) => {
  res.json({
    scheduler: autoSyncSchedulerGPT4o.getStatus(),
    stats: autoSyncSchedulerGPT4o.getAggregatedStats()
  });
});

// GET /api/sync-gpt4o/detailed-status (for UI indicator) - PROTECTED
router.get('/detailed-status', ...authWithFirstAccessCheck, (req, res) => {
  res.json(autoSyncSchedulerGPT4o.getDetailedStatus());
});

// GET /api/sync-gpt4o/status/:syncId - Verificar status de uma sincronização específica
router.get('/status/:syncId', ...authWithFirstAccessCheck, (req, res) => {
  const { syncId } = req.params;
  const status = autoSyncSchedulerGPT4o.getSyncStatusById(syncId);
  
  if (!status) {
    return res.status(404).json({ 
      error: 'Sincronização não encontrada',
      syncId 
    });
  }
  
  res.json({
    syncId,
    ...status
  });
});

// GET /api/sync-gpt4o/history - PROTECTED
router.get('/history', ...authWithFirstAccessCheck, (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({ history: autoSyncSchedulerGPT4o.getHistory(limit) });
});

// GET /api/sync-gpt4o/costs - ADMIN ONLY (sensitive cost data)
router.get('/costs', ...requireRoleWithAuth('admin'), (req, res) => {
  res.json(costMonitorService.exportData());
});

// GET /api/sync-gpt4o/ai-metrics - PROTECTED
router.get('/ai-metrics', ...authWithFirstAccessCheck, (req, res) => {
  res.json(aiServiceGPT4oMini.getMetrics());
});

// GET /api/sync-gpt4o/cache-stats - PROTECTED
router.get('/cache-stats', ...authWithFirstAccessCheck, (req, res) => {
  res.json({
    cache: intelligentCache.getStats()
  });
});

// POST /api/sync-gpt4o/cache/clear - ADMIN ONLY
router.post('/cache/clear', ...requireRoleWithAuth('admin'), (req, res) => {
  intelligentCache.clear();
  aiServiceGPT4oMini.clearCache();
  res.json({ success: true });
});

export default router;
