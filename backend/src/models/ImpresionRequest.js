const mongoose = require('mongoose');

const impresionRequestSchema = new mongoose.Schema({
  // Información del ticket
  ticketId: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  nombreCliente: {
    type: String,
    required: true
  },
  asiento: {
    type: String,
    required: true
  },
  
  // Información del formulario de impresión
  quienRetira: {
    type: String,
    required: true
  },
  parentesco: {
    type: String,
    required: function() {
      return this.quienRetira === 'Otro';
    }
  },
  quienOtro: {
    type: String,
    required: function() {
      return this.quienRetira === 'Otro';
    }
  },
  celular: {
    type: String,
    required: true
  },
  
  // Información de quién solicitó la impresión
  solicitadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombreSolicitante: {
    type: String,
    required: true
  },
  
  // Información del impresor asignado
  puntoTrabajo: {
    type: String,
    required: true
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Estado de la petición
  estado: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  
  // Información del procesamiento
  procesadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaProcesado: {
    type: Date
  },
  
  // Notas adicionales
  notas: {
    type: String
  },
  
  // Metadata
  prioridad: {
    type: String,
    enum: ['normal', 'alta', 'urgente'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Índices compuestos optimizados para mejorar rendimiento de consultas
impresionRequestSchema.index({ puntoTrabajo: 1, estado: 1, createdAt: -1 });
impresionRequestSchema.index({ solicitadoPor: 1, createdAt: -1 });
impresionRequestSchema.index({ asignadoA: 1, estado: 1, createdAt: -1 });
impresionRequestSchema.index({ ticketId: 1 });
impresionRequestSchema.index({ transactionId: 1 });
impresionRequestSchema.index({ estado: 1, createdAt: -1 });
impresionRequestSchema.index({ prioridad: -1, estado: 1, createdAt: -1 });
impresionRequestSchema.index({ fechaProcesado: -1 });

// Índice de texto optimizado para búsquedas
impresionRequestSchema.index({ 
  nombreCliente: 'text', 
  quienRetira: 'text', 
  ticketId: 'text',
  transactionId: 'text',
  asiento: 'text'
}, {
  weights: {
    ticketId: 10,
    transactionId: 10,
    nombreCliente: 5,
    quienRetira: 3,
    asiento: 2
  },
  name: 'search_index'
});

// Índices de localización para consultas específicas por punto de trabajo
impresionRequestSchema.index({ puntoTrabajo: 1, prioridad: -1 });
impresionRequestSchema.index({ estado: 1, puntoTrabajo: 1, updatedAt: -1 });

module.exports = mongoose.model('ImpresionRequest', impresionRequestSchema, 'ImpresionRequests');
