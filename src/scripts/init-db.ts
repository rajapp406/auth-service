import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../config/config';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!@#', config.security.bcryptRounds);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@fitness.com' },
      update: {},
      create: {
        email: 'admin@fitness.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    console.log('Database initialized with admin user:', admin.email);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 