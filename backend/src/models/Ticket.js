const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  'First Name': {
    type: String,
    required: true,
    trim: true
  },
  'Last Name': {
    type: String,
    required: true,
    trim: true
  },
  'Email': {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  'Ticket': {
    type: String,
    required: true
  },
  'Seat': {
    type: String,
    required: true
  },
  'Transaction ID': {
    type: String,
    required: true,
    index: true
  },
  'Ticket ID': {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  'Numero de Cedula:': {
    type: String,
    trim: true,
    default: ''
  },
  // Campos de control de impresión
  impreso: {
    type: Boolean,
    default: false
  },
  fechaImpresion: {
    type: Date
  },
  usuarioResponsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  puntoTrabajo: {
    type: String
  },
  // Campos del formulario de impresión
  quienRetira: {
    type: String,
    enum: ['Titular', 'Titular Compra', 'Otro']
  },
  quienOtro: {
    type: String,
    trim: true
  },
  celular: {
    type: String,
    trim: true
  },
  // Control de reimpresiones
  reimpresiones: [{
    fecha: {
      type: Date,
      default: Date.now
    },
    motivo: {
      type: String,
      required: true
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    puntoTrabajo: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Índices compuestos para mejorar búsquedas
ticketSchema.index({ 'First Name': 1, 'Last Name': 1 });
ticketSchema.index({ 'Email': 1 });
ticketSchema.index({ 'Seat': 1 });
ticketSchema.index({ 'Numero de Cedula:': 1 });
ticketSchema.index({ 'Transaction ID': 1, 'Ticket ID': 1 });
ticketSchema.index({ impreso: 1, puntoTrabajo: 1 });

module.exports = mongoose.model('Ticket', ticketSchema, 'FechaUno');
