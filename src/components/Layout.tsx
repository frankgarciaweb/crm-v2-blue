import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDolar } from '@/hooks/useSupabase';

interface NavItem {
  label: string;
  path: string;
  icon: string; // Material Symbol name
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     path: '/',             icon: 'dashboard' },
  { label: 'Clientes',      path: '/clientes',     icon: 'group' },
  { label: 'Productos',     path: '/productos',    icon: 'inventory_2' },
  { label: 'Inventario',    path: '/inventario',   icon: 'warehouse' },
  { label: 'Pedidos',       path: '/pedidos',      icon: 'description' },
  { label: 'Archivos',      path: '/archivos',     icon: 'folder_open' },
  { label: 'Trabajos',      path: '/trabajos',     icon: 'precision_manufacturing' },
  { label: 'Plotter',       path: '/plotter',      icon: 'print' },
  { label: 'Finanzas',      path: '/finanzas',     icon: 'payments' },
  { label: 'Proveedores',   path: '/proveedores',  icon: 'local_shipping' },
  { label: 'Cotizaciones',  path: '/cotizaciones', icon: 'request_quote' },
  { label: 'Configuración', path: '/configuracion',icon: 'settings' },
];

const N8N_WEBHOOK = 'https://n8n.biombos.cl/webhook/6c78c334-8c9d-4760-8039-f753a8844eaa';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: dolar } = useDolar();

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendChatMessage() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      const botText = data.response || data.output || data.message || JSON.stringify(data);
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error al conectar con el asistente.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0b1326', color: '#dae2fd' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r py-4 transition-transform duration-300 lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          width: '280px',
          backgroundColor: '#0B1120',
          borderColor: 'rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="px-6 mb-8">
          <h1 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.02em', margin: 0 }}>
            Blue CRM
          </h1>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Industrial Precision
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 mb-0.5 transition-all duration-150 active:scale-[0.98]',
                  isActive
                    ? 'border-r-2 font-bold'
                    : 'font-medium'
                )
              }
              style={({ isActive }) => ({
                borderRadius: '0.125rem',
                color: isActive ? '#b4c5ff' : '#c3c6d7',
                backgroundColor: isActive ? 'rgba(37,99,235,0.10)' : 'transparent',
                borderRightColor: isActive ? '#b4c5ff' : 'transparent',
                borderRightWidth: '2px',
                borderRightStyle: 'solid',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.classList.contains('border-r-2') || el.style.borderRightColor !== '#b4c5ff') {
                  el.style.backgroundColor = '#222a3d';
                  el.style.color = '#dae2fd';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'transparent';
                  el.style.color = '#c3c6d7';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* CTA bottom */}
        <div className="px-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '1rem' }}>
          <button
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: '#eeefff',
              fontWeight: 700,
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Nueva Cotización
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between sticky top-0 z-40"
          style={{
            height: '64px',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
            backgroundColor: 'rgba(11,19,38,0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Left: hamburger + search */}
          <div className="flex items-center gap-6">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              style={{ color: '#c3c6d7', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
            </button>
            <div className="hidden lg:flex items-center gap-3" style={{ color: '#b4c5ff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              <input
                placeholder="Buscar pedidos, clientes, stock..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#dae2fd',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  width: '240px',
                }}
              />
            </div>
          </div>

          {/* Right: tasas + user */}
          <div className="flex items-center gap-4">
            {dolar && (
              <div className="hidden sm:flex items-center gap-4" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#c3c6d7' }}>
                <span>
                  $ Dólar:{' '}
                  <span style={{ color: '#b4c5ff', fontWeight: 700 }}>
                    {dolar.valor?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </span>
                </span>
                <span style={{ color: '#434655' }}>|</span>
                <span>
                  Binance:{' '}
                  <span style={{ color: '#4edea3', fontWeight: 700 }}>
                    {dolar.binace?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </span>
                </span>
              </div>
            )}
            <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div className="text-right hidden sm:block">
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>Admin Blue</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>DIRECTOR</p>
            </div>
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.08)', color: '#eeefff', fontWeight: 700, fontSize: '14px',
                fontFamily: 'Geist, sans-serif',
              }}
            >
              AB
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto animate-fade-in"
          style={{ padding: '1.5rem' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Chat IA Panel */}
      {chatOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden shadow-2xl"
          style={{
            width: '320px', height: '400px',
            backgroundColor: '#0B1120',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.5rem',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: '14px', color: '#b4c5ff' }}>
              Asistente IA
            </span>
            <button
              onClick={() => setChatOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', marginTop: '2rem', fontFamily: 'Inter, sans-serif' }}>
                Escribe un mensaje para empezar...
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', fontSize: '13px', borderRadius: '0.25rem',
                  fontFamily: 'Inter, sans-serif',
                  backgroundColor: msg.role === 'user' ? '#2563eb' : '#222a3d',
                  color: msg.role === 'user' ? '#eeefff' : '#dae2fd',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '0.25rem', backgroundColor: '#222a3d', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                  Escribiendo...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px', display: 'flex', gap: '8px' }}>
            <input
              placeholder="Escribe un mensaje..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              disabled={chatLoading}
              style={{
                flex: 1, padding: '8px 12px', fontSize: '13px',
                backgroundColor: '#131b2e', border: '1px solid #434655', borderRadius: '0.125rem',
                color: '#dae2fd', fontFamily: 'Inter, sans-serif', outline: 'none',
              }}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '8px', backgroundColor: '#2563eb', color: '#eeefff',
                border: 'none', borderRadius: '0.125rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        title={chatOpen ? 'Cerrar Chat' : 'Chat IA'}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: '#2563eb', color: '#eeefff', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
          {chatOpen ? 'close' : 'chat'}
        </span>
      </button>
    </div>
  );
}
