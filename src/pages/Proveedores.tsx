import { useState } from 'react';
import { useProveedores, useCreateProveedor, useUpdateProveedor, useMovimientosCaja, useCreateMovimientoCaja } from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ─── Interfaces ──────────────────────────────────────────────────────

interface ProveedorForm {
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  moneda_preferida: string;
  politica_tasa: string;
  es_credito: boolean;
  dias_credito: string;
  metodo_pago_habitual: string;
  lead_time_dias: string;
}

interface CompraForm {
  proveedor_nombre: string;
  concepto: string;
  monto: string;
  fecha: string;
  notas: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const emptyProveedor: ProveedorForm = {
  nombre: '',
  rif: '',
  telefono: '',
  email: '',
  direccion: '',
  moneda_preferida: 'USD',
  politica_tasa: 'BCV',
  es_credito: false,
  dias_credito: '',
  metodo_pago_habitual: 'Transferencia',
  lead_time_dias: '',
};
const emptyCompra: CompraForm = {
  proveedor_nombre: '',
  concepto: '',
  monto: '',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
};

const SEL = 'w-full h-10 rounded border border-[rgba(255,255,255,0.08)] bg-[#060e20] px-3 text-sm text-[#dae2fd] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]';
const INP = 'w-full rounded border border-[rgba(255,255,255,0.08)] bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]';
const LBL = 'block mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]';
const METODOS_PAGO = ['Transferencia', 'Efectivo BS', 'Efectivo $', 'Pago Móvil'];

// ─── Panel helper ────────────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', ...style }}>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function Proveedores() {
  const { data: proveedores, isLoading: loadingProveedores } = useProveedores();
  const { data: movimientos, isLoading: loadingMov } = useMovimientosCaja();
  const createProveedor = useCreateProveedor();
  const updateProveedor = useUpdateProveedor();
  const createMovimiento = useCreateMovimientoCaja();

  const [tab, setTab] = useState<'proveedores' | 'compras'>('proveedores');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProveedorForm>(emptyProveedor);
  const [compraForm, setCompraForm] = useState<CompraForm>(emptyCompra);
  const [showCompraForm, setShowCompraForm] = useState(false);

  const isLoading = loadingProveedores || loadingMov;

  // ─── Derived data ────────────────────────────────────────────────

  const filteredProveedores = proveedores?.filter(p =>
    !search ||
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.telefono?.includes(search)
  ) || [];

