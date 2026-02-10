// src/config/db.js

// 1. PrismaClient library ko import kiya
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], 
});

// 3. Connection Test Function
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Prisma Connected Successfully to PostgreSQL');
    } catch (error) {
        console.error('❌ Prisma Connection Failed:', error);
        process.exit(1); 
    }
}


module.exports = {
    prisma,
    connectDB
};