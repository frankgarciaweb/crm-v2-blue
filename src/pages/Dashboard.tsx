import { useState } from 'react';
import { usePedidos, useTrabajos, useTintas, useMateriales, useProductos, useMaquinas, useMovimientosCaja } from '@/hooks/useSupabase';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MARGEN_SEGURIDAD = 0.07;

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'Producción',
  completado: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente:  '#64748B',
  en_proceso: '#3B82F6',
  completado: '#10B981',
  entregado:  '#10B981',
  cancelado:  '#EF4444',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: '#EF4444',
  alta:    '#ffb95f',
  normal:  '#3B82F6',
  baja:    '#8d90a0',
};

export default function Dashboard() {
  const { data: pedidos,    isLoading: loadingPedidos }   = usePedidos();
  const { data: trabajos,   isLoading: loadingTrabajos }  = useTrabajos();
  const { data: tintas,     isLoading: loadingTintas }    = useTintas();
  const { data: materiales, isLoading: loadingMateriales } = useMateriales();
  const { data: productos }   = useProductos();
  const { data: maquinas }    = useMaquinas();
  const { data: movimientos } = useMovimientosCaja();

  // ── Calculadoras ──────────────────────────────────────────────────────────
  const [calcOpen,      setCalcOpen]      = useState(false);
  const [calcAncho,     setCalcAncho]     = useState('');
  const [calcAlto,      setCalcAlto]      = useState('');
  const [calcCantidad,  setCalcCantidad]  = useState('');
  const [calcModo,      setCalcModo]      = useState<'cantidad' | 'metros'>('cantidad');
  const [calcMetros,    setCalcMetros]    = useState('');
  const [calcResultado, setCalcResultado] = useState<number | null>(null);

  const [precioProductoId,    setPrecioProductoId]    = useState('');
  const [precioSearch,        setPrecioSearch]        = useState('');
  const [precioDropdownOpen,  setPrecioDropdownOpen]  = useState(false);
  const [precioAncho,         setPrecioAncho]         = useState('');
  const [precioAlto,          setPrecioAlto]          = useState('');
  const [precioCantidad,      setPrecioCantidad]      = useState('1');
  const [precioResultado,     setPrecioResultado]     = useState<number | null>(null);

  const isLoading = loadingPedidos || loadingTrabajos || loadingTintas || loadingMateriales;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Métricas ───────────────────────────────────────────────────────────────
  const hoy         = new Date();
  const inicioDia   = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - hoy.getDay()); inicioSemana.setHours(0,0,0,0);
  const inicioMes   = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hoyStr      = hoy.toISOString().split('T')[0];

  const pedidosHoy    = pedidos?.filter(p => new Date(p.created_at) >= inicioDia).length || 0;
  const ventasDia     = pedidos?.filter(p => new Date(p.created_at) >= inicioDia && p.estado !== 'cancelado')
                          .reduce((s, p) => s + (p.precio_total || 0), 0) || 0;
  const ventasSemana  = pedidos?.filter(p => new Date(p.created_at) >= inicioSemana && p.estado !== 'cancelado')
                          .reduce((s, p) => s + (p.precio_total || 0), 0) || 0;
  const ventasMes     = pedidos?.filter(p => new Date(p.created_at) >= inicioMes && p.estado !== 'cancelado')
                          .reduce((s, p) => s + (p.precio_total || 0), 0) || 0;
  const trabajosUrgentes = trabajos?.filter(t => t.prioridad === 'urgente' && t.estado !== 'entregado').length || 0;
  const pedidosActivos   = pedidos?.filter(p => p.estado === 'en_proceso' || p.estado === 'pendiente').length || 0;

  const bajaMateriales = materiales?.filter(m => m.largo_restante && m.largo_original && (m.largo_restante / m.largo_original) < 0.5) || [];
  const bajaTintas = tintas?.filter(t =>
    (t.magenta_cantidad || 0) < (t.magenta_minimo || 0) ||
    (t.cian_cantidad    || 0) < (t.cian_minimo    || 0) ||
    (t.amarillo_cantidad|| 0) < (t.amarillo_minimo|| 0) ||
    (t.negro_cantidad   || 0) < (t.negro_minimo   || 0)
  ) || [];
  const totalStockBajo = bajaMateriales.length + bajaTintas.length;

  // Finanzas hoy
  const ingresosHoy = movimientos?.filter(m => m.tipo === 'ingreso' && m.fecha === hoyStr)
                        .reduce((s, m) => s + (m.monto || 0), 0) || 0;
  const gastosHoy   = movimientos?.filter(m => m.tipo === 'egreso'  && m.fecha === hoyStr)
                        .reduce((s, m) => s + (m.monto || 0), 0) || 0;

  // Pedidos recientes (últimos 7)
  const pedidosRecientes = [...(pedidos || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 7);

  // Trabajos hoy
  const trabajosHoy = trabajos?.filter(t =>
    t.fecha_estimada && !['entregado'].includes(t.estado) && t.fecha_estimada.startsWith(hoyStr)
  ) || [];

  // ── Calculadoras ───────────────────────────────────────────────────────────
  function calcularEtiquetas() {
    const ancho = parseFloat(calcAncho);
    const alto  = parseFloat(calcAlto);
    if (!ancho || !alto || ancho <= 0 || alto <= 0) return;
    if (calcModo === 'cantidad') {
      const cantidad = parseInt(calcCantidad);
      if (!cantidad || cantidad <= 0) return;
      setCalcResultado(Math.round(cantidad * ancho * alto * (1 + MARGEN_SEGURIDAD) * 100) / 100);
    } else {
      const metros = parseFloat(calcMetros);
      if (!metros || metros <= 0) return;
      setCalcResultado(Math.floor(metros / (ancho * alto * (1 + MARGEN_SEGURIDAD))));
    }
  }

  function calcularPrecio() {
    const producto = productos?.find((p: any) => p.id === precioProductoId);
    if (!producto) return;
    const cantidad = parseInt(precioCantidad) || 1;
    const ancho    = parseFloat(precioAncho) || 0;
    const alto     = parseFloat(precioAlto)  || 0;
    if (!ancho || !alto) return;
    setPrecioResultado(Math.round(cantidad * ancho * alto * (parseFloat(producto.precio_m2) || 0)));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Resumen general del negocio" icon="dashboard" />

      {/* ── KPI Grid (6 tarjetas) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Ventas del Mes"
          value={`$${ventasMes.toLocaleString()}`}
          icon="trending_up"
          accent="primary"
        />
        <StatCard
          label="Pedidos Activos"
          value={String(pedidosActivos)}
          icon="list_alt"
          accent="primary"
        />
        <StatCard
          label="Pedidos Hoy"
          value={String(pedidosHoy)}
          icon="today"
          accent="production"
        />
        <StatCard
          label="Ventas del Día"
          value={`$${ventasDia.toLocaleString()}`}
          icon="payments"
          accent="tertiary"
        />
        {totalStockBajo > 0 ? (
          <StatCard
            label="Stock Bajo"
            value={`${totalStockBajo} items`}
            icon="warning"
            accent="secondary"
          />
        ) : (
          <StatCard
            label="Ventas Semana"
            value={`$${ventasSemana.toLocaleString()}`}
            icon="bar_chart"
            accent="primary"
          />
        )}
        <StatCard
          label="Urgentes"
          value={String(trabajosUrgentes)}
          icon="priority_high"
          accent={trabajosUrgentes > 0 ? 'alert' : 'primary'}
        />
      </div>

      {/* ── Main Grid: Tabla + Panel derecho ─────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Pedidos Recientes — tabla Stitch */}
        <div
          className="col-span-12 lg:col-span-8 flex flex-col"
          style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem' }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              Pedidos Recientes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500 }}>
              <thead>
                <tr style={{ backgroundColor: '#060e20', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#8d90a0' }}>
                  {['ID', 'CLIENTE', 'DESCRIPCIÓN', 'ESTADO', 'PRIORIDAD', 'TOTAL'].map(h => (
                    <th key={h} className="px-6 py-4"
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#94A3B8' }}>
                      No hay pedidos registrados
                    </td>
                  </tr>
                ) : pedidosRecientes.map(pedido => {
                  const estado    = pedido.estado || 'pendiente';
                  const prioridad = (pedido as any).prioridad || 'normal';
                  const estadoColor = ESTADO_COLOR[estado] || '#64748B';
                  const prioColor   = PRIORIDAD_COLOR[prioridad] || '#3B82F6';
                  return (
                    <tr key={pedido.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#222a3d')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <td className="px-6 py-4" style={{ color: '#b4c5ff', fontFamily: 'monospace' }}>
                        #{pedido.id?.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#F8FAFC' }}>
                        {(pedido as any).clientes?.nombre_completo || (pedido as any).clientes?.nombre || '—'}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#94A3B8' }}>
                        {pedido.descripcion ? pedido.descripcion.slice(0, 32) + (pedido.descripcion.length > 32 ? '…' : '') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1"
                          style={{
                            backgroundColor: `${estadoColor}1a`,
                            color: estadoColor,
                            border: `1px solid ${estadoColor}33`,
                            borderRadius: '0.125rem',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                          {ESTADO_LABEL[estado] || estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prioColor }} />
                          <span style={{ color: '#F8FAFC', textTransform: 'capitalize' }}>{prioridad}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#F8FAFC', fontWeight: 700 }}>
                        ${pedido.precio_total?.toLocaleString() ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* Stock Crítico */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Stock Crítico
              </h2>
              <span className="material-symbols-outlined" style={{ color: '#ffb95f' }}>inventory</span>
            </div>
            {bajaMateriales.length === 0 && bajaTintas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '1rem 0' }}>
                Todo el stock está en niveles normales
              </p>
            ) : (
              <div className="space-y-4">
                {bajaTintas.slice(0, 2).map((tinta: any) => {
                  const colores = [
                    { label: 'Magenta', cant: tinta.magenta_cantidad || 0, min: tinta.magenta_minimo || 1, color: '#f0abfc' },
                    { label: 'Cian',    cant: tinta.cian_cantidad    || 0, min: tinta.cian_minimo    || 1, color: '#67e8f9' },
                    { label: 'Amarillo',cant: tinta.amarillo_cantidad|| 0, min: tinta.amarillo_minimo|| 1, color: '#fde68a' },
                    { label: 'Negro',   cant: tinta.negro_cantidad   || 0, min: tinta.negro_minimo   || 1, color: '#94A3B8' },
                  ].filter(c => c.cant < c.min);
                  return colores.map(c => {
                    const pct = Math.min(100, Math.round((c.cant / c.min) * 100));
                    return (
                      <div key={`${tinta.id}-${c.label}`} className="flex flex-col gap-2">
                        <div className="flex justify-between" style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                          <span style={{ color: '#F8FAFC' }}>Tinta {c.label}</span>
                          <span style={{ color: '#ffb95f', fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#171f33' }}>
                          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#ffb95f' }} />
                        </div>
                      </div>
                    );
                  });
                })}
                {bajaMateriales.slice(0, 3).map((m: any) => {
                  const pct = Math.round((m.largo_restante / m.largo_original) * 100);
                  const color = pct < 20 ? '#ffb95f' : '#b4c5ff';
                  return (
                    <div key={m.id} className="flex flex-col gap-2">
                      <div className="flex justify-between" style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                        <span style={{ color: '#F8FAFC' }}>{m.tipo} {m.ancho}cm</span>
                        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#171f33' }}>
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen Financiero */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-3rem', right: '-3rem', width: '8rem', height: '8rem', backgroundColor: 'rgba(180,197,255,0.07)', filter: 'blur(60px)', borderRadius: '50%' }} />
            <h2 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', marginBottom: '1.5rem' }}>
              Resumen Financiero
            </h2>
            <div className="space-y-4">
              <div style={{ padding: '1rem', backgroundColor: '#171f33', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: '10px', color: '#8d90a0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>Ventas del Mes</p>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: '#F8FAFC' }}>${ventasMes.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(23,31,51,0.5)', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '10px', color: '#8d90a0', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>Ingresos Hoy</p>
                  <p style={{ color: '#b4c5ff', fontWeight: 700, fontFamily: 'Geist, Inter, sans-serif' }}>${ingresosHoy.toLocaleString()}</p>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(23,31,51,0.5)', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '10px', color: '#8d90a0', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>Gastos Hoy</p>
                  <p style={{ color: '#EF4444', fontWeight: 700, fontFamily: 'Geist, Inter, sans-serif' }}>${gastosHoy.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calculadora — acceso rápido */}
          <button
            onClick={() => setCalcOpen(v => !v)}
            className="flex items-center gap-4 w-full text-left transition-all"
            style={{
              backgroundColor: 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(180,197,255,0.25)',
              borderRadius: '0.25rem',
              padding: '1.5rem',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.15)')}
          >
            <div className="flex items-center justify-center"
              style={{ width: '3rem', height: '3rem', borderRadius: '0.25rem', backgroundColor: '#b4c5ff' }}>
              <span className="material-symbols-outlined" style={{ color: '#002a78' }}>calculate</span>
            </div>
            <div>
              <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 700, color: '#b4c5ff' }}>Calculadoras</h4>
              <p style={{ fontSize: '13px', color: 'rgba(180,197,255,0.65)', fontFamily: 'Inter, sans-serif' }}>Etiquetas · Precio m²</p>
            </div>
            <span className="material-symbols-outlined ml-auto" style={{ color: '#b4c5ff' }}>
              {calcOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Calculadoras expandibles ─────────────────────────────────────── */}
      {calcOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Calculadora Etiquetas */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1.5rem' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '20px' }}>tag</span>
              <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>Calculadora de Etiquetas</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button variant={calcModo === 'cantidad' ? 'default' : 'outline'} size="sm"
                  onClick={() => { setCalcModo('cantidad'); setCalcResultado(null); }}>Con cantidad</Button>
                <Button variant={calcModo === 'metros' ? 'default' : 'outline'} size="sm"
                  onClick={() => { setCalcModo('metros'); setCalcResultado(null); }}>Con m²</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ancho (m)</label>
                  <Input type="number" step="0.01" placeholder="0.10" value={calcAncho} onChange={e => setCalcAncho(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alto (m)</label>
                  <Input type="number" step="0.01" placeholder="0.05" value={calcAlto} onChange={e => setCalcAlto(e.target.value)} />
                </div>
              </div>
              {calcModo === 'cantidad' ? (
                <div>
                  <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad etiquetas</label>
                  <Input type="number" placeholder="1000" value={calcCantidad} onChange={e => setCalcCantidad(e.target.value)} />
                </div>
              ) : (
                <div>
                  <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metros cuadrados</label>
                  <Input type="number" step="0.01" placeholder="10" value={calcMetros} onChange={e => setCalcMetros(e.target.value)} />
                </div>
              )}
              <Button onClick={calcularEtiquetas} className="w-full">Calcular</Button>
              {calcResultado !== null && (
                <div className="text-center py-3 rounded" style={{ backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {calcModo === 'cantidad' ? 'Metros cuadrados necesarios' : 'Etiquetas posibles'}
                  </div>
                  <div style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.01em' }}>
                    {calcResultado} {calcModo === 'cantidad' ? 'm²' : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Margen de seguridad {MARGEN_SEGURIDAD * 100}%</div>
                </div>
              )}
            </div>
          </div>

          {/* Calculadora de Precio */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1.5rem' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: '20px' }}>sell</span>
              <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>Calculadora de Precio</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: '16px', color: '#94A3B8' }}>search</span>
                  <Input
                    className="pl-9"
                    placeholder="Buscar producto..."
                    value={precioSearch}
                    onChange={e => { setPrecioSearch(e.target.value); setPrecioDropdownOpen(true); if (!e.target.value) { setPrecioProductoId(''); setPrecioResultado(null); } }}
                    onFocus={() => setPrecioDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPrecioDropdownOpen(false), 150)}
                  />
                </div>
                {precioDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto shadow-lg"
                    style={{ backgroundColor: '#0d1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem' }}>
                    {productos
                      ?.filter((p: any) => p.tipo_cobro === 'm2' && p.nombre.toLowerCase().includes(precioSearch.toLowerCase()))
                      .map((p: any) => (
                        <button key={p.id} type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-sm text-left"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E293B')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                          onMouseDown={() => { setPrecioProductoId(p.id); setPrecioSearch(p.nombre); setPrecioDropdownOpen(false); setPrecioResultado(null); }}>
                          <span style={{ color: '#F8FAFC' }}>{p.nombre}</span>
                          <span style={{ color: '#4edea3', fontSize: '12px', fontWeight: 700 }}>${p.precio_m2}/m²</span>
                        </button>
                      ))}
                    {productos?.filter((p: any) => p.tipo_cobro === 'm2' && p.nombre.toLowerCase().includes(precioSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm" style={{ color: '#94A3B8' }}>Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
              {precioProductoId && (() => {
                const prod = productos?.find((p: any) => p.id === precioProductoId);
                if (!prod) return null;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ancho (m)</label>
                        <Input type="number" step="0.01" placeholder="1.00" value={precioAncho} onChange={e => setPrecioAncho(e.target.value)} />
                      </div>
                      <div>
                        <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alto (m)</label>
                        <Input type="number" step="0.01" placeholder="0.50" value={precioAlto} onChange={e => setPrecioAlto(e.target.value)} />
                      </div>
                      <div>
                        <label className="block mb-1" style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</label>
                        <Input type="number" min="1" placeholder="1" value={precioCantidad} onChange={e => setPrecioCantidad(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={calcularPrecio} className="w-full">Calcular Precio</Button>
                  </>
                );
              })()}
              {precioResultado !== null && (
                <div className="text-center py-3 rounded" style={{ backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precio estimado</div>
                  <div style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#4edea3', letterSpacing: '-0.01em' }}>${precioResultado.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Estado de Máquinas ───────────────────────────────────────────── */}
      {maquinas && maquinas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {maquinas.map((maquina: any) => {
            const trabajosActivos = trabajos?.filter(
              t => t.maquina_asignada === maquina.nombre && ['pendiente', 'en_proceso'].includes(t.estado)
            ).length || 0;
            const printing = trabajosActivos > 0;
            const dotColor = printing ? '#3B82F6' : '#10B981';
            const label    = printing ? `${trabajosActivos} trabajo${trabajosActivos > 1 ? 's' : ''}` : 'LIBRE';
            return (
              <div key={maquina.id} className="flex items-center gap-3"
                style={{ backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: dotColor, flexShrink: 0 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC' }}>
                  {maquina.nombre}:{' '}
                  <span style={{ color: dotColor, fontWeight: 700 }}>{label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Trabajos para Hoy ────────────────────────────────────────────── */}
      {trabajosHoy.length > 0 && (
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1.5rem' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>schedule</span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              Trabajos para Hoy
            </h3>
          </div>
          <div className="space-y-2">
            {trabajosHoy.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: '#171f33' }}>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                    {t.descripcion || 'Sin descripción'}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                    {t.maquina_asignada || 'Sin máquina asignada'}
                  </p>
                </div>
                <Badge variant={t.prioridad === 'urgente' ? 'destructive' : t.prioridad === 'alta' ? 'warning' : 'outline'}>
                  {t.prioridad || 'normal'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
