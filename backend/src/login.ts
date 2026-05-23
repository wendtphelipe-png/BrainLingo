import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import path from 'path';

// Adiciona o plugin Stealth para mitigar a detecção de automação
chromium.use(stealth());

async function run() {
    const userDataDir = path.join(__dirname, '../user_data/Wendt');
    console.log(`\n================================================================`);
    console.log(`🔑 INICIANDO FLUXO DE LOGIN DA CONTA 'Wendt'`);
    console.log(`Perfil persistente salvo em: ${userDataDir}`);
    console.log(`================================================================\n`);
    console.log(`[Google Login] Abrindo navegador visível...`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1024, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        permissions: ['camera', 'microphone']
    });

    const page = context.pages()[0] || await context.newPage();

    console.log(`[Google Login] Navegando para o Google login...`);
    await page.goto('https://accounts.google.com/signin');

    console.log(`\n👉 INSTRUÇÃO:`);
    console.log(`1. No navegador que acabou de abrir, digite seu e-mail e senha da conta 'Wendt'.`);
    console.log(`2. Faça o login normalmente e conclua as verificações de duas etapas se necessário.`);
    console.log(`3. Uma vez feito o login com sucesso, FECHE o navegador aberto para salvar e encerrar.`);
    console.log(`\n(Aguardando o fechamento do navegador...)\n`);

    // Mantém o script rodando até o navegador ser fechado pelo usuário
    return new Promise<void>((resolve) => {
        context.on('close', () => {
            console.log(`[Google Login] ✅ Navegador fechado. Login concluído com sucesso e perfil salvo!`);
            resolve();
        });
    });
}

run().catch((err) => {
    console.error(`[Google Login] ❌ Erro durante o login:`, err);
});
