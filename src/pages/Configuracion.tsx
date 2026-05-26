import { useMemo, useState, useEffect } from 'react';
import {
  useConfiguracionNegocio,
  useUpdateConfiguracion,
  useMaquinas,
  useTintas,
  useCreateMaquina,
  useUpdateMaquina,
  useDeleteMaquina,
  useMaquinaTintaActiva,
  useCreateMaquinaTintaActiva,
  useUpdateMaquinaTintaActiva,
  useDeleteMaquinaTintaActiva,
} from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────

type TabType = 'negocio' | 'maquinas' | 'precios';
type MaquinaTipo = 'impresion' | 'corte' | 'uv' | 'otro';

interface MaquinaForm {
  nombre: string;
  tipo: MaquinaTipo;
  ancho_maximo: string;
  velocidad: string;
  costo_hora: string;
  estado: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const emptyMaquinaForm: MaquinaForm = {
  nombre: '', tipo: 'impresion', ancho_maximo: '',
  velocidad: '', costo_hora: '', estado: 'disponible',
};

const INP = 'w-full rounded border border-[rgba(255,255,255,0.08)] bg-[#060e20] px-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]';
const SEL = 'w-full h-10 rounded border border-[rgba(255,255,255,0.08)] bg-[#060e20] px-3 text-sm text-[#dae2fd] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]';
const LBL = 'block mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]';

const ESTADO_MAQUINA: Record<string, { color: string; bg: string; border: string; label: string }> = {
  disponible:    { color: '#10B981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  label: 'Disponible' },
  en_uso:        { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  label: 'En Uso' },
  mantenimiento: { color: '#ffb95f', bg: 'rgba(255,185,95,0.15)',  border: 'rgba(255,185,95,0.3)',  label: 'Mantención' },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', ...style }}>
      {children}
    </div>
  );
}

function PanelHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,14,32,0.5)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#b4c5ff' }}>{icon}</span>
      <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>{title}</span>
    </div>
  );
}

function SaveBtn({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
      {saving ? 'Guardando...' : 'Guardar Cambios'}
    </button>
  );
}

function formatMaquinaTipo(tipo?: string | null) {
  switch (tipo) {
    case 'corte':
      return 'Corte';
    case 'uv':
      return 'UV';
    case 'otro':
      return 'Otro';
    case 'impresion':
    default:
      return 'Impresión';
  }
}

function groupTintasByMarca(tintas: any[] | undefined) {
  return (tintas || []).reduce((acc: Record<string, any[]>, tinta: any) => {
    const marca = String(tinta?.marca || 'Sin marca').trim() || 'Sin marca';
    if (!acc[marca]) acc[marca] = [];
    acc[marca].push(tinta);
    return acc;
  }, {});
}

