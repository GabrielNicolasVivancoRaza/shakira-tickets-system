const express = require('express');
const router = express.Router();
const {
  createImpresionRequest,
  getImpresionQueue,
  getMyImpresionRequests,
  updateImpresionStatus,
  getImpresionStats,
  getImpresionByTransactionId
} = require('../controllers/impresionController');
const { auth, authorize } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// Todas las rutas requieren autenticación
router.use(auth);

// @route   POST /api/impresion/request
// @desc    Crear nueva petición de impresión
// @access  Private (staff, jefe)
router.post('/request', 
  authorize('staff', 'jefe'), 
  invalidateCache(['/api/impresion/queue', '/api/impresion/stats']),
  createImpresionRequest
);

// @route   GET /api/impresion/queue
// @desc    Obtener cola de impresión
// @access  Private (impresor)
router.get('/queue', 
  authorize('impresor'), 
  cacheMiddleware(30), // Cache por 30 segundos para datos que cambian frecuentemente
  getImpresionQueue
);

// @route   GET /api/impresion/my-requests
// @desc    Obtener peticiones de impresión del staff
// @access  Private (staff, jefe)
router.get('/my-requests', 
  authorize('staff', 'jefe'), 
  cacheMiddleware(30), // Cache por 30 segundos para datos que cambian frecuentemente
  getMyImpresionRequests
);

// @route   PUT /api/impresion/:id/status
// @desc    Actualizar estado de petición
// @access  Private (impresor)
router.put('/:id/status', 
  authorize('impresor'), 
  invalidateCache(['/api/impresion/queue', '/api/impresion/stats']),
  updateImpresionStatus
);

// @route   GET /api/impresion/stats
// @desc    Obtener estadísticas de impresión
// @access  Private (impresor, jefe)
router.get('/stats', 
  authorize('impresor', 'jefe'), 
  cacheMiddleware(60), // Cache por 1 minuto para estadísticas
  getImpresionStats
);

// @route   GET /api/impresion/transaction/:transactionId/:puntoTrabajo?
// @desc    Obtener petición de impresión por transaction ID
// @access  Private (staff, impresor, jefe)
router.get('/transaction/:transactionId/:puntoTrabajo?', 
  authorize('staff', 'impresor', 'jefe'), 
  cacheMiddleware(30), // Cache por 30 segundos
  getImpresionByTransactionId
);

module.exports = router;
