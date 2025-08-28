const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const {
  getTickets,
  printTicket,
  reprintTicket,
  getTicketsByTransaction,
  getTicketStats
} = require('../controllers/ticketController');

// @route   GET /api/tickets
router.get('/', auth, getTickets);

// @route   GET /api/tickets/stats
router.get('/stats', auth, authorize('jefe'), getTicketStats);

// @route   GET /api/tickets/transaction/:transactionId
router.get('/transaction/:transactionId', auth, authorize('jefe', 'impresor'), getTicketsByTransaction);

// @route   POST /api/tickets/:id/print
router.post('/:id/print', auth, authorize('jefe', 'staff'), auditLogger('impresion'), printTicket);

// @route   POST /api/tickets/:id/reprint
router.post('/:id/reprint', auth, authorize('jefe', 'impresor'), auditLogger('reimpresion'), reprintTicket);

module.exports = router;
