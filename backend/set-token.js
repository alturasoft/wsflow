require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');

const prisma = new PrismaClient();

function encrypt(text) {
  const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(rawKey.substring(0, 64), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  const newToken = process.argv[2];
  if (!newToken) {
    console.log('====================================================================');
    console.log('   WSFlow - Actualizador de Access Token de Meta WhatsApp API      ');
    console.log('====================================================================');
    console.log('Uso:');
    console.log('  npm run token:set <NUEVO_TOKEN_DE_META>');
    console.log('\nEjemplo:');
    console.log('  npm run token:set EAABwzL...');
    console.log('====================================================================');
    process.exit(1);
  }

  const account = await prisma.whatsAppAccount.findFirst({ where: { isActive: true } });
  if (!account) {
    console.error('No se encontró ninguna cuenta de WhatsApp activa en la base de datos.');
    process.exit(1);
  }

  console.log(`Probando token con Phone Number ID: ${account.phoneNumberId}...`);
  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/${account.phoneNumberId}`, {
      headers: { Authorization: `Bearer ${newToken.trim()}` },
    });
    console.log(`[OK] Token validado con exito ante Meta!`);
    console.log(`  Nombre verificado: ${res.data.verified_name || 'N/A'}`);
    console.log(`  Telefono: ${res.data.display_phone_number || account.displayPhoneNumber}`);

    const encrypted = encrypt(newToken.trim());
    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: { accessTokenEncrypted: encrypted },
    });
    console.log(`[OK] Nuevo token guardado y encriptado en la base de datos PostgreSQL.`);
  } catch (err) {
    console.error('[ERROR] Error validando el token ante Meta:', err.response?.data || err.message);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
