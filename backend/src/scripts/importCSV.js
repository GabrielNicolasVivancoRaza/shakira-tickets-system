const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('../models/Ticket');
const connectDB = require('../config/database');

const importTicketsFromCSV = async (csvFilePath) => {
  try {
    await connectDB();
    
    const tickets = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const ticket = {
          firstName: row['First Name'] || '',
          lastName: row['Last Name'] || '',
          email: row['Email'] || '',
          ticket: row['Ticket'] || '',
          seat: row['Seat'] || '',
          transactionId: row['Transaction ID'] || '',
          ticketId: row['Ticket ID'] || '',
          cedula: row['Numero de Cedula:'] || ''
        };

        // Solo agregar si tiene datos esenciales
        if (ticket.ticketId && ticket.transactionId) {
          tickets.push(ticket);
        }
      })
      .on('end', async () => {
        try {
          console.log(`Procesando ${tickets.length} tickets...`);
          
          // Insertar en lotes para mejor rendimiento
          const batchSize = 100;
          for (let i = 0; i < tickets.length; i += batchSize) {
            const batch = tickets.slice(i, i + batchSize);
            await Ticket.insertMany(batch, { ordered: false });
            console.log(`Procesados ${Math.min(i + batchSize, tickets.length)} de ${tickets.length} tickets`);
          }
          
          console.log('✅ Importación completada exitosamente');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante la importación:', error);
          process.exit(1);
        }
      });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Usar desde línea de comandos: node importCSV.js path/to/file.csv
if (require.main === module) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.log('Usage: node importCSV.js <path-to-csv-file>');
    process.exit(1);
  }
  importTicketsFromCSV(csvPath);
}

module.exports = importTicketsFromCSV;
