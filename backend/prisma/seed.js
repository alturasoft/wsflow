"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- Iniciando Seed de Datos Iniciales ---');
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'seguros-altura' },
        update: {},
        create: {
            name: 'Seguros Altura S.A.',
            slug: 'seguros-altura',
            settings: {
                timezone: 'America/La_Paz',
                currency: 'USD',
                language: 'es',
            },
        },
    });
    console.log(`✓ Tenant creado: ${tenant.name} (${tenant.id})`);
    const passwordHash = await bcrypt.hash('AdminSecure2026!', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@segurosaltura.com' },
        update: {},
        create: {
            email: 'admin@segurosaltura.com',
            passwordHash,
            name: 'Administrador Altura',
            isSuperAdmin: true,
        },
    });
    await prisma.tenantUser.upsert({
        where: {
            tenantId_userId: {
                tenantId: tenant.id,
                userId: user.id,
            },
        },
        update: {},
        create: {
            tenantId: tenant.id,
            userId: user.id,
            role: client_1.TenantRole.OWNER,
        },
    });
    console.log(`✓ Usuario Administrador listo: ${user.email}`);
    const flowDefinition = {
        nodes: [
            {
                id: 'node_start',
                type: 'start',
                data: { label: 'Inicio del flujo' },
            },
            {
                id: 'node_welcome',
                type: 'message',
                data: {
                    text: '¡Hola {{nombre_cliente}}! Bienvenido al asistente virtual de Seguros Altura.',
                },
            },
            {
                id: 'node_main_menu',
                type: 'buttons',
                data: {
                    text: '¿En qué podemos ayudarte hoy? Por favor selecciona una opción:',
                    buttons: [
                        { id: 'btn_siniestro', title: 'Reportar Siniestro' },
                        { id: 'btn_cotizar', title: 'Cotizar Seguro' },
                        { id: 'btn_asesor', title: 'Hablar con Asesor' },
                    ],
                },
            },
            {
                id: 'node_ask_ci',
                type: 'capture',
                data: {
                    variableName: 'numero_documento',
                    validationType: 'number',
                    prompt: 'Por favor, ingresa tu número de Carnet de Identidad (solo números) para buscar tu póliza:',
                    retryMessage: 'El carnet debe contener solo números. Intenta nuevamente:',
                },
            },
            {
                id: 'node_confirm_siniestro',
                type: 'message',
                data: {
                    text: 'Gracias. Hemos localizado tu registro para el CI {{numero_documento}}. Te estamos conectando de inmediato con nuestro ajustador de siniestros de guardia.',
                },
            },
            {
                id: 'node_vcard_ajustador',
                type: 'handoff',
                data: {
                    handoffType: 'vcard',
                    contactVCard: {
                        name: 'Carlos Mendoza - Ajustador de Siniestros',
                        phone: '+59170112233',
                        organization: 'Seguros Altura Emergencias',
                    },
                },
            },
            {
                id: 'node_handoff_inbox',
                type: 'handoff',
                data: {
                    handoffType: 'inbox',
                },
            },
            {
                id: 'node_end_agent',
                type: 'end',
                data: {
                    closingMessage: 'Un asesor humano ha tomado tu conversación y te responderá en unos instantes. ¡Muchas gracias!',
                },
            },
        ],
        edges: [
            { id: 'e1', source: 'node_start', target: 'node_welcome' },
            { id: 'e2', source: 'node_welcome', target: 'node_main_menu' },
            { id: 'e3', source: 'node_main_menu', target: 'node_ask_ci', sourceHandle: 'btn_siniestro' },
            { id: 'e4', source: 'node_ask_ci', target: 'node_confirm_siniestro' },
            { id: 'e5', source: 'node_confirm_siniestro', target: 'node_vcard_ajustador' },
            { id: 'e6', source: 'node_main_menu', target: 'node_handoff_inbox', sourceHandle: 'btn_asesor' },
            { id: 'e7', source: 'node_handoff_inbox', target: 'node_end_agent' },
        ],
    };
    let flow = await prisma.flow.findFirst({
        where: { tenantId: tenant.id, name: 'Atención General y Siniestros' },
    });
    if (!flow) {
        flow = await prisma.flow.create({
            data: {
                tenantId: tenant.id,
                name: 'Atención General y Siniestros',
                description: 'Flujo principal interactivo para reportes de siniestros y atención comercial',
                createdById: user.id,
                triggerKeywords: ['hola', 'siniestro', 'menu', 'ayuda'],
            },
        });
    }
    const flowVersion = await prisma.flowVersion.upsert({
        where: {
            flowId_versionNumber: {
                flowId: flow.id,
                versionNumber: 1,
            },
        },
        update: {
            definition: flowDefinition,
            status: client_1.VersionStatus.PUBLISHED,
        },
        create: {
            flowId: flow.id,
            versionNumber: 1,
            status: client_1.VersionStatus.PUBLISHED,
            definition: flowDefinition,
            changelog: 'Versión inicial No-Code con menú de botones, captura de CI y vCard',
            publishedAt: new Date(),
            publishedById: user.id,
        },
    });
    await prisma.flow.update({
        where: { id: flow.id },
        data: { activeVersionId: flowVersion.id },
    });
    console.log(`✓ Flujo publicado: "${flow.name}" (Versión 1)`);
    const wabaAccount = await prisma.whatsAppAccount.upsert({
        where: { phoneNumberId: '109876543210987' },
        update: {
            defaultFlowId: flow.id,
        },
        create: {
            tenantId: tenant.id,
            name: 'Línea Central WhatsApp Altura',
            phoneNumberId: '109876543210987',
            wabaId: '123456789012345',
            displayPhoneNumber: '+591 70000000',
            accessTokenEncrypted: 'mock_encrypted_access_token_meta_2026',
            webhookVerifyToken: 'wsflow_webhook_verify_token_secure_2026',
            isActive: true,
            defaultFlowId: flow.id,
        },
    });
    console.log(`✓ Cuenta WABA vinculada: ${wabaAccount.name} (${wabaAccount.displayPhoneNumber})`);
    console.log('--- Seed completado con éxito ---');
}
main()
    .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map