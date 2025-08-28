const mongoose = require('mongoose');
const User = require('../models/User');

let connectionAttempts = 0;
const maxRetries = 5;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 segundos
      socketTimeoutMS: 45000, // 45 segundos
      maxPoolSize: 10, // Máximo 10 conexiones en el pool
      minPoolSize: 2, // Mínimo 2 conexiones
      maxIdleTimeMS: 30000, // Cerrar conexiones inactivas después de 30 segundos
      compressors: ['zlib'], // Compresión de datos
      zlibCompressionLevel: 6, // Nivel de compresión
      readPreference: 'primary', // Leer del primario
      retryWrites: true, // Reintentar escrituras
      w: 'majority' // Confirmar escrituras en la mayoría de nodos
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    connectionAttempts = 0; // Reset counter on successful connection

    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      connectionAttempts = 0; // Reset counter on reconnection
    });

    // Crear usuario jefe por defecto si no existe
    await createDefaultAdmin();

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    connectionAttempts++;
    
    if (connectionAttempts < maxRetries) {
      console.log(`Attempting to reconnect to MongoDB... (${connectionAttempts}/${maxRetries})`);
      setTimeout(() => {
        connectDB();
      }, 5000);
    } else {
      console.error('Max connection attempts reached. Please check your MongoDB connection.');
    }
  }
};

const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ rol: 'jefe' });
    
    if (!adminExists) {
      const defaultAdmin = new User({
        nombre: 'Administrador',
        usuario: 'admin@shakira.com',
        password: process.env.DEFAULT_PASSWORD,
        rol: 'jefe',
        primerAcceso: true
      });

      await defaultAdmin.save();
      console.log('Usuario administrador por defecto creado');
      console.log('Usuario: admin@shakira.com');
      console.log('Contraseña:', process.env.DEFAULT_PASSWORD);
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

module.exports = connectDB;
