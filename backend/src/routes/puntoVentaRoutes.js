const express = require('express');
const router = express.Router();
const {
  getPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  deletePuntoVenta,
  getTicketsByPuntoVenta,
  getEstadisticasPuntoVenta,
  getTicketsForStaff
} = require('../controllers/puntoVentaController');
const { auth, authorize } = require('../middleware/auth');

// Ruta especial para staff - tickets de su punto de trabajo
router.get('/staff/tickets', auth, authorize('staff', 'impresor'), getTicketsForStaff);

// Rutas principales
router.route('/')
  .get(auth, getPuntosVenta)
  .post(auth, authorize('jefe'), createPuntoVenta);

router.route('/:id')
  .put(auth, authorize('jefe'), updatePuntoVenta)
  .delete(auth, authorize('jefe'), deletePuntoVenta);

// Rutas específicas
router.get('/:id/tickets', auth, getTicketsByPuntoVenta);
router.get('/:id/estadisticas', auth, getEstadisticasPuntoVenta);

module.exports = router;
