import { useState } from 'react';
import { useMaquinas, useTrabajos } from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PlotterStatus {
  id: string;
  nombre: string;
  estado: 'disponible' | 'en_uso' | 'mantenimiento' | 'fuera_servicio';
  trabajo_actual?: string;
  trabajo_cliente?: string;
  trabajo_m2?: number;
  horas_uso?: number;
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  disponible: { bg: 'rgba(16,185,129,0.2)', text: '#10B981', border: 'rgba(16,185,129,0.3)', bar: '#10B981' },
  en_uso: { bg: 'rgba(59,130,246,0.2)', text: '#3B82F6', border: 'rgba(59,130,246,0.3)', bar: '#3B82F6' },
  mantenimiento: { bg: 'rgba(255,185,95,0.2)', text: '#ffb95f', border: 'rgba(255,185,95,0.3)', bar: '#ffb95f' },
  fuera_servicio: { bg: 'rgba(239,68,68,0.2)', text: '#EF4444', border: 'rgba(239,68,68,0.3)', bar: '#EF4444' },
};

const MATERIALES = [
  { nombre: 'Lona Flex', precio: 3.50 },
  { nombre: 'Vinilo Adhesivo', precio: 4.00 },
  { nombre: 'Canvas', precio: 5.50 },
  { nombre: 'Papel Bond', precio: 1.80 },
  { nombre: 'Mesh', precio: 4.50 },
];

