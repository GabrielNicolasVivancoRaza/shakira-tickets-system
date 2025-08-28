const mongoose = require('mongoose');

const puntoVentaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  localidades: [{
    type: String,
    required: true,
    enum: [
      // Localidades base encontradas en la base de datos
      'GENERAL',
      'PREFERENCIA', 
      'TRIBUNA',
      'SOLTERA FAN ZONE',
      'SOLTERA FANZONE #3 LC',
      'PALCO',
      'Antología GOLDEN',
      'Hips Don\'t Lie PLATINUM',
      'Las Mujeres Facturan BOX',
      // También permitir las palabras clave originales
      'FAN ZONE',
      'FANZONE',
      'GOLDEN',
      'PLATINUM',
      'BOX'
    ]
  }],
  activo: {
    type: Boolean,
    default: true
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
puntoVentaSchema.index({ nombre: 1 });
puntoVentaSchema.index({ activo: 1 });

module.exports = mongoose.model('PuntoVenta', puntoVentaSchema, 'PuntosVenta');