  const compras = movimientos?.filter(m => m.categoria === 'compras') || [];
  const filteredCompras = compras.filter(c =>
    !search ||
    c.concepto?.toLowerCase().includes(search.toLowerCase()) ||
    c.notas?.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const comprasMes = compras.filter(c => {
    const d = new Date(c.fecha || c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalComprasMes = comprasMes.reduce((s, c) => s + (c.monto || 0), 0);
  const totalCompras = compras.reduce((s, c) => s + (c.monto || 0), 0);
  const metodosPagoProveedor = Array.from(
    new Set([form.metodo_pago_habitual, ...METODOS_PAGO].filter(Boolean))
  );

  // ─── Handlers: Proveedor ─────────────────────────────────────────

  const buildProveedorPayload = (f: ProveedorForm) => {
    const diasN = parseInt(f.dias_credito, 10);
    const leadN = parseInt(f.lead_time_dias, 10);
    return {
      nombre: f.nombre,
      rif: f.rif.trim(),
      telefono: f.telefono || null,
      email: f.email || null,
      direccion: f.direccion || null,
      moneda_preferida: f.moneda_preferida || 'USD',
      politica_tasa: f.politica_tasa || 'BCV',
      es_credito: Boolean(f.es_credito),
      metodo_pago_habitual: f.metodo_pago_habitual || null,
      dias_credito: isNaN(diasN) ? null : diasN,
      lead_time_dias: isNaN(leadN) ? null : leadN,
    };
  };

  const handleSubmitProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre) { alert('El nombre es obligatorio'); return; }
    if (!form.rif.trim()) { alert('El RIF es obligatorio'); return; }
    try {
      const payload = buildProveedorPayload(form);
      if (editingId) {
        await updateProveedor.mutateAsync({ id: editingId, ...payload });
      } else {
        await createProveedor.mutateAsync(payload as unknown as Record<string, unknown>);
      }
      setForm(emptyProveedor);
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('column') && msg.includes('schema cache')) {
        alert('Faltan columnas en la BD. Ejecuta la migración SQL en Supabase Dashboard.');
      } else {
        alert('Error al guardar el proveedor');
      }
    }
  };

  const handleEditProveedor = (p: any) => {
    setForm({
      nombre: p.nombre || '',
      rif: p.rif || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      moneda_preferida: p.moneda_preferida || 'USD',
      politica_tasa: p.politica_tasa || 'BCV',
      es_credito: Boolean(p.es_credito),
      dias_credito: p.dias_credito !== null && p.dias_credito !== undefined ? String(p.dias_credito) : '',
      metodo_pago_habitual: p.metodo_pago_habitual || 'Transferencia',
      lead_time_dias: p.lead_time_dias !== null && p.lead_time_dias !== undefined ? String(p.lead_time_dias) : '',
    });
    setEditingId(p.id);
    setShowForm(true);
    setTab('proveedores');
  };

  const handleCancelProveedor = () => {
    setForm(emptyProveedor);
    setEditingId(null);
    setShowForm(false);
  };

  // ─── Handlers: Compra ────────────────────────────────────────────

  const handleSubmitCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraForm.concepto || !compraForm.monto) { alert('Concepto y monto son obligatorios'); return; }
    try {
      const proveedor = proveedores?.find(p => p.nombre === compraForm.proveedor_nombre);
      const notasExtras = [
        compraForm.notas || null,
        proveedor?.moneda_preferida ? `moneda_preferida=${proveedor.moneda_preferida}` : null,
        proveedor?.politica_tasa ? `politica_tasa=${proveedor.politica_tasa}` : null,
        proveedor?.es_credito !== undefined ? `proveedor_credito=${Boolean(proveedor.es_credito)}` : null,
        proveedor?.dias_credito !== null && proveedor?.dias_credito !== undefined ? `dias_credito=${proveedor.dias_credito}` : null,
        proveedor?.metodo_pago_habitual ? `metodo_pago=${proveedor.metodo_pago_habitual}` : null,
      ].filter(Boolean).join('|') || null;
      await createMovimiento.mutateAsync({
        tipo: 'egreso',
        concepto: compraForm.proveedor_nombre
          ? `${compraForm.proveedor_nombre} — ${compraForm.concepto}`
          : compraForm.concepto,
        monto: Number(compraForm.monto),
        categoria: 'compras',
        fecha: compraForm.fecha,
        notas: notasExtras,
      });
      setCompraForm(emptyCompra);
      setShowCompraForm(false);
    } catch { alert('Error al registrar la compra'); }
  };

  // ─── Loading ─────────────────────────────────────────────────────

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><LoadingSpinner size="lg" /></div>;
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', marginBottom: '4px', letterSpacing: '0.05em' }}>
            Proveedores / {tab === 'proveedores' ? 'Lista' : 'Compras'}
          </p>
          <h1 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff', margin: 0, letterSpacing: '-0.01em' }}>
            Proveedores y Compras
          </h1>
        </div>
        <button
          onClick={() => {
            if (tab === 'proveedores') { setShowForm(true); setShowCompraForm(false); }
            else { setShowCompraForm(true); setShowForm(false); }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '10px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          {tab === 'proveedores' ? 'Nuevo Proveedor' : 'Registrar Compra'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { icon: 'local_shipping', label: 'Proveedores', value: proveedores?.length || 0, color: '#b4c5ff' },
          { icon: 'shopping_bag', label: 'Compras del Mes', value: `$${totalComprasMes.toLocaleString('es-CL')}`, color: '#ffb95f' },
          { icon: 'payments', label: 'Compras Totales', value: `$${totalCompras.toLocaleString('es-CL')}`, color: '#EF4444' },
          { icon: 'receipt_long', label: 'Movimientos', value: compras.length, color: '#94A3B8' },
        ].map(card => (
          <div key={card.label} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: card.color }}>{card.icon}</span>
            </div>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{card.label}</p>
              <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '22px', fontWeight: 700, color: card.color, margin: 0, letterSpacing: '-0.01em' }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', background: '#131b2e', borderRadius: '0.5rem', padding: '4px', width: 'fit-content' }}>
        {(['proveedores', 'compras'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch(''); }}
            style={{ padding: '7px 20px', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: tab === t ? '#222a3d' : 'transparent', color: tab === t ? '#b4c5ff' : '#64748B', transition: 'all 0.15s' }}>
            {t === 'proveedores' ? 'Proveedores' : 'Compras'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          VISTA: PROVEEDORES
      ══════════════════════════════════════════════════════ */}
      {tab === 'proveedores' && (
        <>
          {/* Formulario proveedor */}
          {showForm && (
            <Panel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,14,32,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#b4c5ff' }}>local_shipping</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
                    {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </span>
                </div>
                <button onClick={handleCancelProveedor}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', padding: '6px 12px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span> Cancelar
                </button>
              </div>
              <form onSubmit={handleSubmitProveedor} style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label className={LBL}>Nombre *</label>
                  <input className={INP} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del proveedor" required />
                </div>
                <div>
                  <label className={LBL}>RIF *</label>
                  <input
                    className={INP}
                    value={form.rif}
                    onChange={e => setForm({ ...form, rif: e.target.value.toUpperCase() })}
                    placeholder="J-12345678-9"
                    required
                  />
                </div>
                <div>
                  <label className={LBL}>Teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>phone</span>
                    <input className={INP} style={{ paddingLeft: '32px' }} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+58 412-..." />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>mail</span>
                    <input type="email" className={INP} style={{ paddingLeft: '32px' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="proveedor@email.com" />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Dirección</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>location_on</span>
                    <input className={INP} style={{ paddingLeft: '32px' }} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección completa" />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Moneda preferida</label>
                  <select className={SEL} value={form.moneda_preferida} onChange={e => setForm({ ...form, moneda_preferida: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="Binance">Binance</option>
                    <option value="BS">BS</option>
                  </select>
                </div>
                <div>
                  <label className={LBL}>Política de tasa</label>
                  <select className={SEL} value={form.politica_tasa} onChange={e => setForm({ ...form, politica_tasa: e.target.value })}>
                    <option value="BCV">BCV</option>
                    <option value="Binance">Binance</option>
                    <option value="Euro">Euro</option>
                    <option value="Libre">Libre</option>
                  </select>
                </div>
                <div>
                  <label className={LBL}>Metod. pago habitual</label>
                  <select
                    className={SEL}
                    value={form.metodo_pago_habitual}
                    onChange={e => setForm({ ...form, metodo_pago_habitual: e.target.value })}
                  >
                    <option value="">Seleccionar método</option>
                    {metodosPagoProveedor.map(metodo => (
                      <option key={metodo} value={metodo}>
                        {metodo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Días de crédito</label>
                  <input className={INP} type="number" min="0" value={form.dias_credito} onChange={e => setForm({ ...form, dias_credito: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Lead time (días)</label>
                  <input className={INP} type="number" min="0" value={form.lead_time_dias} onChange={e => setForm({ ...form, lead_time_dias: e.target.value })} placeholder="0" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'end', paddingBottom: '8px' }}>
                  <input
                    id="proveedor_credito"
                    type="checkbox"
                    checked={form.es_credito}
                    onChange={e => setForm({ ...form, es_credito: e.target.checked })}
                  />
                  <label htmlFor="proveedor_credito" style={{ color: '#dae2fd', fontSize: '13px' }}>Proveedor a crédito</label>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={handleCancelProveedor}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', padding: '9px 20px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={createProveedor.isPending || updateProveedor.isPending}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '9px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: createProveedor.isPending || updateProveedor.isPending ? 0.7 : 1 }}>
                    {createProveedor.isPending || updateProveedor.isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#64748B' }}>search</span>
            <input className={INP} style={{ paddingLeft: '40px' }} placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Tabla proveedores */}
          <Panel>
            {filteredProveedores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748B' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.4 }}>local_shipping</span>
                <p style={{ fontSize: '14px', margin: 0 }}>{search ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}</p>
                {!search && (
                  <button onClick={() => setShowForm(true)}
                    style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Agregar primer proveedor
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(6,14,32,0.5)' }}>
                      {['PROVEEDOR', 'TELÉFONO', 'EMAIL', 'DIRECCIÓN', 'ACCIONES'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProveedores.map(p => (
                      <tr key={p.id}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,42,61,0.5)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '0.375rem', background: 'rgba(180,197,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#b4c5ff' }}>local_shipping</span>
                            </div>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', display: 'block' }}>{p.nombre}</span>
                              <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                                {p.moneda_preferida || 'USD'} · {p.politica_tasa || 'BCV'} · {p.es_credito ? `${p.dias_credito || 0} días crédito` : 'Contado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {p.telefono ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94A3B8' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748B' }}>phone</span>
                              {p.telefono}
                            </div>
                          ) : <span style={{ color: '#64748B', fontSize: '12px' }}>—</span>}
                        </td>

                        <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                          {p.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748B', flexShrink: 0 }}>mail</span>
                              {p.email}
                            </div>
                          ) : <span style={{ color: '#64748B', fontSize: '12px' }}>—</span>}
                        </td>

                        <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                          {p.direccion ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748B', flexShrink: 0 }}>location_on</span>
                              {p.direccion}
                            </div>
                          ) : <span style={{ color: '#64748B', fontSize: '12px' }}>—</span>}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleEditProveedor(p)} title="Editar"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#b4c5ff')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
                            </button>
                            <button title="Registrar compra a este proveedor"
                              onClick={() => { setCompraForm({ ...emptyCompra, proveedor_nombre: p.nombre }); setShowCompraForm(true); setTab('compras'); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ffb95f')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>shopping_bag</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          VISTA: COMPRAS
      ══════════════════════════════════════════════════════ */}
      {tab === 'compras' && (
        <>
          {/* Formulario compra */}
          {showCompraForm && (
            <Panel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,14,32,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ffb95f' }}>shopping_bag</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>Registrar Compra</span>
                </div>
                <button onClick={() => { setShowCompraForm(false); setCompraForm(emptyCompra); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', padding: '6px 12px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span> Cancelar
                </button>
              </div>
              <form onSubmit={handleSubmitCompra} style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label className={LBL}>Proveedor</label>
                  <select className={SEL} value={compraForm.proveedor_nombre} onChange={e => {
                    const nextProveedor = proveedores?.find(p => p.nombre === e.target.value);
                    setCompraForm({
                      ...compraForm,
                      proveedor_nombre: e.target.value,
                      notas: nextProveedor ? [
                        compraForm.notas || null,
                        nextProveedor.moneda_preferida ? `moneda_preferida=${nextProveedor.moneda_preferida}` : null,
                        nextProveedor.politica_tasa ? `politica_tasa=${nextProveedor.politica_tasa}` : null,
                        nextProveedor.es_credito !== undefined ? `proveedor_credito=${Boolean(nextProveedor.es_credito)}` : null,
                        nextProveedor.dias_credito !== null && nextProveedor.dias_credito !== undefined ? `dias_credito=${nextProveedor.dias_credito}` : null,
                      ].filter(Boolean).join('|') : compraForm.notas,
                    });
                  }}>
                    <option value="">Sin proveedor específico</option>
                    {proveedores?.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                  {compraForm.proveedor_nombre && (() => {
                    const p = proveedores?.find(row => row.nombre === compraForm.proveedor_nombre);
                    return p ? (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#94A3B8', lineHeight: 1.5 }}>
                        {p.moneda_preferida || 'USD'} · {p.politica_tasa || 'BCV'} · {p.es_credito ? `${p.dias_credito || 0} días crédito` : 'Contado'}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div>
                  <label className={LBL}>Concepto *</label>
                  <input className={INP} value={compraForm.concepto} onChange={e => setCompraForm({ ...compraForm, concepto: e.target.value })} placeholder="Descripción de la compra" required />
                </div>
                <div>
                  <label className={LBL}>Monto ($) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                    <input type="number" step="0.01" min="0" className={INP} style={{ paddingLeft: '22px' }} value={compraForm.monto} onChange={e => setCompraForm({ ...compraForm, monto: e.target.value })} placeholder="0" required />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Fecha</label>
                  <input type="date" className={INP} value={compraForm.fecha} onChange={e => setCompraForm({ ...compraForm, fecha: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className={LBL}>Notas (opcional)</label>
                  <input className={INP} value={compraForm.notas} onChange={e => setCompraForm({ ...compraForm, notas: e.target.value })} placeholder="Factura, referencia, etc." />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => { setShowCompraForm(false); setCompraForm(emptyCompra); }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', padding: '9px 20px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={createMovimiento.isPending}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '9px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: createMovimiento.isPending ? 0.7 : 1 }}>
                    {createMovimiento.isPending ? 'Registrando...' : 'Registrar Compra'}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#64748B' }}>search</span>
            <input className={INP} style={{ paddingLeft: '40px' }} placeholder="Buscar en compras..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Tabla compras */}
          <Panel>
            {filteredCompras.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748B' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.4 }}>shopping_bag</span>
                <p style={{ fontSize: '14px', margin: 0 }}>{search ? 'No se encontraron compras' : 'No hay compras registradas'}</p>
                {!search && (
                  <button onClick={() => setShowCompraForm(true)}
                    style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Registrar primera compra
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(6,14,32,0.5)' }}>
                      {['FECHA', 'CONCEPTO / PROVEEDOR', 'NOTAS', 'MONTO'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompras.map(c => {
                      const partes = c.concepto?.split(' — ');
                      const proveedor = partes && partes.length > 1 ? partes[0] : null;
                      const concepto = partes && partes.length > 1 ? partes.slice(1).join(' — ') : c.concepto;
                      return (
                        <tr key={c.id}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,42,61,0.5)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                          <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {c.fecha ? new Date(c.fecha).toLocaleDateString('es-CL') : new Date(c.created_at).toLocaleDateString('es-CL')}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            {proveedor && (
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#ffb95f', marginBottom: '2px', letterSpacing: '0.04em' }}>{proveedor}</div>
                            )}
                            <div style={{ fontSize: '13px', color: '#F8FAFC' }}>{concepto}</div>
                          </td>

                          <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.notas || '—'}
                          </td>

                          <td style={{ padding: '14px 16px', fontFamily: 'Geist, sans-serif', fontSize: '15px', fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap' }}>
                            -${(c.monto || 0).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,14,32,0.3)' }}>
                      <td colSpan={3} style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total ({filteredCompras.length} compras)
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#EF4444' }}>
                        -${filteredCompras.reduce((s, c) => s + (c.monto || 0), 0).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