export default function Plotter() {
  const { data: maquinas, isLoading: loadingMaquinas } = useMaquinas();
  const { data: trabajos, isLoading: loadingTrabajos } = useTrabajos();

  const [tab, setTab] = useState<'estado' | 'calculadora'>('estado');

  // Calculadora state
  const [ancho, setAncho] = useState(1);
  const [alto, setAlto] = useState(1);
  const [cantidad, setCantidad] = useState(1);
  const [precioM2, setPrecioM2] = useState(3.50);
  const [margen, setMargen] = useState(20);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState('');

  const isLoading = loadingMaquinas || loadingTrabajos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Mapear máquinas a su estado actual basado en trabajos
  const plotters: PlotterStatus[] = (maquinas || []).map(maquina => {
    const trabajoActivo = trabajos?.find(t =>
      t.maquina_asignada === maquina.nombre &&
      (t.estado === 'en_proceso' || t.estado === 'pendiente')
    );

    let estado: PlotterStatus['estado'] = 'disponible';
    if (trabajoActivo) {
      estado = 'en_uso';
    }

    return {
      id: maquina.id,
      nombre: maquina.nombre,
      estado,
      trabajo_actual: trabajoActivo?.descripcion,
      trabajo_cliente: trabajoActivo?.pedido_id,
      trabajo_m2: trabajoActivo?.metros_cuadrados,
      horas_uso: maquina.horas_uso,
    };
  });

  // Si no hay máquinas en la base de datos, mostrar ejemplo
  const plottersDisplay = plotters.length > 0 ? plotters : [
    { id: '1', nombre: 'Plotter Principal', estado: 'disponible' as const, horas_uso: 1250 },
    { id: '2', nombre: 'Plotter Secundario', estado: 'en_uso' as const, trabajo_actual: 'Lona publicitaria 3x6m', trabajo_cliente: 'Empresa ABC', trabajo_m2: 18, horas_uso: 890 },
    { id: '3', nombre: 'Plotter Corte', estado: 'mantenimiento' as const, horas_uso: 2100 },
  ];

  const disponibles = plottersDisplay.filter(p => p.estado === 'disponible').length;
  const enUso = plottersDisplay.filter(p => p.estado === 'en_uso').length;
  const mantenimiento = plottersDisplay.filter(p => p.estado === 'mantenimiento').length;

  // Cálculos calculadora
  const areaUnitaria = ancho * alto;
  const areaTotal = areaUnitaria * cantidad;
  const subtotal = areaTotal * precioM2;
  const margenMonto = subtotal * (margen / 100);
  const total = subtotal + margenMonto;

  const copiarPortapapeles = () => {
    const texto = `Cotización Impresión\nÁrea total: ${areaTotal.toFixed(2)} m²\nPrecio/m²: $${precioM2.toFixed(2)}\nSubtotal: $${subtotal.toFixed(2)}\nMargen: ${margen}%\nTotal: $${total.toFixed(2)}\n${cantidad} pieza(s) · ${areaTotal.toFixed(2)} m²`;
    navigator.clipboard.writeText(texto);
    alert('Copiado al portapapeles');
  };

  // ─── VISTA A: ESTADO DE MÁQUINAS ───────────────────────────────
  if (tab === 'estado') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plotter / Estado de Máquinas
            </p>
            <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
              Plotters
            </h1>
          </div>
          <button
            onClick={() => setTab('calculadora')}
            style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calculate</span>
            Calculadora
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Disponibles', value: disponibles, icon: 'check_circle', color: '#10B981' },
            { label: 'En Uso', value: enUso, icon: 'print', color: '#3B82F6', pulse: enUso > 0 },
            { label: 'Mantenimiento', value: mantenimiento, icon: 'build', color: '#ffb95f' },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: '24px' }}>{stat.icon}</span>
                {stat.pulse && <span style={{ width: '8px', height: '8px', backgroundColor: '#3B82F6', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}
              </div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Cards de máquinas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plottersDisplay.map(plotter => {
            const ec = ESTADO_COLORS[plotter.estado] || ESTADO_COLORS.disponible;
            return (
              <div key={plotter.id} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `4px solid ${ec.bar}`, borderRadius: '0.5rem', padding: '24px' }}>
                {/* Header card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" style={{ color: ec.text, fontSize: '24px' }}>print</span>
                    <div>
                      <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: '#F8FAFC', fontSize: '16px' }}>{plotter.nombre}</div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '0.125rem', backgroundColor: ec.bg, color: ec.text, border: `1px solid ${ec.border}`, display: 'inline-block', marginTop: '4px' }}>
                        {plotter.estado === 'en_uso' ? 'En Uso' : plotter.estado === 'fuera_servicio' ? 'Fuera de Servicio' : plotter.estado.charAt(0).toUpperCase() + plotter.estado.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trabajo actual si está en uso */}
                {plotter.estado === 'en_uso' && plotter.trabajo_actual && (
                  <div style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.375rem', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>{plotter.trabajo_actual}</div>
                    {plotter.trabajo_m2 && (
                      <div style={{ fontSize: '13px', color: '#b4c5ff', fontWeight: 600 }}>{plotter.trabajo_m2} m²</div>
                    )}
                  </div>
                )}

                {/* Horas de uso */}
                {plotter.horas_uso !== undefined && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                    Horas de uso: {plotter.horas_uso.toLocaleString()} hrs
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setTab('calculadora')} style={{ background: 'none', border: 'none', color: '#b4c5ff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Calculadora
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── VISTA B: CALCULADORA ──────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Plotter / Calculadora
          </p>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
            Calculadora de Impresión
          </h1>
        </div>
        <button
          onClick={() => setTab('estado')}
          style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Volver a Estado
        </button>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-12 gap-6">
        {/* ─── Columna izquierda ─── */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Panel Parámetros */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '20px' }}>calculate</span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px' }}>Parámetros</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>ANCHO (M)</label>
                <input type="number" step="0.01" min="0" value={ancho} onChange={e => setAncho(parseFloat(e.target.value) || 0)}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>ALTO (M)</label>
                <input type="number" step="0.01" min="0" value={alto} onChange={e => setAlto(parseFloat(e.target.value) || 0)}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>CANTIDAD</label>
                <input type="number" step="1" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>PRECIO POR M² ($)</label>
                <input type="number" step="0.01" min="0" value={precioM2} onChange={e => setPrecioM2(parseFloat(e.target.value) || 0)}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
            </div>

            {/* Área calculada */}
            <div style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '16px', marginTop: '16px' }}>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '4px' }}>
                Área unitaria: <span style={{ color: '#b4c5ff', fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>{ancho.toFixed(2)} × {alto.toFixed(2)} = {areaUnitaria.toFixed(2)} m²</span>
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                Área total: <span style={{ color: '#b4c5ff', fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>{areaUnitaria.toFixed(2)} m² × {cantidad} = {areaTotal.toFixed(2)} m²</span>
              </div>
            </div>
          </div>

          {/* Panel Materiales Frecuentes */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px', marginBottom: '16px' }}>Materiales Frecuentes</div>
            <div className="flex flex-wrap gap-2">
              {MATERIALES.map(mat => (
                <button key={mat.nombre} onClick={() => setPrecioM2(mat.precio)}
                  style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', color: precioM2 === mat.precio ? '#b4c5ff' : '#dae2fd', cursor: 'pointer', borderColor: precioM2 === mat.precio ? '#b4c5ff' : 'rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                  {mat.nombre} — ${mat.precio.toFixed(2)}/m²
                </button>
              ))}
            </div>
          </div>

          {/* Panel Máquina a usar */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px', marginBottom: '16px' }}>Máquina a usar</div>
            <select value={maquinaSeleccionada} onChange={e => setMaquinaSeleccionada(e.target.value)}
              style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}>
              <option value="">Seleccionar máquina...</option>
              {plottersDisplay.filter(p => p.estado === 'disponible').map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre} — Disponible</option>
              ))}
              {plottersDisplay.filter(p => p.estado !== 'disponible').map(p => (
                <option key={p.id} value={p.nombre} disabled>{p.nombre} — {p.estado === 'en_uso' ? 'En Uso' : p.estado}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Columna derecha ─── */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Panel Resumen */}
          <div style={{ backgroundColor: '#222a3d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
              RESUMEN DE COTIZACIÓN
            </div>
            <div className="space-y-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Área total</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>{areaTotal.toFixed(2)} m²</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Precio/m²</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>${precioM2.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Subtotal</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>Margen (%)</span>
                  <span style={{ color: '#ffb95f', fontWeight: 700, fontSize: '14px' }}>{margen}%</span>
                </div>
                <input type="range" min="0" max="50" value={margen} onChange={e => setMargen(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#ffb95f' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>Total con margen</span>
                <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '16px' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Card total */}
            <div style={{ backgroundColor: '#2563eb', borderRadius: '0.5rem', padding: '16px', marginTop: '16px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ESTIMADO</div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '36px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>${total.toFixed(2)}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' }}>{cantidad} pieza(s) · {areaTotal.toFixed(2)} m²</div>
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button onClick={copiarPortapapeles}
              style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#b4c5ff', padding: '10px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
              Copiar al Portapapeles
            </button>
            <button onClick={() => { window.location.href = '/cotizaciones'; }}
              style={{ width: '100%', backgroundColor: '#2563eb', border: 'none', color: '#ffffff', fontWeight: 700, padding: '10px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>request_quote</span>
              Nueva Cotización
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
