import { useState, useEffect, useRef } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useConnectionState,
  useTracks
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { 
  Volume2, VolumeX, Activity, AlertCircle, Play, Square, 
  RefreshCw, Calendar as CalendarIcon, CheckCircle2, 
  ExternalLink, Settings, Terminal, Radio, ShieldAlert
} from 'lucide-react';
// @ts-ignore
import '@livekit/components-styles';

// URLs devem vir do .env ou fallback
const serverUrl = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';
const devToken = '';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isTransmitter, setIsTransmitter] = useState<boolean>(false);
  const [token, setToken] = useState<string>(devToken);
  const [roomName, setRoomName] = useState<string>('evento-01');

  // Pega parâmetros da URL (ex: ?room=evento-01&token=xyz&admin=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlRoom = params.get('room') || 'evento-01';
    const isUrlAdmin = params.get('admin') === 'true';
    const isUrlTransmitter = params.get('transmitter') === 'true' || params.get('transmissor') === 'true';
    
    setRoomName(urlRoom);
    setIsAdmin(isUrlAdmin);
    setIsTransmitter(isUrlTransmitter);

    if (isUrlAdmin || isUrlTransmitter) {
      // Admin e Transmissor não precisam carregar LiveKitRoom na página principal
      return;
    }

    if (urlToken) {
      setToken(urlToken);
    } else {
      // Se não tem token na URL, pede pro backend gerar um na hora!
      fetch('/api/get-student-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: urlRoom })
      })
      .then(r => r.json())
      .then(data => {
        if (data.token) setToken(data.token);
      })
      .catch(console.error);
    }
  }, []);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isTransmitter) {
    return <TransmitterDashboard />;
  }

  if (token === '') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 bg-slate-950 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
        <p className="mt-4 text-slate-400 font-medium">Gerando ingresso de áudio...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      className="h-screen w-screen bg-slate-950 text-white"
    >
      <RoomAudioRenderer />
      <PlayerInterface roomName={roomName} />
    </LiveKitRoom>
  );
}

