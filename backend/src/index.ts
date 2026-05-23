import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { botManager } from './botManager';
import { calendarService } from './calendar';

const app = express();
app.use(express.json());
app.use(cors());

// Serve os arquivos do Frontend compilado
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Painel de Controle (Redireciona para o painel React premium)
app.get('/admin', (req: any, res: any) => {
    res.redirect('/?admin=true');
});

// Rota de Diagnóstico: Logs do sistema (direto do gerenciador na memória)
app.get('/api/logs', (req: any, res: any) => {
    res.json({ logs: botManager.getLogs() });
});

// Variáveis de ambiente ou fallback para desenvolvimento
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// Rota para iniciar/trocar o robô em uma reunião específica (Hot-Swap)
app.post('/api/start-bot', async (req: any, res: any) => {
    const { meetUrl } = req.body;
    
    if (!meetUrl || !meetUrl.includes('meet.google.com')) {
        return res.status(400).json({ error: 'Forneça uma URL válida do Google Meet.' });
    }

    try {
        // Dispara o hot-swap em background
        botManager.swapTo(meetUrl).catch(console.error);
        res.json({ message: 'Solicitação de troca enviada para o orquestrador!' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Falha ao iniciar o robô.' });
    }
});

// Rota para parar todos os robôs rodando
app.post('/api/stop-bot', async (req: any, res: any) => {
    try {
        await botManager.stopAll();
        res.json({ message: 'Todos os robôs foram interrompidos com sucesso!' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Falha ao parar robôs.' });
    }
});

async function getSecondsLeft(): Promise<{ secondsLeft: number; activeMeetingName: string; source: 'queue' | 'calendar' | 'manual' }> {
    try {
        // 1. Verifica se tem sincronização automática com calendário e se há um evento ativo
        const connected = calendarService.isConnected();
        const autoSync = calendarService.isAutoSyncEnabled();
        if (connected && autoSync) {
            const upcoming = await calendarService.getUpcomingEvents();
            // Acha o evento ativo
            const activeEvent = upcoming.find(e => e.isActive);
            if (activeEvent && activeEvent.meetLink) {
                const endTime = new Date(activeEvent.end).getTime();
                const now = Date.now();
                const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
                return { secondsLeft, activeMeetingName: activeEvent.summary, source: 'calendar' };
            }
        }
        
        // 2. Se não estiver usando calendário ativo, verifica a fila de reuniões
        const queue = readQueue();
        if (queue.activeSlotIndex >= 0 && queue.activeSlotStartTime) {
            const activeUrl = queue.slots[queue.activeSlotIndex];
            if (activeUrl && activeUrl.includes('meet.google.com')) {
                const startTime = new Date(queue.activeSlotStartTime).getTime();
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startTime) / 1000);
                const totalSeconds = queue.slotDurationMinutes * 60;
                const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds);
                return { secondsLeft, activeMeetingName: `Fila - Slot ${queue.activeSlotIndex + 1}`, source: 'queue' };
            }
        }
    } catch (e) {
        console.error('Erro ao calcular segundos restantes:', e);
    }
    
    // Fallback: manual ou nenhum
    return { secondsLeft: 0, activeMeetingName: 'Nenhuma', source: 'manual' };
}

// Variável global para rastrear presença do Transmissor (Brain)
let lastTransmitterHeartbeat = 0;

// Rota para buscar o status detalhado dos robôs ativos/transição
app.get('/api/bot/status', async (req: any, res: any) => {
    const { role } = req.query;
    if (role === 'transmitter') {
        lastTransmitterHeartbeat = Date.now();
    }
    
    const isTransmitterOnline = (Date.now() - lastTransmitterHeartbeat) < 7000;
    const baseStatus = botManager.getStatus();
    const timeInfo = await getSecondsLeft();
    res.json({
        ...baseStatus,
        ...timeInfo,
        isTransmitterOnline
    });
});


// Rota para buscar o status da sincronização de calendário
app.get('/api/calendar/status', async (req: any, res: any) => {
    try {
        const connected = calendarService.isConnected();
        const autoSync = calendarService.isAutoSyncEnabled();
        const upcoming = connected ? await calendarService.getUpcomingEvents() : [];
        res.json({ connected, autoSync, upcoming });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Falha ao buscar status do calendário.' });
    }
});

// Rota para ativar/desativar sincronização automática com o calendário
app.post('/api/calendar/toggle', (req: any, res: any) => {
    const { enable } = req.body;
    calendarService.toggleAutoSync(!!enable);
    res.json({ autoSync: calendarService.isAutoSyncEnabled() });
});

// Rota para forçar sincronização manual imediata do calendário
app.post('/api/calendar/sync-now', async (req: any, res: any) => {
    try {
        const activeMeetUrl = await calendarService.checkCalendarNow();
        res.json({ success: true, activeMeetUrl });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Falha ao sincronizar agora.' });
    }
});

// Rota para iniciar a janela de login do Google (Wendt) de forma visível direto pela Web
let isLoginWindowOpen = false;
let lastCheckTime = 0;
let isWendtLoggedIn = false;
let loggedInEmail = '';

app.post('/api/auth/login-wendt', async (req: any, res: any) => {
    try {
        console.log('[API] Solicitação de abertura de janela de login Google (Wendt) recebida.');
        
        const { chromium } = require('playwright-extra');
        const stealth = require('puppeteer-extra-plugin-stealth');
        const path = require('path');

        // Adiciona stealth
        chromium.use(stealth());
        const userDataDir = path.join(__dirname, '../user_data/Wendt');

        // Lança navegador visível em segundo plano sem travar o Express
        const runLoginWindow = async () => {
            isLoginWindowOpen = true;
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
            await page.goto('https://accounts.google.com/signin');

            // Monitora ativamente a janela em busca do login concluído
            const checkTimer = setInterval(async () => {
                try {
                    if (context.pages().length === 0) return;
                    const activePages = context.pages();
                    for (const p of activePages) {
                        const url = p.url();
                        if (url.includes('myaccount.google.com') && !url.includes('signin') && !url.includes('ServiceLogin')) {
                            isWendtLoggedIn = true;
                            // Tenta ler o e-mail conectado
                            try {
                                const emailEl = await p.$('[aria-label*="@gmail.com"], [aria-label*="@"]');
                                if (emailEl) {
                                    const label = await emailEl.getAttribute('aria-label');
                                    if (label) {
                                        const match = label.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                        if (match) {
                                            loggedInEmail = match[0];
                                        }
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    // Ignora se a aba for temporariamente recarregada ou manipulada
                }
            }, 1500);

            context.on('close', () => {
                isLoginWindowOpen = false;
                clearInterval(checkTimer);
                console.log('[API] ✅ Janela de login do Google (Wendt) foi fechada.');
                lastCheckTime = 0; // força revalidação rápida se necessário
            });
        };

        runLoginWindow().catch((err) => {
            isLoginWindowOpen = false;
            console.error('[API] Erro na execução da janela de login:', err);
        });

        res.json({ message: 'Janela de login aberta no seu computador. Realize o login e feche a janela ao terminar.' });
    } catch (e: any) {
        isLoginWindowOpen = false;
        console.error('Erro ao iniciar janela de login pela API:', e);
        res.status(500).json({ error: e.message || 'Falha ao abrir a janela de login.' });
    }
});

// Retorna se o bot (Wendt) está logado no Google e qual o e-mail da conta
app.get('/api/auth/status', async (req: any, res: any) => {
    const now = Date.now();
    
    // Se a janela estiver aberta, responde em tempo real usando as variáveis em memória para evitar Playwright conflito (lock)
    if (isLoginWindowOpen) {
        return res.json({ loggedIn: isWendtLoggedIn, email: loggedInEmail, isWindowOpen: true });
    }

    // Cache de 15 segundos para evitar sobrecarga com o polling do frontend
    if (now - lastCheckTime < 15000) {
        return res.json({ loggedIn: isWendtLoggedIn, email: loggedInEmail, isWindowOpen: false });
    }

    const userDataDir = path.join(__dirname, '../user_data/Wendt');
    if (!fs.existsSync(userDataDir)) {
        isWendtLoggedIn = false;
        loggedInEmail = '';
        lastCheckTime = now;
        return res.json({ loggedIn: false, email: '', isWindowOpen: false });
    }

    try {
        const { chromium } = require('playwright-extra');
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = context.pages()[0] || await context.newPage();
        await page.goto('https://myaccount.google.com/', { waitUntil: 'domcontentloaded', timeout: 5000 });
        
        const currentUrl = page.url();
        if (currentUrl.includes('accounts.google.com/signin') || currentUrl.includes('accounts.google.com/ServiceLogin')) {
            isWendtLoggedIn = false;
            loggedInEmail = '';
        } else {
            isWendtLoggedIn = true;
            try {
                const emailEl = await page.$('[aria-label*="@gmail.com"], [aria-label*="@"]');
                if (emailEl) {
                    const label = await emailEl.getAttribute('aria-label');
                    if (label) {
                        const match = label.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                        if (match) loggedInEmail = match[0];
                    }
                }
            } catch (e) {}
        }
        await context.close();
    } catch (e) {
        // Mantém último status em caso de timeout
    }

    lastCheckTime = now;
    res.json({ loggedIn: isWendtLoggedIn, email: loggedInEmail, isWindowOpen: false });
});

// ========================================================
// CONTROLE DA FILA DE REUNIÕES PROVISÓRIA (ATÉ 12 SLOTS)
// ========================================================
const QUEUE_FILE = path.join(__dirname, '../queue.json');

function readQueue() {
    try {
        if (fs.existsSync(QUEUE_FILE)) {
            const data = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
            return {
                activeSlotIndex: data.activeSlotIndex ?? -1,
                slots: data.slots ?? Array(12).fill(''),
                slotDurationMinutes: data.slotDurationMinutes ?? 30,
                autoAdvanceEnabled: data.autoAdvanceEnabled ?? false,
                activeSlotStartTime: data.activeSlotStartTime ?? null,
                openLocalBrowserEnabled: data.openLocalBrowserEnabled ?? true
            };
        }
    } catch (e) {
        console.error('Erro ao ler queue.json, recriando...', e);
    }
    return {
        activeSlotIndex: -1,
        slots: Array(12).fill(''),
        slotDurationMinutes: 30,
        autoAdvanceEnabled: false,
        activeSlotStartTime: null,
        openLocalBrowserEnabled: true
    };
}

function writeQueue(data: any) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Retorna o estado atual da fila de slots
app.get('/api/queue', (req: any, res: any) => {
    res.json(readQueue());
});

// Salva os links dos 12 slots da fila ou atualiza configurações do cronômetro
app.post('/api/queue', (req: any, res: any) => {
    const { slots, activeSlotIndex, slotDurationMinutes, autoAdvanceEnabled, activeSlotStartTime, openLocalBrowserEnabled } = req.body;
    
    if (slots && (!Array.isArray(slots) || slots.length !== 12)) {
        return res.status(400).json({ error: 'A fila deve conter exatamente 12 slots.' });
    }

    const queue = readQueue();
    if (slots) {
        queue.slots = slots.map((url: string) => url ? url.trim() : '');
    }
    
    if (typeof activeSlotIndex === 'number') {
        if (activeSlotIndex !== queue.activeSlotIndex) {
            queue.activeSlotStartTime = activeSlotIndex >= 0 ? new Date().toISOString() : null;
        }
        queue.activeSlotIndex = activeSlotIndex;
    }

    if (typeof slotDurationMinutes === 'number') {
        queue.slotDurationMinutes = slotDurationMinutes;
    }

    if (typeof autoAdvanceEnabled === 'boolean') {
        queue.autoAdvanceEnabled = autoAdvanceEnabled;
    }

    if (activeSlotStartTime !== undefined) {
        queue.activeSlotStartTime = activeSlotStartTime;
    }

    if (typeof openLocalBrowserEnabled === 'boolean') {
        queue.openLocalBrowserEnabled = openLocalBrowserEnabled;
    }

    writeQueue(queue);
    res.json(queue);
});

// Avança a fila para o próximo slot preenchido válido, realizando o Hot-Swap automático
app.post('/api/queue/next', async (req: any, res: any) => {
    const queue = readQueue();
    let nextIndex = queue.activeSlotIndex + 1;
    
    let foundNext = false;
    while (nextIndex < 12) {
        const nextUrl = queue.slots[nextIndex];
        if (nextUrl && nextUrl.includes('meet.google.com')) {
            foundNext = true;
            break;
        }
        nextIndex++;
    }

    if (!foundNext) {
        return res.status(400).json({ error: 'Não há mais reuniões agendadas válidas na fila.' });
    }

    const nextUrl = queue.slots[nextIndex];
    console.log(`[Queue Server] Avançando a fila: slot ${nextIndex} -> ${nextUrl}`);
    
    try {
        // Dispara o hot-swap suave do gerenciador de bots em segundo plano
        botManager.swapTo(nextUrl).catch(console.error);
        
        // Atualiza a fila
        queue.activeSlotIndex = nextIndex;
        queue.activeSlotStartTime = new Date().toISOString();
        writeQueue(queue);
        
        res.json({ message: `Avançando para o slot ${nextIndex + 1}...`, queue });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Falha ao executar o Hot-Swap para o próximo slot.' });
    }
});

// Reseta / limpa a fila de reuniões
app.post('/api/queue/reset', (req: any, res: any) => {
    const emptyQueue = {
        activeSlotIndex: -1,
        slots: Array(12).fill(''),
        slotDurationMinutes: 30,
        autoAdvanceEnabled: false,
        activeSlotStartTime: null
    };
    writeQueue(emptyQueue);
    res.json(emptyQueue);
});

// Rota para gerar URL do Consent Screen do Google OAuth2
app.get('/api/oauth/url', (req: any, res: any) => {
    try {
        const url = calendarService.getAuthUrl();
        res.json({ url });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Falha ao gerar link OAuth2.' });
    }
});

// Rota de Callback do Google OAuth2 unificada na mesma porta do servidor
app.get('/oauth2callback', async (req: any, res: any) => {
    const code = req.query.code as string;
    
    if (!code) {
        return res.status(400).send('Erro: Código de autenticação ausente.');
    }

    try {
        const client = calendarService.getOAuth2Client();
        const { tokens } = await client.getToken(code);
        calendarService.saveToken(tokens);
        
        res.send(`
            <html>
                <head>
                    <title>Sucesso - BrainLingo</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                        h1 { color: #10b981; }
                        .card { background: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 15px rgba(0,0,0,0.3); max-width: 400px; }
                        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>Conexão Estabelecida!</h1>
                        <p>O BrainLingo se conectou com sucesso à sua conta Google Calendar.</p>
                        <div class="loader"></div>
                        <p style="color: #64748b; font-size: 14px;">Redirecionando de volta para o painel admin...</p>
                    </div>
                    <script>
                        setTimeout(() => {
                            window.location.href = '/?admin=true';
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        console.error('Erro no callback OAuth:', error);
        res.status(500).send(`Falha na autorização: ${error.message}`);
    }
});

// Rota para o frontend gerar o token para o aluno que acessou via QR Code
app.post('/api/get-student-token', async (req: any, res: any) => {
    const { roomName, studentId } = req.body;
    
    if (!roomName) {
        return res.status(400).json({ error: 'Falta o roomName.' });
    }

    // Cria o token para o aluno (canSubscribe = true, canPublish = false)
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: studentId || `aluno-${Math.floor(Math.random() * 10000)}`,
    });
    
    at.addGrant({ roomJoin: true, room: roomName, canPublish: false, canSubscribe: true });
    
    res.json({ token: await at.toJwt() });
});

// Loop de verificação automática a cada 5 segundos para avançar a fila quando o tempo expirar
let isSwapping = false;

setInterval(async () => {
    if (isSwapping) return;

    try {
        const queue = readQueue();
        if (queue.autoAdvanceEnabled && queue.activeSlotIndex >= 0 && queue.activeSlotStartTime) {
            const nextUrl = queue.slots[queue.activeSlotIndex];
            if (nextUrl && nextUrl.includes('meet.google.com')) {
                const startTime = new Date(queue.activeSlotStartTime).getTime();
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startTime) / 1000);
                const limitSeconds = queue.slotDurationMinutes * 60;
                
                if (elapsedSeconds >= limitSeconds) {
                    botManager.addLog(`[Cronômetro] O tempo de ${queue.slotDurationMinutes} minutos acabou para o slot ${queue.activeSlotIndex + 1}.`);
                    
                    // Busca se existe um próximo slot preenchido
                    let nextIndex = queue.activeSlotIndex + 1;
                    let foundNext = false;
                    while (nextIndex < 12) {
                        const nextUrlCandidate = queue.slots[nextIndex];
                        if (nextUrlCandidate && nextUrlCandidate.includes('meet.google.com')) {
                            foundNext = true;
                            break;
                        }
                        nextIndex++;
                    }
                    
                    if (foundNext) {
                        const nextMeetUrl = queue.slots[nextIndex];
                        botManager.addLog(`[Cronômetro] Iniciando auto-avanço da fila para o slot ${nextIndex + 1}: ${nextMeetUrl}`);
                        
                        isSwapping = true;
                        try {
                            // Atualiza a fila IMEDIATAMENTE antes do swap no arquivo para evitar duplo acionamento por ticks posteriores
                            queue.activeSlotIndex = nextIndex;
                            queue.activeSlotStartTime = new Date().toISOString();
                            writeQueue(queue);
                            
                            // Executa o swap e aguarda sua conclusão
                            await botManager.swapTo(nextMeetUrl);
                        } finally {
                            isSwapping = false;
                        }
                    } else {
                        botManager.addLog(`[Cronômetro] Fila de reuniões concluída! Nenhum próximo slot válido encontrado.`);
                        
                        // Desliga ou encerra o cronômetro
                        queue.activeSlotStartTime = null;
                        writeQueue(queue);
                    }
                }
            }
        }
    } catch (err: any) {
        console.error('Erro no loop do cronômetro da fila:', err.message || err);
        isSwapping = false;
    }
}, 5000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 BrainLingo Backend rodando em http://localhost:${PORT}`);
    console.log(`========================================================\n`);
});
