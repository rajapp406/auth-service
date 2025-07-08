import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('🔍 Fetching users from the database...');
    
    // Get all users with their related data
    const users = await prisma.user.findMany({
      include: {
        refreshTokens: {
          select: {
            id: true,
            token: true,
            expiresAt: true,
            revokedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3, // Only get the 3 most recent refresh tokens
        },
        sessions: {
          select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            expiresAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3, // Only get the 3 most recent sessions
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (users.length === 0) {
      console.log('ℹ️  No users found in the database.');
      return;
    }

    console.log('\n📋 Users in the database:');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n👤 User #${index + 1}:`);
      console.log('─'.repeat(40));
      console.log(`ID:            ${user.id}`);
      console.log(`Email:         ${user.email}`);
      console.log(`Name:          ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided');
      console.log(`Role:          ${user.role}`);
      console.log(`Auth Provider: ${user.authProvider || 'Email'}`);
      console.log(`Verified:      ${user.isEmailVerified ? '✅' : '❌'}`);
      console.log(`Created:       ${user.createdAt.toLocaleString()}`);
      console.log(`Last Updated:  ${user.updatedAt.toLocaleString()}`);
      console.log(`Last Login:    ${user.lastLogin?.toLocaleString() || 'Never'}`);
      
      if (user.refreshTokens.length > 0) {
        console.log('\n🔑 Recent Refresh Tokens:');
        user.refreshTokens.forEach((token, i) => {
          console.log(`  ${i + 1}. ${token.token.substring(0, 10)}... (Expires: ${token.expiresAt.toLocaleString()})`);
          if (token.revokedAt) {
            console.log(`     Revoked at: ${token.revokedAt.toLocaleString()}`);
          }
        });
      }

      if (user.sessions.length > 0) {
        console.log('\n💻 Active Sessions:');
        user.sessions.forEach((session, i) => {
          console.log(`  ${i + 1}. ${session.userAgent || 'Unknown device'}`);
          console.log(`     IP: ${session.ipAddress || 'Unknown'}`);
          console.log(`     Expires: ${session.expiresAt.toLocaleString()}`);
        });
      }
      
      console.log('='.repeat(80));
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