function MaquinaTintaActivaCard({ maquina, tintas }: { maquina: any; tintas: any[] | undefined }) {
  const { data: asignaciones } = useMaquinaTintaActiva(maquina.id);
  const createAsignacion = useCreateMaquinaTintaActiva();
  const updateAsignacion = useUpdateMaquinaTintaActiva();
  const deleteAsignacion = useDeleteMaquinaTintaActiva();
  const active = Array.isArray(asignaciones) ? asignaciones[0] : null;
  const [tintaId, setTintaId] = useState('');
  const tintasPorMarca = useMemo(() => groupTintasByMarca(tintas), [tintas]);

  useEffect(() => {
    setTintaId(active?.tinta_id || '');
  }, [active?.tinta_id]);

  const handleGuardar = async () => {
    if (!tintaId) {
      alert('Selecciona una tinta antes de guardar');
      return;
    }
    try {
      if (active?.id) {
        await updateAsignacion.mutateAsync({ id: active.id, maquina_id: maquina.id, tinta_id: tintaId });
      } else {
        await createAsignacion.mutateAsync({ maquina_id: maquina.id, tinta_id: tintaId });
      }
    } catch {
      alert('Error al guardar la tinta activa');
    }
  };

  const handleEliminar = async () => {
    if (!active?.id) return;
    if (!confirm(`¿Quitar la tinta activa de "${maquina.nombre}"?`)) return;
    try {
      await deleteAsignacion.mutateAsync(active.id);
      setTintaId('');
    } catch {
      alert('Error al eliminar la asignación de tinta');
    }
  };

  const tintaActual = tintas?.find((t: any) => t.id === active?.tinta_id);
  const tintaActualEtiqueta = tintaActual
    ? `${tintaActual.marca || 'Sin marca'} · ${tintaActual.nombre || 'Sin nombre'}`
    : 'Sin asignar';

  return (
    <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>{maquina.nombre}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Tinta activa: <strong style={{ color: '#b4c5ff' }}>{tintaActualEtiqueta}</strong>
          </div>
        </div>
        {active?.id && (
          <button
            type="button"
            onClick={handleEliminar}
            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: '0.25rem', padding: '7px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Quitar
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '10px', alignItems: 'end' }}>
        <div>
          <label className={LBL}>Marca / set de tinta</label>
          <select className={SEL} value={tintaId} onChange={e => setTintaId(e.target.value)}>
            <option value="">Seleccionar marca</option>
            {Object.entries(tintasPorMarca).map(([marca, tintasMarca]) => (
              <optgroup key={marca} label={marca}>
                {tintasMarca.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                    {t.presentacion ? ` · ${t.presentacion}` : ''}
                    {t.ml_presentacion ? ` ${t.ml_presentacion} ml` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={createAsignacion.isPending || updateAsignacion.isPending}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.25rem', padding: '9px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: createAsignacion.isPending || updateAsignacion.isPending ? 0.7 : 1 }}
        >
          {active?.id ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
        Una máquina mantiene una sola tinta activa. El consumo por m² debe salir del esquema de costeo de máquina; si aún no existe el campo, no lo forzamos para no romper el guardado.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function Configuracion() {
  const { data: config, isLoading: loadingConfig } = useConfiguracionNegocio();
  const { data: maquinas, isLoading: loadingMaquinas } = useMaquinas();
  const { data: tintas } = useTintas();
  const updateConfig = useUpdateConfiguracion();
  const createMaquina = useCreateMaquina();
  const updateMaquina = useUpdateMaquina();
  const deleteMaquina = useDeleteMaquina();

  const [activeTab, setActiveTab] = useState<TabType>('negocio');
  const [configLocal, setConfigLocal] = useState<Record<string, string>>({});
  const [showMaquinaForm, setShowMaquinaForm] = useState(false);
  const [editingMaquinaId, setEditingMaquinaId] = useState<string | null>(null);
  const [maquinaForm, setMaquinaForm] = useState<MaquinaForm>(emptyMaquinaForm);
  const [saving, setSaving] = useState(false);

  const isLoading = loadingConfig || loadingMaquinas;

  useEffect(() => {
    if (!config) return;

    const configRows = Array.isArray(config)
      ? config
      : [config];

    const map: Record<string, string> = {};
    configRows.forEach((item: any) => {
      map[item.clave] = item.valor || '';
    });
    setConfigLocal(map);
  }, [config]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      for (const [clave, valor] of Object.entries(configLocal)) {
        await updateConfig.mutateAsync({ clave, valor });
      }
      alert('Configuración guardada correctamente');
    } catch {
      alert('Error al guardar la configuración');
    }
    setSaving(false);
  };

  const handleMaquinaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maquinaForm.nombre) { alert('El nombre de la máquina es obligatorio'); return; }
    const data = {
      nombre: maquinaForm.nombre,
      tipo: maquinaForm.tipo,
      ancho_maximo: maquinaForm.ancho_maximo ? parseFloat(maquinaForm.ancho_maximo) : null,
      velocidad: maquinaForm.velocidad || null,
      costo_hora: maquinaForm.costo_hora ? parseFloat(maquinaForm.costo_hora) : null,
      estado: maquinaForm.estado,
    };
    try {
      if (editingMaquinaId) {
        await updateMaquina.mutateAsync({ id: editingMaquinaId, ...data });
      } else {
        await createMaquina.mutateAsync(data);
      }
      setMaquinaForm(emptyMaquinaForm);
      setEditingMaquinaId(null);
      setShowMaquinaForm(false);
    } catch { alert('Error al guardar la máquina'); }
  };

  const handleEditMaquina = (m: any) => {
    setMaquinaForm({
      nombre: m.nombre || '',
      tipo: (m.tipo || 'impresion') as MaquinaTipo,
      ancho_maximo: m.ancho_maximo?.toString() || '',
      velocidad: m.velocidad || '',
      costo_hora: m.costo_hora?.toString() || '',
      estado: m.estado || 'disponible',
    });
    setEditingMaquinaId(m.id);
    setShowMaquinaForm(true);
  };

  const handleDeleteMaquina = async (id: string) => {
    if (!confirm('¿Eliminar esta máquina?')) return;
    try { await deleteMaquina.mutateAsync(id); } catch { alert('Error al eliminar la máquina'); }
  };

  const setConf = (key: string, val: string) => setConfigLocal(prev => ({ ...prev, [key]: val }));

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', marginBottom: '4px', letterSpacing: '0.05em' }}>
          Configuración / {activeTab === 'negocio' ? 'Negocio' : activeTab === 'maquinas' ? 'Máquinas' : 'Precios'}
        </p>
        <h1 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff', margin: 0, letterSpacing: '-0.01em' }}>
          Configuración
        </h1>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', background: '#131b2e', borderRadius: '0.5rem', padding: '4px', width: 'fit-content' }}>
        {([
          { key: 'negocio',  icon: 'business',    label: 'Negocio' },
          { key: 'maquinas', icon: 'print',        label: 'Máquinas' },
          { key: 'precios',  icon: 'attach_money', label: 'Precios' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: activeTab === t.key ? '#222a3d' : 'transparent', color: activeTab === t.key ? '#b4c5ff' : '#64748B', transition: 'all 0.15s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: NEGOCIO
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'negocio' && (
        <Panel>
          <PanelHeader icon="business" title="Datos del Negocio" />
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className={LBL}>Nombre del Negocio</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>storefront</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['nombre_negocio'] || ''}
                    onChange={e => setConf('nombre_negocio', e.target.value)}
                    placeholder="Blue Impresión" />
                </div>
              </div>
              <div>
                <label className={LBL}>RUT / RIF</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>badge</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['rut'] || ''}
                    onChange={e => setConf('rut', e.target.value)}
                    placeholder="12.345.678-9" />
                </div>
              </div>
              <div>
                <label className={LBL}>Teléfono</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>phone</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['telefono'] || ''}
                    onChange={e => setConf('telefono', e.target.value)}
                    placeholder="+58 412-..." />
                </div>
              </div>
              <div>
                <label className={LBL}>Email</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>mail</span>
                  <input type="email" className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['email'] || ''}
                    onChange={e => setConf('email', e.target.value)}
                    placeholder="contacto@blue.com" />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={LBL}>Dirección</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>location_on</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['direccion'] || ''}
                    onChange={e => setConf('direccion', e.target.value)}
                    placeholder="Calle Principal 123, Ciudad" />
                </div>
              </div>
              <div>
                <label className={LBL}>Sitio Web</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>language</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['web'] || ''}
                    onChange={e => setConf('web', e.target.value)}
                    placeholder="www.blueimpresion.com" />
                </div>
              </div>
              <div>
                <label className={LBL}>Instagram</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>photo_camera</span>
                  <input className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['instagram'] || ''}
                    onChange={e => setConf('instagram', e.target.value)}
                    placeholder="@blueimpresion" />
                </div>
              </div>
            </div>
            <div>
              <label className={LBL}>Nota de pie para PDF / Cotizaciones</label>
              <textarea className={INP} rows={3} style={{ resize: 'vertical' }}
                value={configLocal['nota_pdf'] || ''}
                onChange={e => setConf('nota_pdf', e.target.value)}
                placeholder="Ej: Precios sujetos a cambio sin previo aviso. Validez 7 días." />
            </div>
            <div style={{ padding: '16px', borderRadius: '0.5rem', border: '1px solid rgba(180,197,255,0.18)', background: 'rgba(180,197,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b4c5ff', margin: 0 }}>
                    Migración gradual
                  </p>
                  <p style={{ fontSize: '13px', color: '#dae2fd', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Activa o desactiva la lógica de recetas de producto. Cuando está apagada, el CRM vuelve a un modo simple:
                    no calcula preconsumo, no descuenta materiales por receta y deja el inventario como control manual.
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '8px 0 0', lineHeight: 1.5 }}>
                    Los productos existentes se mantienen como simples hasta que marques <strong style={{ color: '#F8FAFC' }}>Es Kit</strong> en su ficha.
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={configLocal['activar_recetas_producto'] !== 'false'}
                    onChange={e => setConf('activar_recetas_producto', e.target.checked ? 'true' : 'false')}
                    style={{ width: '18px', height: '18px', accentColor: '#b4c5ff' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
                    Recetas activas
                  </span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SaveBtn onClick={handleSaveConfig} saving={saving} />
            </div>
          </div>
        </Panel>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: MÁQUINAS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'maquinas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              {maquinas?.length || 0} máquina{maquinas?.length !== 1 ? 's' : ''} registrada{maquinas?.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setShowMaquinaForm(true); setMaquinaForm(emptyMaquinaForm); setEditingMaquinaId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Agregar Máquina
            </button>
          </div>

          {/* Formulario */}
          {showMaquinaForm && (
            <Panel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,14,32,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#b4c5ff' }}>print</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                    {editingMaquinaId ? 'Editar Máquina' : 'Nueva Máquina'}
                  </span>
                </div>
                <button onClick={() => { setShowMaquinaForm(false); setEditingMaquinaId(null); setMaquinaForm(emptyMaquinaForm); }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '4px 10px', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span> Cancelar
                </button>
              </div>
              <form onSubmit={handleMaquinaSubmit} style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label className={LBL}>Nombre *</label>
                  <input className={INP} value={maquinaForm.nombre} onChange={e => setMaquinaForm({ ...maquinaForm, nombre: e.target.value })} placeholder="Ej: Plotter HP Latex 335" required />
                </div>
                <div>
                  <label className={LBL}>Tipo</label>
                  <select className={SEL} value={maquinaForm.tipo} onChange={e => setMaquinaForm({ ...maquinaForm, tipo: e.target.value as MaquinaTipo })}>
                    <option value="impresion">Impresión</option>
                    <option value="corte">Corte</option>
                    <option value="uv">UV</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={LBL}>Ancho Máximo (cm)</label>
                  <input type="number" step="0.01" className={INP} value={maquinaForm.ancho_maximo} onChange={e => setMaquinaForm({ ...maquinaForm, ancho_maximo: e.target.value })} placeholder="320" />
                </div>
                <div>
                  <label className={LBL}>Costo / Hora ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                    <input type="number" step="0.01" className={INP} style={{ paddingLeft: '22px' }} value={maquinaForm.costo_hora} onChange={e => setMaquinaForm({ ...maquinaForm, costo_hora: e.target.value })} placeholder="5000" />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Estado</label>
                  <select className={SEL} value={maquinaForm.estado} onChange={e => setMaquinaForm({ ...maquinaForm, estado: e.target.value })}>
                    <option value="disponible">Disponible</option>
                    <option value="en_uso">En Uso</option>
                    <option value="mantenimiento">Mantención</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={createMaquina.isPending || updateMaquina.isPending}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '9px 0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: createMaquina.isPending || updateMaquina.isPending ? 0.7 : 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
                    {createMaquina.isPending || updateMaquina.isPending ? 'Guardando...' : editingMaquinaId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {/* Tabla de máquinas */}
          <Panel>
            {!maquinas || maquinas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748B' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.4 }}>print</span>
                <p style={{ fontSize: '14px', margin: 0 }}>No hay máquinas registradas</p>
                <button onClick={() => setShowMaquinaForm(true)}
                  style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Agregar primera máquina
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(6,14,32,0.5)' }}>
                      {['MÁQUINA', 'TIPO', 'ANCHO MÁX.', 'COSTO/HORA', 'HORAS USO', 'ESTADO', 'ACCIONES'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {maquinas.map(m => {
                      const ei = ESTADO_MAQUINA[m.estado] || ESTADO_MAQUINA['disponible'];
                      return (
                        <tr key={m.id}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,42,61,0.5)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '0.375rem', background: 'rgba(180,197,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#b4c5ff' }}>print</span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{m.nombre}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94A3B8', textTransform: 'capitalize' }}>{formatMaquinaTipo(m.tipo)}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#94A3B8' }}>{m.ancho_maximo ? `${m.ancho_maximo} cm` : '—'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 600, color: '#ffb95f' }}>{m.costo_hora ? `$${Number(m.costo_hora).toLocaleString('es-CL')}` : '—'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#64748B' }}>{m.horas_uso != null ? `${Number(m.horas_uso).toLocaleString()} h` : '—'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '0.125rem', background: ei.bg, color: ei.color, border: `1px solid ${ei.border}` }}>
                              {ei.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleEditMaquina(m)} title="Editar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#b4c5ff')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
                              </button>
                              <button onClick={() => handleDeleteMaquina(m.id)} title="Eliminar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader icon="palette" title="Tintas activas por máquina" />
            <div style={{ padding: '24px', display: 'grid', gap: '14px' }}>
              {(maquinas || []).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  Primero registra una máquina para poder asignarle una tinta activa.
                </div>
              ) : (
                (maquinas || []).map((maquina: any) => (
                  <MaquinaTintaActivaCard key={maquina.id} maquina={maquina} tintas={tintas || []} />
                ))
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: PRECIOS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'precios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel>
            <PanelHeader icon="info" title="Enfoque de costeo" />
            <div style={{ padding: '24px', display: 'grid', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#dae2fd', lineHeight: 1.6 }}>
                Los precios por material y parte del costeo operativo ya no se editan desde este panel.
                El catálogo de productos, los materiales y la configuración de máquinas deben ser la fuente real de costeo.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
                Aquí solo quedan los parámetros generales del negocio para no romper el cálculo histórico mientras terminamos de mover todo al modelo nuevo.
              </p>
            </div>
          </Panel>

          {/* Parámetros de negocio */}
          <Panel>
            <PanelHeader icon="tune" title="Parámetros del Negocio" />
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label className={LBL}>Margen de Ganancia (%)</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>percent</span>
                  <input type="number" step="0.1" min="0" max="200" className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['margen_ganancia'] || ''}
                    onChange={e => setConf('margen_ganancia', e.target.value)}
                    placeholder="30" />
                </div>
              </div>
              <div>
                <label className={LBL}>IVA / Impuesto (%)</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>receipt</span>
                  <input type="number" step="0.1" min="0" className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['iva'] || ''}
                    onChange={e => setConf('iva', e.target.value)}
                    placeholder="16" />
                </div>
              </div>
              <div>
                <label className={LBL}>Moneda Principal</label>
                <select className={SEL}
                  value={configLocal['moneda'] || 'USD'}
                  onChange={e => setConf('moneda', e.target.value)}>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="Binance">Binance</option>
                  <option value="BS">Bolívar (BS)</option>
                </select>
              </div>
              <div>
                <label className={LBL}>Validez Cotizaciones (días)</label>
                <input type="number" min="1" className={INP}
                  value={configLocal['validez_cotizacion'] || ''}
                  onChange={e => setConf('validez_cotizacion', e.target.value)}
                  placeholder="7" />
              </div>
              <div>
                <label className={LBL}>Mínimo de Pedido ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                  <input type="number" step="0.01" min="0" className={INP} style={{ paddingLeft: '22px' }}
                    value={configLocal['minimo_pedido'] || ''}
                    onChange={e => setConf('minimo_pedido', e.target.value)}
                    placeholder="10.00" />
                </div>
              </div>
              <div>
                <label className={LBL}>Costo tinta por m² ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                  <input type="number" step="0.01" min="0" className={INP} style={{ paddingLeft: '22px' }}
                    value={configLocal['costo_tinta_m2'] || ''}
                    onChange={e => setConf('costo_tinta_m2', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className={LBL}>Costo media / sustrato por m² ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                  <input type="number" step="0.01" min="0" className={INP} style={{ paddingLeft: '22px' }}
                    value={configLocal['costo_media_m2'] || ''}
                    onChange={e => setConf('costo_media_m2', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className={LBL}>Costo acabado por m² ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>$</span>
                  <input type="number" step="0.01" min="0" className={INP} style={{ paddingLeft: '22px' }}
                    value={configLocal['costo_acabado_m2'] || ''}
                    onChange={e => setConf('costo_acabado_m2', e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className={LBL}>M² de referencia mensual</label>
                <input type="number" step="1" min="1" className={INP}
                  value={configLocal['m2_referencia_mensual'] || ''}
                  onChange={e => setConf('m2_referencia_mensual', e.target.value)}
                  placeholder="70" />
              </div>
              <div>
                <label className={LBL}>Margen mínimo (%)</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#64748B' }}>percent</span>
                  <input type="number" step="0.1" min="0" max="200" className={INP} style={{ paddingLeft: '32px' }}
                    value={configLocal['margen_minimo_pct'] || ''}
                    onChange={e => setConf('margen_minimo_pct', e.target.value)}
                    placeholder="20" />
                </div>
              </div>
            </div>
          </Panel>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn onClick={handleSaveConfig} saving={saving} />
          </div>
        </div>
      )}
    </div>
  );
}
