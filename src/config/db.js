// src/config/db.js

const { PrismaClient } = require('@prisma/client');

const isProd = process.env.NODE_ENV === 'production';
const verboseLogs = process.env.PRISMA_VERBOSE === '1';

const prisma = new PrismaClient({
    log: verboseLogs
        ? ['query', 'info', 'warn', 'error']
        : isProd
            ? ['error']
            : ['warn', 'error'],
});

async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Prisma Connected Successfully to PostgreSQL');
    } catch (error) {
        console.error('Prisma Connection Failed:', error);
        process.exit(1);
    }
}


module.exports = {
    prisma,
    connectDB
};