// ---------------------------------------------------------
// COMPONENTE: PLAYER DO ALUNO (STUDENT AUDIO PLAYER)
// ---------------------------------------------------------
function PlayerInterface({ roomName }: { roomName: string }) {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio]);
  
  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;
  const isReceivingAudio = tracks.length > 0;

  return (
    <div className="flex flex-col h-full items-center justify-between p-6 sm:p-12 bg-slate-950 text-white">
      
      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Tradução ao Vivo</h2>
          <h1 className="text-xl font-bold text-white truncate max-w-[200px]">{roomName}</h1>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
          isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {isConnected ? 'Ao Vivo' : isConnecting ? 'Conectando...' : 'Desconectado'}
        </div>
      </header>

      {/* Main Center UI - Visualizer / Play Button */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative group">
          <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 transition-all duration-1000 ${
            isConnected && isReceivingAudio ? 'bg-blue-500 scale-150 animate-pulse' : 'bg-slate-800 scale-100'
          }`} />
          
          <div className="relative z-10 w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-2xl transition-transform duration-500 hover:scale-105">
             {isConnected ? (
                isReceivingAudio ? (
                  <>
                    <Activity className="w-16 h-16 text-blue-400 mb-3 animate-bounce" />
                    <p className="text-lg font-bold text-white tracking-wide">Ouvindo...</p>
                    <p className="text-xs text-slate-400 mt-1">Áudio original traduzido</p>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-16 h-16 text-slate-600 mb-3" />
                    <p className="text-lg font-bold text-slate-400">Aguardando áudio</p>
                    <p className="text-xs text-slate-500 mt-1">O tradutor ainda não iniciou</p>
                  </>
                )
             ) : (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Reconectando canal...</p>
                </div>
             )}
          </div>
        </div>
      </main>

      {/* Controls Footer */}
      <footer className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-3xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
             <Volume2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-200">Áudio do Estudante</p>
            <p className="text-xs text-slate-400">Use os botões de volume do seu celular</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ---------------------------------------------------------
// COMPONENTE: ADMIN DASHBOARD (PAINEL DO ADMINISTRADOR)
// ---------------------------------------------------------
interface BotInstanceStatus {
  id: string;
  meetUrl: string;
  status: 'connecting' | 'active' | 'closing' | 'error';
  startedAt: string;
}

interface CalendarStatus {
  connected: boolean;
  autoSync: boolean;
  upcoming: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    meetLink: string | null;
    isActive: boolean;
  }>;
}
function AdminDashboard() {
  const [meetUrl, setMeetUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeBot, setActiveBot] = useState<BotInstanceStatus | null>(null);
  const [transitionBot, setTransitionBot] = useState<BotInstanceStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus>({
    connected: false,
    autoSync: false,
    upcoming: []
  });
  
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Estados da Fila de Reuniões Provisória
  const [queueSlots, setQueueSlots] = useState<string[]>(Array(12).fill(''));
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(-1);
  const [bulkText, setBulkText] = useState<string>('');
  const [showBulk, setShowBulk] = useState<boolean>(true);
  const [isQueueAdvancing, setIsQueueAdvancing] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isWaitingForLogin, setIsWaitingForLogin] = useState<boolean>(false);
  const [wendtStatus, setWendtStatus] = useState<{ loggedIn: boolean; email: string }>({ loggedIn: false, email: '' });
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Novos estados para o cronômetro e status enriquecido
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [activeMeetingName, setActiveMeetingName] = useState<string>('Nenhuma');
  const [meetingSource, setMeetingSource] = useState<'queue' | 'calendar' | 'manual'>('manual');
  
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(30);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);
  const [activeSlotStartTime, setActiveSlotStartTime] = useState<string | null>(null);
  const [openLocalBrowserEnabled, setOpenLocalBrowserEnabled] = useState<boolean>(true);
  const [isTransmitterOnline, setIsTransmitterOnline] = useState<boolean>(false);

  // Handler para Login Persistente da Conta Wendt do Google Meet
  const handleLoginWendt = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login-wendt', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setIsWaitingForLogin(true);
      }
    } catch (e) {
      alert('Erro ao tentar abrir a janela de login do Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Efeito local para o contador regressivo de segundos em 1Hz (atualização suave)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca o status do orquestrador de bots, do calendário e da fila
  const fetchStatus = async () => {
    try {
      const resBot = await fetch('/api/bot/status?role=receiver');
      const dataBot = await resBot.json();
      setActiveBot(dataBot.activeBot);
      setTransitionBot(dataBot.transitionBot);
      setLogs(dataBot.logs || []);
      
      // Novos estados de contagem regressiva injetados pelo backend
      setSecondsLeft(dataBot.secondsLeft ?? 0);
      setActiveMeetingName(dataBot.activeMeetingName ?? 'Nenhuma');
      setMeetingSource(dataBot.source ?? 'manual');
      setIsTransmitterOnline(dataBot.isTransmitterOnline ?? false);

      const resCal = await fetch('/api/calendar/status');
      const dataCal = await resCal.json();
      setCalendar(dataCal);

      const resQueue = await fetch('/api/queue');
      const dataQueue = await resQueue.json();
      setQueueSlots(dataQueue.slots);
      setActiveQueueIndex(dataQueue.activeSlotIndex);
      
      // Novos estados da fila
      setSlotDurationMinutes(dataQueue.slotDurationMinutes ?? 30);
      setAutoAdvanceEnabled(dataQueue.autoAdvanceEnabled ?? false);
      setActiveSlotStartTime(dataQueue.activeSlotStartTime ?? null);
      setOpenLocalBrowserEnabled(dataQueue.openLocalBrowserEnabled ?? true);

      const resWendt = await fetch('/api/auth/status');
      const dataWendt = await resWendt.json();
      setWendtStatus(dataWendt);
    } catch (e) {
      console.error('Erro ao buscar status do servidor:', e);
    }
  };

  const handleToggleAutoAdvance = async () => {
    try {
      const updatedAutoAdvance = !autoAdvanceEnabled;
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAdvanceEnabled: updatedAutoAdvance })
      });
      const data = await res.json();
      setAutoAdvanceEnabled(data.autoAdvanceEnabled);
    } catch (e) {
      alert('Erro ao alternar o auto-avanço.');
    }
  };

  const handleToggleOpenLocalBrowser = async () => {
    try {
      const updatedVal = !openLocalBrowserEnabled;
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openLocalBrowserEnabled: updatedVal })
      });
      const data = await res.json();
      setOpenLocalBrowserEnabled(data.openLocalBrowserEnabled ?? true);
    } catch (e) {
      alert('Erro ao alternar abertura do navegador.');
    }
  };

  const handleChangeDuration = async (minutes: number) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotDurationMinutes: minutes })
      });
      const data = await res.json();
      setSlotDurationMinutes(data.slotDurationMinutes);
    } catch (e) {
      alert('Erro ao alterar a duração das reuniões.');
    }
  };

  // Handlers para Fila de Reuniões
  const handleSaveQueue = async (updatedSlots: string[]) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: updatedSlots })
      });
      const data = await res.json();
      setQueueSlots(data.slots);
      setActiveQueueIndex(data.activeSlotIndex);
    } catch (e) {
      console.error('Erro ao salvar a fila:', e);
    }
  };

  const handleSlotChange = (index: number, val: string) => {
    const updated = [...queueSlots];
    updated[index] = val;
    setQueueSlots(updated);
  };

  const handleAdvanceQueue = async () => {
    setIsQueueAdvancing(true);
    try {
      const res = await fetch('/api/queue/next', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setActiveQueueIndex(data.queue.activeSlotIndex);
        setQueueSlots(data.queue.slots);
      }
    } catch (e) {
      alert('Erro ao avançar a fila.');
    } finally {
      setIsQueueAdvancing(false);
    }
  };

  const handleResetQueue = async () => {
    if (!confirm('Deseja limpar todos os 12 slots da fila?')) return;
    try {
      const res = await fetch('/api/queue/reset', { method: 'POST' });
      const data = await res.json();
      setQueueSlots(data.slots);
      setActiveQueueIndex(data.activeSlotIndex);
      setBulkText('');
    } catch (e) {
      alert('Erro ao resetar a fila.');
    }
  };

  const handleBulkPasteApply = () => {
    const lines = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    const newSlots = Array(12).fill('');
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      newSlots[i] = lines[i];
    }
    
    setQueueSlots(newSlots);
    setShowBulk(false);
    handleSaveQueue(newSlots);
  };

  // Efeito de polling para sincronizar o status em tempo real a cada 2.5s
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll para os logs mais novos no terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = 0; // Logs mais novos estão no topo (unshifted)
    }
  }, [logs]);

  // Função para enviar o bot manualmente para uma reunião
  const handleStartBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetUrl.includes('meet.google.com')) {
      alert('Por favor, insira uma URL válida do Google Meet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/start-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetUrl })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setMeetUrl('');
        fetchStatus();
      }
    } catch (err) {
      alert('Falha ao se conectar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parar todos os robôs
  const handleStopAll = async () => {
    if (!confirm('Deseja interromper e fechar todos os robôs tradutores ativos?')) return;
    try {
      await fetch('/api/stop-bot', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert('Erro ao interromper robôs.');
    }
  };

  // Alternar sincronização automática do calendário
  const handleToggleAutoSync = async () => {
    try {
      const res = await fetch('/api/calendar/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !calendar.autoSync })
      });
      const data = await res.json();
      setCalendar(prev => ({ ...prev, autoSync: data.autoSync }));
      fetchStatus();
    } catch (err) {
      alert('Erro ao alternar sincronização.');
    }
  };

  // Forçar sincronização manual imediata do calendário
  const handleSyncCalendarNow = async () => {
    try {
      const res = await fetch('/api/calendar/sync-now', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(data.activeMeetUrl 
          ? `Sincronização completa! Nova reunião ativa disparada: ${data.activeMeetUrl}`
          : 'Calendário sincronizado. Nenhuma nova reunião ativa agendada para este momento.'
        );
        fetchStatus();
      }
    } catch (err) {
      alert('Erro ao sincronizar calendário.');
    }
  };

  // Iniciar fluxo Google OAuth2
  const handleOAuthConnect = async () => {
    try {
      const res = await fetch('/api/oauth/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erro ao carregar URL do consent screen.');
      }
    } catch (err) {
      alert('Erro de conexão ao obter link do Google OAuth.');
    }
  };

  // Formatar tempo de início
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Header do Painel */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">BrainLingo</h1>
            <p className="text-xs text-slate-500 font-medium">Orquestrador e Hot-Swap de Reuniões</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <span className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            isTransmitterOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
              : 'bg-slate-800 text-slate-500 border-slate-750'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTransmitterOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-650'}`} />
            {isTransmitterOnline ? 'Transmissor (Brain): ON' : 'Transmissor (Brain): OFF'}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-850 border border-slate-750 px-3 py-1.5 rounded-lg font-semibold">
            <Settings className="w-3.5 h-3.5" />
            Modo Receptor (Admin)
          </span>
          <button 
            onClick={() => window.location.href = '/?transmitter=true'}
            className="text-xs bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold px-4 py-2 rounded-lg transition-colors border border-indigo-500/25 flex items-center gap-1"
          >
            🔌 Painel Transmissor (Brain)
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-700 hover:text-white"
          >
            Visualizar Aluno
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl w-full mx-auto">
        {/* COLUNA ESQUERDA: Status e Controle da Fila (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Painel de Controle e Tempo da Reunião */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h2 className="text-md font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                Painel de Controle e Tempo da Reunião
              </h2>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                secondsLeft > 0 && activeBot
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${secondsLeft > 0 && activeBot ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                {secondsLeft > 0 && activeBot ? 'Reunião em Andamento' : 'Aguardando'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Cronômetro */}
              <div className="md:col-span-5 bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-2xl pointer-events-none scale-150" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tempo Restante</span>
                <div className="text-3xl font-extrabold font-mono tracking-wider text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse">
                  {secondsLeft > 0 ? (
                    <>
                      {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                    </>
                  ) : '00:00'}
                </div>
                {activeSlotStartTime && secondsLeft > 0 && (
                  <span className="text-[9px] text-slate-500 font-semibold mt-1">
                    Iniciado às: {new Date(activeSlotStartTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                
                {/* Barra de Progresso do Slot */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ 
                      width: `${
                        slotDurationMinutes > 0
                          ? Math.max(0, Math.min(100, (secondsLeft / (slotDurationMinutes * 60)) * 100))
                          : 0
                      }%` 
                    }}
                  />
                </div>
              </div>

              {/* Status Detalhado */}
              <div className="md:col-span-7 space-y-3.5">
                <div className="bg-slate-950/60 border border-slate-850/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Reunião Ativa:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[200px]">{activeMeetingName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Origem do Link:</span>
                    <span className="text-blue-400 font-bold uppercase text-[10px] tracking-wider bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {meetingSource === 'queue' ? 'Fila de Reuniões' : meetingSource === 'calendar' ? 'Agenda (Calendar)' : 'Troca Manual'}
                    </span>
                  </div>
                </div>

                {/* Duração Customizável e Auto-Avanço */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Duração do Slot da Fila
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((dur) => (
                        <button
                          key={dur}
                          onClick={() => handleChangeDuration(dur)}
                          className={`text-xs py-1.5 rounded-lg border font-bold transition-all ${
                            slotDurationMinutes === dur
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/10'
                              : 'bg-slate-950/80 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {dur}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle de Auto-Avanço */}
                  <div className="flex items-center justify-between bg-slate-950/60 p-3 border border-slate-850/60 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-200">Troca Automática ao Zerar</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Avança e faz Hot-Swap ao zerar</p>
                    </div>
                    <button
                      onClick={handleToggleAutoAdvance}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center ${
                        autoAdvanceEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300" />
                    </button>
                  </div>

                  {/* Toggle de Abertura Local do Navegador */}
                  <div className="flex items-center justify-between bg-slate-950/60 p-3 border border-slate-850/60 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-200">Navegador Local no Receptor</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Abre o Meet no Chrome deste PC</p>
                    </div>
                    <button
                      onClick={handleToggleOpenLocalBrowser}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center ${
                        openLocalBrowserEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status do Tradutor Headless */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h2 className="text-md font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-500" />
                Status do Tradutor Headless
              </h2>
              {activeBot ? (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 animate-pulse ${
                  activeBot.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeBot.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {activeBot.status === 'active' ? 'Live' : 'Entrando...'}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700">
                  Offline
                </span>
              )}
            </div>

            {/* Informações da Reunião Ativa */}
            {activeBot ? (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500">Google Meet Ativo</span>
                    <span className="text-xs text-slate-600 font-mono">ID: {activeBot.id}</span>
                  </div>
                  <a 
                    href={activeBot.meetUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 break-all"
                  >
                    {activeBot.meetUrl}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    Iniciado às: {new Date(activeBot.startedAt).toLocaleTimeString('pt-BR')}
                  </div>
                </div>

                {/* Linha do Tempo do Hot-Swap em Tempo Real */}
                {transitionBot && (
                  <div className="bg-slate-950/80 border border-slate-850 p-5 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                      <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        🔄 TROCA EM ANDAMENTO (HOT-SWAP)
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Robô: {transitionBot.id}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate">
                      Nova Sala: <span className="text-blue-400 font-mono font-bold">{transitionBot.meetUrl}</span>
                    </p>

                    {/* Timeline steps */}
                    <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
                      
                      {/* Passo 1: Iniciando robô e Playwright */}
                      <div className="relative">
                        <div className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold ${
                          transitionBot.status === 'connecting'
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 animate-pulse'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        }`}>
                          {transitionBot.status === 'connecting' ? '1' : '✓'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Passo 1: Orquestração Headless</h4>
                          <p className="text-[10px] text-slate-500">Iniciando instância segura do navegador no servidor...</p>
                        </div>
                      </div>

                      {/* Passo 2: Entrando no Google Meet */}
                      <div className="relative">
                        <div className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold ${
                          transitionBot.status === 'connecting'
                            ? 'bg-slate-900 border-slate-800 text-slate-650'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        }`}>
                          {transitionBot.status === 'connecting' ? '2' : '✓'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Passo 2: Autenticação Google & Acesso</h4>
                          <p className="text-[10px] text-slate-500">
                            {transitionBot.status === 'connecting' 
                              ? 'Conectando ao Google Meet (Entrada automática via Agenda)...' 
                              : 'Conexão estabelecida com sucesso na sala!'}
                          </p>
                        </div>
                      </div>

                      {/* Passo 3: Overlap de Áudio */}
                      <div className="relative">
                        <div className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold ${
                          transitionBot.status === 'active'
                            ? 'bg-amber-600/20 border-amber-500 text-amber-400 animate-bounce'
                            : 'bg-slate-900 border-slate-800 text-slate-600'
                        }`}>
                          3
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 font-medium">Passo 3: Transmissão em Paralelo (Overlap)</h4>
                          <p className="text-[10px] text-slate-500">
                            {transitionBot.status === 'active'
                              ? 'Transmitindo áudio em ambas as salas por 5s para transição imperceptível...'
                              : 'Aguardando inicialização do fluxo de áudio...'}
                          </p>
                        </div>
                      </div>

                      {/* Passo 4: Limpeza do robô anterior */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-800 bg-slate-900 text-slate-600 text-[9px] font-bold">
                          4
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Passo 4: Finalização & Promoção</h4>
                          <p className="text-[10px] text-slate-500">Encerrando robô antigo de forma segura e liberando recursos.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={handleStopAll}
                    className="flex-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Desligar Tradutor
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                  <VolumeX className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-300">Nenhum robô tradutor ativo</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                  Cole o link de uma reunião do Meet abaixo ou ative a sincronização do Google Calendar.
                </p>
              </div>
            )}
          </div>

          {/* Card de Fila de Reuniões de Até 12 Slots */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h2 className="text-md font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                Fila de Reuniões Agendadas (Até 12 Slots)
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBulk(!showBulk)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  {showBulk ? 'Fechar Colagem' : 'Colar em Lote'}
                </button>
                <button 
                  onClick={handleResetQueue}
                  className="text-xs bg-rose-950/20 hover:bg-rose-950 text-rose-400 font-semibold px-3 py-1.5 rounded-lg border border-rose-500/10 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Interface de Colagem em Lote */}
            {showBulk && (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl mb-5 space-y-3">
                <p className="text-xs text-slate-400">
                  Cole múltiplos links do Google Meet abaixo (um por linha, limite de 12). Eles preencherão os slots automaticamente.
                </p>
                <textarea 
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`https://meet.google.com/aaa-bbbb-ccc\nhttps://meet.google.com/ddd-eeee-fff`}
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500 font-mono text-white"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowBulk(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleBulkPasteApply}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Aplicar Fila
                  </button>
                </div>
              </div>
            )}

            {/* Grade dos 12 Slots */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {queueSlots.map((slot, index) => {
                const isActive = index === activeQueueIndex;
                const isCompleted = index < activeQueueIndex && slot !== '';
                const isNext = index === activeQueueIndex + 1 || (activeQueueIndex === -1 && index === 0);
                
                let badgeClass = "bg-slate-800 text-slate-500 border border-slate-700";
                let badgeText = "Aguardando";
                
                if (isActive) {
                  badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse";
                  badgeText = "ATIVO";
                } else if (isCompleted) {
                  badgeClass = "bg-slate-950 text-slate-650 border border-slate-900";
                  badgeText = "Concluído";
                } else if (isNext && slot !== '') {
                  badgeClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                  badgeText = "PRÓXIMO";
                }

                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-slate-950/80 border-slate-900 hover:border-slate-850'
                    }`}
                  >
                    {/* Número do Slot */}
                    <span className={`text-xs font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>

                    {/* Campo de Input */}
                    <input 
                      type="text"
                      value={slot}
                      onChange={(e) => handleSlotChange(index, e.target.value)}
                      onBlur={() => handleSaveQueue(queueSlots)}
                      placeholder="Sem agendamento (vazio)"
                      className={`flex-1 bg-transparent border-none text-xs focus:outline-none placeholder:text-slate-700 font-medium ${
                        isCompleted ? 'line-through text-slate-550 font-normal' : 'text-slate-200'
                      }`}
                    />

                    {/* Badge de Status */}
                    {slot !== '' && (
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${badgeClass}`}>
                        {badgeText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ações de Avanço da Fila */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex gap-3">
              <button 
                onClick={handleAdvanceQueue}
                disabled={isQueueAdvancing}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-850 disabled:to-slate-850 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all duration-300"
              >
                {isQueueAdvancing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executando Hot-Swap Suave...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {activeQueueIndex === -1 ? 'Iniciar Reuniões da Fila' : 'Avançar Fila (Hot-Swap Suave)'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card de Controle Manual (Entrada de URL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-md font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Play className="w-5 h-5 text-blue-500" />
              Trocar Reunião Manualmente (Hot-Swap)
            </h2>
            <form onSubmit={handleStartBot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Link do Google Meet
                </label>
                <input 
                  type="text" 
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 text-white font-medium"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Buscando Sala no Meet...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    {activeBot ? 'Iniciar Hot-Swap Suave' : 'Iniciar Robô Tradutor'}
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* COLUNA DIREITA: Google Calendar e Terminal de Logs (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* VISUALIZADOR DE STATUS DE CONEXÃO DO TRANSMISSOR (BRAIN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  isTransmitterOnline 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                }`}>
                  <Radio className={`w-5.5 h-5.5 ${isTransmitterOnline ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Conexão do Transmissor (Brain)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Computador de Apresentação de Áudio</p>
                </div>
              </div>
              
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isTransmitterOnline 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse' 
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTransmitterOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                {isTransmitterOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* Mensagem explicativa */}
            <div className="mt-3.5 pt-3 border-t border-slate-850/60 flex items-start gap-2.5">
              <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isTransmitterOnline ? 'text-emerald-400' : 'text-amber-500 animate-pulse'}`} />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {isTransmitterOnline ? (
                  <>
                    <strong>Excelente!</strong> O computador transmissor da <strong>Brain</strong> está ativo e respondendo aos comandos de troca de sala em tempo real.
                  </>
                ) : (
                  <>
                    <strong>Atenção:</strong> O apresentador da <strong>Brain</strong> precisa abrir a página do transmissor para que as trocas de sala ocorram de forma integrada e automática no computador dele.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Card de Configuração da Conta do Robô (Wendt) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-md font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
                Conta do Robô Google Meet (Wendt)
              </h2>
              {wendtStatus.loggedIn ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Logado
                </span>
              ) : (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Desconectado
                </span>
              )}
            </div>
            <div className="space-y-4">
              {wendtStatus.loggedIn ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl">
                  <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Sessão de Login Efetiva!
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    A conta <strong>Wendt</strong> está autenticada no Google. O robô entrará automaticamente nas reuniões sem exigir que você clique em admitir.
                  </p>
                  {wendtStatus.email && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Conta Google:</span>
                      <span className="text-[10px] text-blue-400 font-mono font-semibold bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded block truncate max-w-[200px]">
                        {wendtStatus.email}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para que o robô entre automaticamente nas reuniões do Google Meet sem que o host (Brain) precise aceitar manual, faça o login da conta <strong>Wendt</strong> uma única vez.
                </p>
              )}

              <button 
                onClick={handleLoginWendt}
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Abrindo Navegador de Login...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {wendtStatus.loggedIn ? 'Reconectar / Trocar Conta Google (Wendt)' : 'Fazer Login no Google (Wendt)'}
                  </>
                )}
              </button>

              {isLoggingIn && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl">
                  <p className="text-[11px] text-blue-400 font-semibold mb-1">💡 Instruções:</p>
                  <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-1">
                    <li>Uma janela segura do navegador se abrirá.</li>
                    <li>Digite o e-mail e senha da conta <strong>Wendt</strong>.</li>
                    <li>Complete as verificações de duas etapas se necessário.</li>
                    <li>Após concluir o login, <strong>feche a janela do navegador</strong> para registrar a sessão!</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Card de Automação com Google Calendar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-md font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                Google Calendar Sync
              </h2>
              {calendar.connected ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Ausente
                </span>
              )}
            </div>

            {/* Conteúdo Calendar */}
            {calendar.connected ? (
              <div className="space-y-4">
                
                {/* Switch de Auto-Sync elegante */}
                <div className="flex items-center justify-between bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Sincronização Automática</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Troca de bot programada por eventos</p>
                  </div>
                  <button 
                    onClick={handleToggleAutoSync}
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center ${
                      calendar.autoSync ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300" />
                  </button>
                </div>

                {/* Forçar verificação agora */}
                <button 
                  onClick={handleSyncCalendarNow}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sincronizar Calendário Agora
                </button>

                {/* Próximas Reuniões */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Próximos Eventos do Dia</h3>
                  
                  {calendar.upcoming && calendar.upcoming.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {calendar.upcoming.map((ev) => (
                        <div 
                          key={ev.id} 
                          className={`p-3 rounded-xl border transition-all text-left ${
                            ev.isActive 
                              ? 'bg-blue-500/10 border-blue-500/30' 
                              : 'bg-slate-950/80 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold truncate max-w-[170px]">{ev.summary}</span>
                            <span className="text-[9px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono font-medium whitespace-nowrap text-slate-400">
                              {formatTime(ev.start)} - {formatTime(ev.end)}
                            </span>
                          </div>
                          {ev.meetLink && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-blue-400 font-mono truncate max-w-[180px]">{ev.meetLink}</span>
                              {ev.isActive && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ativo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 text-center py-4">Nenhum evento do Meet agendado hoje.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-300">Conexão Necessária</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[260px] mb-4">
                  Sincronize sua conta Google Calendar para permitir que o bot detecte reuniões ativas e efetue as trocas de forma 100% autônoma.
                </p>
                <button 
                  onClick={handleOAuthConnect}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/10"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Conectar Conta Google
                </button>
              </div>
            )}
          </div>

          {/* Card: Guia de Entrada Automática (Sem 'Pedir para Entrar') */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-left focus:outline-none"
            >
              <h2 className="text-md font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-500 animate-pulse" />
                Guia: Entrada Sem "Pedir para Entrar"
              </h2>
              <span className={`text-xs text-blue-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 transition-all ${showGuide ? 'rotate-180 bg-blue-600/10 border-blue-500/20' : ''}`}>
                {showGuide ? 'Fechar' : 'Abrir Guia'}
              </span>
            </button>

            {showGuide && (
              <div className="mt-5 space-y-4 border-t border-slate-800/65 pt-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para que o robô <strong className="text-blue-400">Wendt</strong> consiga entrar nas reuniões criadas pela <strong className="text-emerald-400">Brain</strong> de forma instantânea (sem que o host precise clicar em "Admitir" para cada participante), siga os passos abaixo:
                </p>

                <div className="space-y-3">
                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex gap-3">
                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Criar o Evento na Agenda da Brain</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Acesse o <strong>Google Agenda</strong> da conta host (<strong>Brain</strong>) e crie um novo evento com videoconferência do Google Meet ativa.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex gap-3">
                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Adicionar Wendt como Convidado</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        No campo <strong>"Adicionar convidados"</strong> do evento, digite o e-mail da conta do robô receptora:
                        <span className="block mt-2 font-mono text-[10px] text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded font-semibold select-all text-center">
                          {wendtStatus.email || 'wendt.meet@gmail.com'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex gap-3">
                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Salvar & Enviar Convite</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Clique em <strong>Salvar</strong> e confirme o envio do convite por e-mail. Isso vincula a conta da Wendt diretamente à sala, ativando a permissão nativa de admissão direta do Google Workspace.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-left">
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Por que isso funciona?
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    O Google Meet reconhece convidados listados no convite oficial da agenda como participantes confiáveis. Ao fazer isso, o robô ganha passe livre e contorna qualquer barreira ou solicitação de entrada.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal de Logs do Sistema em Tempo Real */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-md font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Terminal className="w-5 h-5 text-blue-500" />
              Logs do Orquestrador
            </h2>
            <div 
              ref={logTerminalRef}
              className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex-1 font-mono text-[11px] text-slate-400 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  let logColor = 'text-slate-400';
                  if (log.includes('✅') || log.includes('sucesso') || log.includes('completa!')) logColor = 'text-emerald-400 font-semibold';
                  else if (log.includes('❌') || log.includes('Falha') || log.includes('Erro')) logColor = 'text-rose-400 font-semibold';
                  else if (log.includes('🔄') || log.includes('swap') || log.includes('transição')) logColor = 'text-amber-400';
                  
                  return (
                    <div key={index} className={`leading-relaxed border-b border-slate-900/50 pb-1 ${logColor}`}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-600 text-center py-12">Aguardando eventos do sistema...</div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 mt-6 bg-slate-900/10">
        <p>© 2026 BrainLingo Translator Agent Team. Todos os direitos reservados.</p>
      </footer>

      {/* Modal Interativo de Acompanhamento do Login do Robô (Wendt) */}
      {isWaitingForLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
            {/* Efeito de luz sutil ao fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {!wendtStatus.loggedIn ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 relative">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 animate-pulse pointer-events-none" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">Conectando ao Google...</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Uma janela segura do navegador Chrome foi aberta na sua tela.<br />
                  Por favor, realize o login na conta do Google <strong>Wendt</strong> nela.
                </p>

                <div className="w-full bg-slate-950/60 border border-slate-800 p-4 rounded-2xl text-left mb-6 space-y-2.5">
                  <p className="text-[11px] text-blue-400 font-semibold mb-1">💡 Próximos passos na janela externa:</p>
                  <div className="flex items-start gap-2 text-[10px] text-slate-400">
                    <span className="text-blue-500 font-bold">1.</span>
                    <span>Digite o e-mail e senha da conta <strong>Wendt</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[10px] text-slate-400">
                    <span className="text-blue-500 font-bold">2.</span>
                    <span>Conclua qualquer verificação de duas etapas exigida.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[10px] text-slate-400">
                    <span className="text-blue-500 font-bold">3.</span>
                    <span className="text-slate-200">Deixe essa tela aberta! Ela atualizará automaticamente assim que logar.</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsWaitingForLogin(false)}
                  className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl text-xs transition-colors border border-slate-700"
                >
                  Cancelar / Fechar
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 relative">
                  <CheckCircle2 className="w-8 h-8 scale-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping pointer-events-none" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">🎉 Login Efetivo com Sucesso!</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  A conta <strong>Wendt</strong> está conectada de forma ativa no Google Meet e pronta para operar de forma 100% autônoma!
                </p>

                {wendtStatus.email && (
                  <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl mb-6">
                    <span className="text-[10px] text-slate-500 block font-medium uppercase tracking-wider mb-0.5">E-mail Conectado</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">{wendtStatus.email}</span>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-6 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300 leading-relaxed">
                    <strong>Importante:</strong> Você já pode fechar a janela externa do navegador Chrome que abriu anteriormente para fazer o login.
                  </p>
                </div>

                <button
                  onClick={() => setIsWaitingForLogin(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10"
                >
                  Tudo Certo, Concluir!
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
// ---------------------------------------------------------
// COMPONENTE: TRANSMITTER DASHBOARD (PAINEL DO TRANSMISSOR - BRAIN)
// ---------------------------------------------------------
function TransmitterDashboard() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  
  const [activeBot, setActiveBot] = useState<BotInstanceStatus | null>(null);
  const [transitionBot, setTransitionBot] = useState<BotInstanceStatus | null>(null);
  const [isReceiverOnline, setIsReceiverOnline] = useState<boolean>(false);
  
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [activeMeetingName, setActiveMeetingName] = useState<string>('Nenhuma');
  const [meetingSource, setMeetingSource] = useState<'queue' | 'calendar' | 'manual'>('manual');
  
  const [logs, setLogs] = useState<string[]>([]);
  
  // Fila de Reuniões e Controles
  const [queueSlots, setQueueSlots] = useState<string[]>(Array(12).fill(''));
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(-1);
  const [bulkText, setBulkText] = useState<string>('');
  const [showBulk, setShowBulk] = useState<boolean>(true);
  const [isQueueAdvancing, setIsQueueAdvancing] = useState<boolean>(false);
  
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(30);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);
  const [activeSlotStartTime, setActiveSlotStartTime] = useState<string | null>(null);
  const [openLocalBrowserEnabled, setOpenLocalBrowserEnabled] = useState<boolean>(true);

  // Sincronização de Calendário
  const [calendar, setCalendar] = useState<CalendarStatus>({
    connected: false,
    autoSync: false,
    upcoming: []
  });
  
  
  
  const meetWindowRef = useRef<Window | null>(null);
  const lastOpenedUrlRef = useRef<string>('');
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const addTransmitterLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logLine = `[${timestamp}] ${msg}`;
    setLogs(prev => [logLine, ...prev].slice(0, 50));
  };

  useEffect(() => {
    addTransmitterLog('Painel do Transmissor Inicializado.');
    addTransmitterLog('Aguardando ativação da automação de troca...');
  }, []);

  // Efeito local para o contador regressivo de segundos em 1Hz (atualização suave)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sintetizador de Chime com Web Audio API para não necessitar de arquivos externos
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Nota 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.8);
      
      // Nota 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 1.0);
    } catch (e) {
      console.warn('Erro ao tocar chime:', e);
    }
  };

  // Loop de polling do status que envia heartbeat e puxa fila/calendário
  useEffect(() => {
    let interval: any = null;

    const pollStatus = async () => {
      try {
        // Envia heartbeat avisando que o Transmissor está online e ativo
        const res = await fetch('/api/bot/status?role=transmitter');
        const data = await res.json();
        setServerConnected(true);
        setActiveBot(data.activeBot);
        setTransitionBot(data.transitionBot);
        setIsReceiverOnline(data.isReceiverOnline ?? false);
        setSecondsLeft(data.secondsLeft ?? 0);
        setActiveMeetingName(data.activeMeetingName ?? 'Nenhuma');
        setMeetingSource(data.source ?? 'manual');

        // Puxa fila
        const resQueue = await fetch('/api/queue');
        const dataQueue = await resQueue.json();
        setQueueSlots(dataQueue.slots);
        setActiveQueueIndex(dataQueue.activeSlotIndex);
        setSlotDurationMinutes(dataQueue.slotDurationMinutes ?? 30);
        setAutoAdvanceEnabled(dataQueue.autoAdvanceEnabled ?? false);
        setActiveSlotStartTime(dataQueue.activeSlotStartTime ?? null);
        setOpenLocalBrowserEnabled(dataQueue.openLocalBrowserEnabled ?? true);

        // Puxa calendário
        const resCal = await fetch('/api/calendar/status');
        const dataCal = await resCal.json();
        setCalendar(dataCal);

        // URL da reunião atual no orquestrador
        const targetUrl = (data.transitionBot && data.transitionBot.meetUrl) || (data.activeBot && data.activeBot.meetUrl);

        if (isActive && targetUrl && targetUrl.includes('meet.google.com')) {
          if (targetUrl !== lastOpenedUrlRef.current) {
            addTransmitterLog(`Nova reunião ativa detectada: ${targetUrl}`);
            lastOpenedUrlRef.current = targetUrl;
            
            // Executa o aviso sonoro elegante
            playChime();

            // Gerencia a janela
            if (meetWindowRef.current && !meetWindowRef.current.closed) {
              addTransmitterLog('Redirecionando aba ativa para a nova sala...');
              meetWindowRef.current.location.href = targetUrl;
              meetWindowRef.current.focus();
            } else {
              addTransmitterLog('Abrindo aba do Google Meet...');
              meetWindowRef.current = window.open(targetUrl, 'BrainLingoMeetWindow');
              if (meetWindowRef.current) {
                meetWindowRef.current.focus();
              } else {
                addTransmitterLog('⚠️ ALERTA: Bloqueador de pop-ups ativado! Permita pop-ups nesta página.');
              }
            }
          }
        }
      } catch (err) {
        setServerConnected(false);
      }
    };

    pollStatus();
    interval = setInterval(pollStatus, 2500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Handlers Fila & Cronômetro
  const handleSaveQueue = async (updatedSlots: string[]) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: updatedSlots })
      });
      const data = await res.json();
      setQueueSlots(data.slots);
      setActiveQueueIndex(data.activeSlotIndex);
    } catch (e) {
      console.error('Erro ao salvar a fila:', e);
    }
  };

  const handleSlotChange = (index: number, val: string) => {
    const updated = [...queueSlots];
    updated[index] = val;
    setQueueSlots(updated);
  };

  const handleAdvanceQueue = async () => {
    setIsQueueAdvancing(true);
    try {
      const res = await fetch('/api/queue/next', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setActiveQueueIndex(data.queue.activeSlotIndex);
        setQueueSlots(data.queue.slots);
        addTransmitterLog(`Avanço de fila solicitado.`);
      }
    } catch (e) {
      alert('Erro ao avançar a fila ou há uma troca já rodando.');
    } finally {
      setIsQueueAdvancing(false);
    }
  };

  const handleResetQueue = async () => {
    if (!confirm('Deseja limpar todos os 12 slots da fila?')) return;
    try {
      const res = await fetch('/api/queue/reset', { method: 'POST' });
      const data = await res.json();
      setQueueSlots(data.slots);
      setActiveQueueIndex(data.activeSlotIndex);
      setBulkText('');
      addTransmitterLog('Fila de reuniões limpa pelo transmissor.');
    } catch (e) {
      alert('Erro ao resetar a fila.');
    }
  };

  const handleBulkPasteApply = () => {
    const lines = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    const newSlots = Array(12).fill('');
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      newSlots[i] = lines[i];
    }
    
    setQueueSlots(newSlots);
    setShowBulk(false);
    handleSaveQueue(newSlots);
    addTransmitterLog('Fila importada via colagem em lote.');
  };

  const handleToggleAutoAdvance = async () => {
    try {
      const updatedAutoAdvance = !autoAdvanceEnabled;
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAdvanceEnabled: updatedAutoAdvance })
      });
      const data = await res.json();
      setAutoAdvanceEnabled(data.autoAdvanceEnabled);
    } catch (e) {
      alert('Erro ao alternar o auto-avanço.');
    }
  };

  const handleToggleOpenLocalBrowser = async () => {
    try {
      const updatedVal = !openLocalBrowserEnabled;
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openLocalBrowserEnabled: updatedVal })
      });
      const data = await res.json();
      setOpenLocalBrowserEnabled(data.openLocalBrowserEnabled ?? true);
    } catch (e) {
      alert('Erro ao alternar abertura do navegador.');
    }
  };

  const handleChangeDuration = async (minutes: number) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotDurationMinutes: minutes })
      });
      const data = await res.json();
      setSlotDurationMinutes(data.slotDurationMinutes);
    } catch (e) {
      alert('Erro ao alterar a duração das reuniões.');
    }
  };

  // Handlers do Calendário
  const handleToggleAutoSync = async () => {
    try {
      const res = await fetch('/api/calendar/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !calendar.autoSync })
      });
      const data = await res.json();
      setCalendar(prev => ({ ...prev, autoSync: data.autoSync }));
      addTransmitterLog(`Auto-Sincronização do calendário: ${data.autoSync ? 'ATIVADA' : 'DESATIVADA'}`);
    } catch (err) {
      alert('Erro ao alternar sincronização.');
    }
  };

  const handleSyncCalendarNow = async () => {
    try {
      const res = await fetch('/api/calendar/sync-now', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(data.activeMeetUrl 
          ? `Sincronização completa! Nova reunião ativa disparada: ${data.activeMeetUrl}`
          : 'Calendário sincronizado. Nenhuma nova reunião ativa agendada para este momento.'
        );
        addTransmitterLog('Verificação manual de calendário executada.');
      }
    } catch (err) {
      alert('Erro ao sincronizar calendário.');
    }
  };



  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const handleToggleAutomation = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    if (nextState) {
      addTransmitterLog('🔌 Automação de Troca ATIVADA.');
      
      const currentActiveUrl = (transitionBot && transitionBot.meetUrl) || (activeBot && activeBot.meetUrl);
      if (currentActiveUrl) {
        lastOpenedUrlRef.current = '';
      }
    } else {
      addTransmitterLog('🔌 Automação de Troca DESATIVADA.');
    }
  };

  const handleManualOpen = () => {
    const currentActiveUrl = (transitionBot && transitionBot.meetUrl) || (activeBot && activeBot.meetUrl);
    if (!currentActiveUrl) {
      alert('Nenhuma reunião ativa no momento.');
      return;
    }
    
    addTransmitterLog('Abertura manual da sala iniciada pelo usuário.');
    playChime();
    
    if (meetWindowRef.current && !meetWindowRef.current.closed) {
      meetWindowRef.current.location.href = currentActiveUrl;
      meetWindowRef.current.focus();
    } else {
      meetWindowRef.current = window.open(currentActiveUrl, 'BrainLingoMeetWindow');
      if (meetWindowRef.current) meetWindowRef.current.focus();
    }
  };

  
  const currentUrl = (transitionBot && transitionBot.meetUrl) || (activeBot && activeBot.meetUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">BrainLingo</h1>
            <p className="text-xs text-slate-500 font-medium font-semibold">PAINEL DO TRANSMISSOR (BRAIN) - APRESENTAÇÃO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <span className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            serverConnected 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)] animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverConnected ? 'bg-blue-400 animate-pulse' : 'bg-rose-450'}`} />
            {serverConnected ? 'Conexão VPS: OK' : 'Conexão VPS: FALHA'}
          </span>
          <span className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            isReceiverOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
              : 'bg-slate-800 text-slate-500 border-slate-750'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isReceiverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-650'}`} />
            {isReceiverOnline ? 'Robô Receptor: ONLINE' : 'Robô Receptor: OFFLINE'}
          </span>
          <span className="text-xs text-indigo-400 flex items-center gap-1.5 bg-indigo-950 border border-indigo-900 px-3 py-1.5 rounded-lg font-bold">
            <Settings className="w-3.5 h-3.5" />
            Modo Transmissor (Brain)
          </span>
          <button 
            onClick={() => window.location.href = '/?admin=true'}
            className="text-xs bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white font-bold px-4 py-2 rounded-lg transition-colors border border-blue-500/25 flex items-center gap-1"
          >
            ⚙️ Painel Receptor (Admin)
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-700 hover:text-white"
          >
            Visualizar Aluno
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl w-full mx-auto">
        
        {/* COLUNA ESQUERDA: Automação e Controle Fila (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card de Controle Principal */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-md font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Controle de Troca Automática da Sala
              </h2>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse' 
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {isActive ? 'Automação Ativa' : 'Parada'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-6">
              {/* Cronômetro */}
              <div className="md:col-span-5 bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none scale-150" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tempo do Slot</span>
                <div className="text-3xl font-extrabold font-mono tracking-wider text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                  {secondsLeft > 0 ? (
                    <>
                      {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                    </>
                  ) : '00:00'}
                </div>
                <span className="text-[9px] text-slate-500 font-semibold mt-2">
                  Origem: {meetingSource === 'queue' ? 'Fila de Reuniões' : meetingSource === 'calendar' ? 'Calendário' : 'Manual'}
                </span>
                {activeSlotStartTime && secondsLeft > 0 && (
                  <span className="text-[9px] text-slate-500 font-semibold mt-1">
                    Iniciado às: {new Date(activeSlotStartTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Status da Reunião */}
              <div className="md:col-span-7 space-y-3.5">
                <div className="bg-slate-950/60 border border-slate-850/60 p-4 rounded-xl space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-550 font-medium">Reunião Ativa:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[200px]">{activeMeetingName}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-slate-550 text-[10px] uppercase font-bold">Link da Reunião:</span>
                    {currentUrl ? (
                      <a 
                        href={currentUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 break-all"
                      >
                        {currentUrl}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Nenhum link ativo no momento</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleToggleAutomation}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/10'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/10'
                }`}
              >
                <Radio className={`w-4.5 h-4.5 ${isActive ? 'animate-pulse' : ''}`} />
                {isActive ? 'Parar Automação de Troca' : 'Iniciar Automação de Troca'}
              </button>
              
              <button
                onClick={handleManualOpen}
                disabled={!currentUrl}
                className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 disabled:text-slate-600 font-bold px-5 py-3.5 rounded-xl text-sm border border-slate-700 disabled:border-slate-850 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Sala Manualmente
              </button>
            </div>

          </div>

          {/* NOVO: Fila de Reuniões de Até 12 Slots no Painel do Transmissor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h2 className="text-md font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                Fila de Reuniões Agendadas (Até 12 Slots)
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBulk(!showBulk)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  {showBulk ? 'Fechar Colagem' : 'Colar em Lote'}
                </button>
                <button 
                  onClick={handleResetQueue}
                  className="text-xs bg-rose-950/20 hover:bg-rose-950 text-rose-400 font-semibold px-3 py-1.5 rounded-lg border border-rose-500/10 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Interface de Colagem em Lote */}
            {showBulk && (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl mb-5 space-y-3">
                <p className="text-xs text-slate-400">
                  Cole múltiplos links do Google Meet abaixo (um por linha, limite de 12). Eles preencherão os slots automaticamente.
                </p>
                <textarea 
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`https://meet.google.com/aaa-bbbb-ccc\nhttps://meet.google.com/ddd-eeee-fff`}
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs focus:outline-none focus:border-indigo-500 font-mono text-white"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowBulk(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleBulkPasteApply}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Aplicar Fila
                  </button>
                </div>
              </div>
            )}

            {/* Grade dos 12 Slots */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {queueSlots.map((slot, index) => {
                const isActive = index === activeQueueIndex;
                const isCompleted = index < activeQueueIndex && slot !== '';
                const isNext = index === activeQueueIndex + 1 || (activeQueueIndex === -1 && index === 0);
                
                let badgeClass = "bg-slate-800 text-slate-500 border border-slate-700";
                let badgeText = "Aguardando";
                
                if (isActive) {
                  badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse";
                  badgeText = "ATIVO";
                } else if (isCompleted) {
                  badgeClass = "bg-slate-950 text-slate-650 border border-slate-900";
                  badgeText = "Concluído";
                } else if (isNext && slot !== '') {
                  badgeClass = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                  badgeText = "PRÓXIMO";
                }

                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-slate-950/80 border-slate-900 hover:border-slate-850'
                    }`}
                  >
                    <span className={`text-xs font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>

                    <input 
                      type="text" 
                      value={slot}
                      onChange={(e) => handleSlotChange(index, e.target.value)}
                      onBlur={() => handleSaveQueue(queueSlots)}
                      placeholder="Sem agendamento (vazio)"
                      className={`flex-1 bg-transparent border-none text-xs focus:outline-none placeholder:text-slate-700 font-medium ${
                        isCompleted ? 'line-through text-slate-550 font-normal' : 'text-slate-200'
                      }`}
                    />

                    {slot !== '' && (
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${badgeClass}`}>
                        {badgeText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* NOVO: Configurações da Fila para o Apresentador */}
            <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Duração do Slot da Fila
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => handleChangeDuration(dur)}
                      className={`text-xs py-1.5 rounded-lg border font-bold transition-all ${
                        slotDurationMinutes === dur
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/80 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {/* Toggle de Auto-Avanço */}
                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 border border-slate-850/60 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200 font-medium">Troca Automática ao Zerar</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Avança e faz Hot-Swap ao zerar</p>
                  </div>
                  <button
                    onClick={handleToggleAutoAdvance}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center ${
                      autoAdvanceEnabled ? 'bg-indigo-650 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300" />
                  </button>
                </div>

                {/* Toggle de Abertura Local do Navegador */}
                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 border border-slate-850/60 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200 font-medium">Navegador Local no Receptor</p>
                    <p className="text-[9px] text-slate-550 mt-0.5">Abre o Meet no Chrome do receptor</p>
                  </div>
                  <button
                    onClick={handleToggleOpenLocalBrowser}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center ${
                      openLocalBrowserEnabled ? 'bg-indigo-650 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ações de Avanço da Fila */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex gap-3">
              <button 
                onClick={handleAdvanceQueue}
                disabled={isQueueAdvancing}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-850 disabled:to-slate-850 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 transition-all duration-300"
              >
                {isQueueAdvancing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executando Hot-Swap Suave...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {activeQueueIndex === -1 ? 'Iniciar Reuniões da Fila' : 'Avançar Fila (Hot-Swap Suave)'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: Google Calendar e Logs (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* VISUALIZADOR DE STATUS DE CONEXÃO DO ROBÔ RECEPTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  isReceiverOnline 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                }`}>
                  <Radio className={`w-5.5 h-5.5 ${isReceiverOnline ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Conexão do Robô Receptor
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Conta Google do Robô Tradutor Headless</p>
                </div>
              </div>
              
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isReceiverOnline 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse' 
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isReceiverOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                {isReceiverOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* Mensagem explicativa */}
            <div className="mt-3.5 pt-3 border-t border-slate-850/60 flex items-start gap-2.5">
              <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isReceiverOnline ? 'text-emerald-400' : 'text-amber-500 animate-pulse'}`} />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {isReceiverOnline ? (
                  <>
                    <strong>Robô Ativo!</strong> A automação do receptor headless está conectada à sala e transmitindo o áudio da tradução aos alunos.
                  </>
                ) : (
                  <>
                    <strong>Robô Ausente:</strong> O robô receptor não está em nenhuma reunião. Inicie a automação pelo painel do administrador para habilitar a escuta dos alunos.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* VERIFICADOR DE CONTA GOOGLE (APRESENTADOR - BRAIN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              Sua Conta Google Meet (Apresentador)
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              O transmissor abre as reuniões diretamente no seu navegador Chrome atual. É essencial estar logado com a conta da <strong>Brain</strong> para entrar nas reuniões como apresentador oficial.
            </p>

            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status Local do Navegador:</span>
                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Chrome Ativo
                </span>
              </div>
              
              <div className="flex items-start gap-2.5 pt-2.5 border-t border-slate-900">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 animate-pulse" />
                <p className="text-[10px] text-slate-450 leading-relaxed">
                  Para conferir qual conta está logada neste momento, clique no botão abaixo para abrir a página do Google em uma nova aba e certifique-se de que é a conta <strong>Brain</strong>.
                </p>
              </div>

              <a 
                href="https://myaccount.google.com/" 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-indigo-450 hover:text-indigo-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Verificar Minha Conta Google Atual 🔎
              </a>
            </div>
          </div>

          {/* NOVO: Card de Automação com Google Calendar no Painel do Transmissor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-md font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                Google Calendar Sync
              </h2>
              {calendar.connected ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Ausente
                </span>
              )}
            </div>

            {calendar.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-3.5 border border-slate-850 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Sincronização Automática</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Troca de bot programada por eventos</p>
                  </div>
                  <button 
                    onClick={handleToggleAutoSync}
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center ${
                      calendar.autoSync ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300" />
                  </button>
                </div>

                <button 
                  onClick={handleSyncCalendarNow}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sincronizar Calendário Agora
                </button>

                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Próximos Eventos do Dia</h3>
                  {calendar.upcoming && calendar.upcoming.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {calendar.upcoming.map((ev) => (
                        <div 
                          key={ev.id} 
                          className={`p-3 rounded-xl border transition-all text-left ${
                            ev.isActive 
                              ? 'bg-indigo-500/10 border-indigo-500/30' 
                              : 'bg-slate-950/80 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold truncate max-w-[170px]">{ev.summary}</span>
                            <span className="text-[9px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono font-medium whitespace-nowrap text-slate-400">
                              {formatTime(ev.start)} - {formatTime(ev.end)}
                            </span>
                          </div>
                          {ev.meetLink && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-indigo-450 font-mono truncate max-w-[180px]">{ev.meetLink}</span>
                              {ev.isActive && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ativo
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-650 text-center py-4">Nenhum evento do Meet agendado hoje.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-500 mb-3">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400">Sincronização Indisponível</p>
                <p className="text-[11px] text-slate-500 mt-1.5 max-w-[260px] leading-relaxed">
                  A agenda de reuniões do Google Calendar está desconectada. Caso queira usar o auto-sincronismo, configure o acesso à conta no Painel Administrativo.
                </p>
              </div>
            )}
          </div>

          {/* Guia de Configuração e Preparação */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h2 className="text-md font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-5 h-5 text-indigo-400 animate-pulse" />
              Preparação Importante para o Transmissor
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Como este computador representa a conta <strong>Brain (Transmissora)</strong>, é crucial garantir que as permissões de microfone e contas estejam alinhadas para que o áudio seja transmitido com perfeição:
            </p>

            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex gap-3">
                <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Faça login com a conta da Brain no Chrome</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Antes de iniciar, certifique-se de que a aba do seu navegador Chrome principal está conectada à conta oficial da <strong>Brain</strong>. Isso impede que o Meet pergunte qual e-mail usar.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex gap-3">
                <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Ajuste e Fixe o Áudio Padrão no Chrome</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Entre em uma reunião qualquer uma vez e configure a entrada de áudio (microfone ou placa virtual de captura) desejada. O Chrome **memoriza e trava** esse dispositivo para todas as próximas reuniões abertas no domínio do Meet!
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex gap-3">
                <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Desative Bloqueadores de Pop-up</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Certifique-se de dar permissão para que este painel abra pop-ups. A primeira janela é aberta no seu clique em <strong>Iniciar Automação</strong>, e as trocas seguintes apenas mudam o site da aba aberta!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal de Logs da Automação (5/12) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-[300px] text-left">
            <h2 className="text-md font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Terminal className="w-5 h-5 text-indigo-400" />
              Eventos da Automação do Transmissor
            </h2>
            
            <div 
              ref={logTerminalRef}
              className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex-1 font-mono text-[11px] text-slate-400 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  let logColor = 'text-slate-400';
                  if (log.includes('Nova sala') || log.includes('detectada:')) logColor = 'text-indigo-400 font-semibold';
                  else if (log.includes('Redirecionando') || log.includes('Abrindo')) logColor = 'text-emerald-400 font-semibold';
                  else if (log.includes('⚠️') || log.includes('❌') || log.includes('ERRO')) logColor = 'text-rose-400 font-semibold';
                  else if (log.includes('ATIVADA') || log.includes('DESATIVADA')) logColor = 'text-amber-400';
                  
                  return (
                    <div key={index} className={`leading-relaxed border-b border-slate-900/50 pb-1 ${logColor}`}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-600 text-center py-12">Nenhum evento registrado ainda...</div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 mt-6 bg-slate-900/10">
        <p>© 2026 BrainLingo Translator Agent Team. Todos os direitos reservados.</p>
      </footer>

    </div>
  );
}
