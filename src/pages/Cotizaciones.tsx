import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useCotizaciones,
  useCreateCotizacion,
  useUpdateCotizacion,
  useDeleteCotizacion,
  useClientes,
  useProductos,
  useMovimientosCaja,
  useConfiguracionNegocio,
  useCreatePedido
} from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ItemCotizacion {
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  ancho: number;
  alto: number;
  precio_unitario: number;
  subtotal: number;
}

interface CotizacionForm {
  cliente_id: string;
  descripcion: string;
  items: ItemCotizacion[];
  descuento_porcentaje: string;
  notas: string;
  validez_dias: string;
  estado: string;
}

const emptyForm: CotizacionForm = {
  cliente_id: '',
  descripcion: '',
  items: [],
  descuento_porcentaje: '0',
  notas: '',
  validez_dias: '15',
  estado: 'borrador',
};

const COSTEO_SNAPSHOT_PREFIX = '[COSTEO_V1]';

const ESTADO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  borrador: { bg: 'rgba(100,116,139,0.2)', text: '#64748B', border: 'rgba(100,116,139,0.4)' },
  enviada: { bg: 'rgba(59,130,246,0.2)', text: '#3B82F6', border: 'rgba(59,130,246,0.4)' },
  aceptada: { bg: 'rgba(16,185,129,0.2)', text: '#10B981', border: 'rgba(16,185,129,0.4)' },
  rechazada: { bg: 'rgba(239,68,68,0.2)', text: '#EF4444', border: 'rgba(239,68,68,0.4)' },
};

function ClientAutocomplete({ clientes, selectedId, onSelect }: {
  clientes: any[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = clientes?.find(c => c.id === selectedId);

  useEffect(() => { if (selected && !query) setQuery(selected.nombre_completo || ''); }, [selectedId]); // eslint-disable-line

  useEffect(() => {
    function out(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  const filtered = query.length === 0
    ? clientes?.slice(0, 20) || []
    : clientes?.filter(c =>
        (c.nombre_completo || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.cedula_rif || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.telefono || '').includes(query)
      ).slice(0, 20) || [];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(''); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cliente por nombre, cédula o teléfono..."
        style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: '4px', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '200px', overflowY: 'auto' }}>
          {filtered.map(c => (
            <button key={c.id} type="button"
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onClick={() => { onSelect(c.id); setQuery(c.nombre_completo || ''); setOpen(false); }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.nombre_completo}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{c.cedula_rif && `${c.cedula_rif} · `}{c.telefono || ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductAutocomplete({ productos, onSelect }: { productos: any[]; onSelect: (p: any) => void; }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function out(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  const filtered = query.length === 0
    ? productos?.slice(0, 20) || []
    : productos?.filter(p =>
        (p.nombre || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.descripcion || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20) || [];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar y agregar producto..."
        style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: '4px', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '220px', overflowY: 'auto' }}>
          {filtered.map(p => (
            <button key={p.id} type="button"
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onClick={() => { onSelect(p); setQuery(p.nombre || ''); setOpen(false); }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{p.descripcion || 'Sin descripción'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Cotizaciones() {
  const { data: cotizaciones, isLoading: loadingCotizaciones } = useCotizaciones();
  const { data: clientes } = useClientes();
  const { data: productos } = useProductos();
  const { data: movimientos } = useMovimientosCaja();
  const { data: configuracion } = useConfiguracionNegocio();
  const createCotizacion = useCreateCotizacion();
  const updateCotizacion = useUpdateCotizacion();
  const deleteCotizacion = useDeleteCotizacion();
  const createPedido = useCreatePedido();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'lista' | 'editor'>('lista');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CotizacionForm>(emptyForm);

  const configMap = useMemo(() => {
    const configuracionRows = Array.isArray(configuracion)
      ? configuracion
      : configuracion
        ? [configuracion]
        : [];
    return configuracionRows.reduce((acc: Record<string, string>, item: any) => {
      acc[item.clave] = item.valor || '';
      return acc;
    }, {});
  }, [configuracion]);

  const parseAmount = (value: unknown, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const costosFijosMesActualUsd = useMemo(() => {
    return (movimientos || []).reduce((sum: number, mov: any) => {
      const fecha = new Date(mov.fecha || mov.created_at || new Date().toISOString());
      const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (periodo !== currentPeriod) return sum;

      const fields = String(mov.notas || '').split('|').reduce<Record<string, string>>((acc, part) => {
        const [key, ...rest] = part.split('=');
        if (!key || rest.length === 0) return acc;
        acc[key.trim()] = rest.join('=').trim();
        return acc;
      }, {});

      if (mov.categoria !== 'gastos_fijos' && fields.origen !== 'costo_fijo') return sum;

      const moneda = String(fields.moneda || '').toUpperCase();
      const tasa = parseAmount(fields.tasa, 0);
      const montoMovimiento = parseAmount(mov.monto, 0);
      const montoUsdFromNotes = parseAmount(fields.monto_usd, NaN);
      if (Number.isFinite(montoUsdFromNotes)) return sum + montoUsdFromNotes;
      if (moneda === 'BS' && tasa > 0) return sum + (montoMovimiento / tasa);
      return sum + montoMovimiento;
    }, 0);
  }, [movimientos, currentPeriod]);

  const m2Referencia = useMemo(() => {
    const raw = configMap['m2_referencia_mensual'];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 70;
  }, [configMap]);

  const costoFijoPorM2 = useMemo(() => {
    if (!m2Referencia) return 0;
    return costosFijosMesActualUsd / m2Referencia;
  }, [costosFijosMesActualUsd, m2Referencia]);

  const costoTintaM2 = parseAmount(configMap['costo_tinta_m2'], 0);
  const costoMediaM2 = parseAmount(configMap['costo_media_m2'], 0);
  const costoAcabadoM2 = parseAmount(configMap['costo_acabado_m2'], 0);
  const margenGananciaPct = parseAmount(configMap['margen_ganancia'], 30);
  const margenMinimoPct = parseAmount(configMap['margen_minimo_pct'], 20);
  const costoBaseM2 = costoTintaM2 + costoMediaM2 + costoAcabadoM2 + costoFijoPorM2;

  const parseNotasEditables = (notas?: string | null) => {
    return String(notas || '')
      .split('\n')
      .filter(line => !line.trim().startsWith(COSTEO_SNAPSHOT_PREFIX))
      .join('\n')
      .trim();
  };

  const buildCosteoSnapshot = (data: {
    costo_estimado_usd: number;
    margen_pct: number;
    utilidad_estimada_usd: number;
    base_m2_usd: number;
    fecha: string;
    version: number;
  }) => {
    return `${COSTEO_SNAPSHOT_PREFIX} costo_estimado_usd=${data.costo_estimado_usd.toFixed(2)}|margen_pct=${data.margen_pct.toFixed(2)}|utilidad_estimada_usd=${data.utilidad_estimada_usd.toFixed(2)}|base_m2_usd=${data.base_m2_usd.toFixed(2)}|fecha=${data.fecha}|version=${data.version}`;
  };

  const calcularCosteoItem = (item: ItemCotizacion) => {
    const area = item.ancho > 0 && item.alto > 0 ? item.cantidad * item.ancho * item.alto : 0;
    const precio = Number(item.precio_unitario) || 0;
    const subtotal = Number(item.subtotal) || 0;
    const costoBaseReferencia = area > 0
      ? area * costoBaseM2
      : (precio > 0 ? precio * (1 - (margenGananciaPct / 100)) : 0);
    const costoEstimado = Math.max(0, costoBaseReferencia);
    const utilidadEstimada = Math.max(0, subtotal - costoEstimado);
    const margenRealPct = subtotal > 0 ? (utilidadEstimada / subtotal) * 100 : 0;

    return { area, costoEstimado, utilidadEstimada, margenRealPct };
  };

  const subtotalBrutoVista = form.items.reduce((sum, item) => sum + item.subtotal, 0);
  const descuentoMontoVista = subtotalBrutoVista * (parseFloat(form.descuento_porcentaje) / 100);
  const totalNetoVista = subtotalBrutoVista - descuentoMontoVista;
  const costeoItems = form.items.map(calcularCosteoItem);
  const costoEstimadoTotal = costeoItems.reduce((sum, item) => sum + item.costoEstimado, 0);
  const utilidadEsperadaTotal = Math.max(0, totalNetoVista - costoEstimadoTotal);
  const margenEsperadoTotalPct = totalNetoVista > 0 ? (utilidadEsperadaTotal / totalNetoVista) * 100 : 0;
  const costeoBajoMinimo = totalNetoVista > 0 && margenEsperadoTotalPct < margenMinimoPct;

  const isLoading = loadingCotizaciones;

  const filteredCotizaciones = cotizaciones?.filter(c =>
    !search ||
    c.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    c.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const calcularSubtotal = (item: ItemCotizacion) => {
    if (item.ancho > 0 && item.alto > 0) {
      return item.cantidad * item.ancho * item.alto * item.precio_unitario;
    }
    return item.cantidad * item.precio_unitario;
  };

  const agregarItem = () => {
    setForm({
      ...form,
      items: [...form.items, {
        producto_id: '',
        descripcion: '',
        cantidad: 1,
        ancho: 0,
        alto: 0,
        precio_unitario: 0,
        subtotal: 0,
      }],
    });
  };

  const actualizarItem = (index: number, campo: keyof ItemCotizacion, valor: any) => {
    const nuevosItems = [...form.items];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };

    if (['cantidad', 'ancho', 'alto', 'precio_unitario'].includes(campo)) {
      nuevosItems[index].subtotal = calcularSubtotal(nuevosItems[index]);
    }

    setForm({ ...form, items: nuevosItems });
  };

  const eliminarItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (estadoOverride?: string) => {
    if (!form.descripcion || form.items.length === 0) {
      alert('Descripción y al menos un item son obligatorios');
      return;
    }

    const cliente = clientes?.find(c => c.id === form.cliente_id);
    const estado = estadoOverride || form.estado;
    const notasBase = parseNotasEditables(form.notas);
    const snapshot = buildCosteoSnapshot({
      costo_estimado_usd: costoEstimadoTotal,
      margen_pct: margenEsperadoTotalPct,
      utilidad_estimada_usd: utilidadEsperadaTotal,
      base_m2_usd: costoBaseM2,
      fecha: new Date().toISOString(),
      version: 1,
    });

    const cotizacionData = {
      cliente_id: form.cliente_id || null,
      cliente_nombre: cliente?.nombre_completo || 'Sin cliente',
      descripcion: form.descripcion,
      items: form.items,
      subtotal: subtotalBrutoVista,
      descuento_porcentaje: parseFloat(form.descuento_porcentaje) || 0,
      total: totalNetoVista,
      notas: [notasBase, snapshot].filter(Boolean).join('\n\n') || null,
      validez_dias: parseInt(form.validez_dias) || 15,
      estado,
    };

    try {
      if (editingId) {
        await updateCotizacion.mutateAsync({ id: editingId, ...cotizacionData });
      } else {
        await createCotizacion.mutateAsync(cotizacionData);
      }

      setForm(emptyForm);
      setEditingId(null);
      setView('lista');
    } catch (error) {
      console.error('Error guardando cotización:', error);
      alert('Error al guardar la cotización');
    }
  };

  const handleEdit = (cotizacion: any) => {
    setForm({
      cliente_id: cotizacion.cliente_id || '',
      descripcion: cotizacion.descripcion || '',
      items: cotizacion.items || [],
      descuento_porcentaje: cotizacion.descuento_porcentaje?.toString() || '0',
      notas: parseNotasEditables(cotizacion.notas || ''),
      validez_dias: cotizacion.validez_dias?.toString() || '15',
      estado: cotizacion.estado || 'borrador',
    });
    setEditingId(cotizacion.id);
    setView('editor');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await deleteCotizacion.mutateAsync(id);
    } catch (error) {
      console.error('Error eliminando cotización:', error);
    }
  };

  const handleConvertirAPedido = async (cotizacion: any) => {
    if (!confirm('¿Convertir esta cotización en un pedido?')) return;

    try {
      const notasPedido = JSON.stringify({
        items: cotizacion.items || [],
        note_text: [
          cotizacion.notas || '',
          `Generado desde cotización #${cotizacion.id?.slice(0, 8)}`,
        ].filter(Boolean).join('\n\n'),
        payment: {
          source: 'cotizacion',
        },
      });

      await createPedido.mutateAsync({
        cliente_id: cotizacion.cliente_id,
        descripcion: cotizacion.descripcion,
        precio_total: cotizacion.total,
        estado: 'pendiente',
        notas: notasPedido,
      });

      await updateCotizacion.mutateAsync({
        id: cotizacion.id,
        estado: 'aceptada'
      });

      alert('Pedido creado exitosamente');
    } catch (error) {
      console.error('Error creando pedido:', error);
      alert('Error al crear el pedido');
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setView('lista');
  };

  const duplicarCotizacion = (cotizacion: any) => {
    setForm({
      cliente_id: cotizacion.cliente_id || '',
      descripcion: `${cotizacion.descripcion} (copia)`,
      items: cotizacion.items || [],
      descuento_porcentaje: cotizacion.descuento_porcentaje?.toString() || '0',
      notas: parseNotasEditables(cotizacion.notas || ''),
      validez_dias: cotizacion.validez_dias?.toString() || '15',
      estado: 'borrador',
    });
    setEditingId(null);
    setView('editor');
  };

  const openNueva = () => {
    setForm(emptyForm);
    setEditingId(null);
    setView('editor');
  };

  // Stats
  const stats = {
    total: cotizaciones?.length || 0,
    borradores: cotizaciones?.filter(c => c.estado === 'borrador').length || 0,
    aceptadas: cotizaciones?.filter(c => c.estado === 'aceptada').length || 0,
    totalCotizado: cotizaciones?.filter(c => c.estado !== 'rechazada')
      .reduce((sum, c) => sum + (c.total || 0), 0) || 0,
  };

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('es-CL');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ─── VISTA A: LISTA ─────────────────────────────────────────────
  if (view === 'lista') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cotizaciones / Lista
            </p>
            <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
              Cotizaciones
            </h1>
          </div>
          <button
            onClick={openNueva}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, padding: '10px 20px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Nueva Cotización
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: 'request_quote', color: '#b4c5ff' },
            { label: 'Borradores', value: stats.borradores, icon: 'edit_note', color: '#64748B' },
            { label: 'Aceptadas', value: stats.aceptadas, icon: 'task_alt', color: '#10B981' },
            { label: 'Total Cotizado', value: formatCurrency(stats.totalCotizado), icon: 'payments', color: '#ffb95f' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: '24px' }}>{stat.icon}</span>
              </div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>{stat.value}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative">
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '20px' }}>search</span>
          <input
            type="text"
            placeholder="Buscar por descripción, cliente o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '10px 12px 10px 40px', color: '#dae2fd', fontSize: '14px', width: '100%', outline: 'none' }}
          />
        </div>

        {/* Tabla */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(6,14,32,0.5)' }}>
                {['COTIZACIÓN', 'CLIENTE', 'ESTADO', 'VALIDEZ', 'TOTAL', 'ACCIONES'].map(h => (
                  <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCotizaciones.map((cotizacion) => {
                const ec = ESTADO_COLORS[cotizacion.estado] || ESTADO_COLORS.borrador;
                return (
                  <tr key={cotizacion.id} className="group" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(34,42,61,0.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* COTIZACIÓN */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#b4c5ff' }}>
                        #{cotizacion.id?.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{cotizacion.descripcion}</div>
                    </td>
                    {/* CLIENTE */}
                    <td style={{ padding: '12px 16px', color: '#dae2fd', fontSize: '13px' }}>
                      {cotizacion.cliente_nombre || 'Sin cliente'}
                    </td>
                    {/* ESTADO */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '0.125rem',
                        backgroundColor: ec.bg,
                        color: ec.text,
                        border: `1px solid ${ec.border}`,
                      }}>
                        {cotizacion.estado}
                      </span>
                    </td>
                    {/* VALIDEZ */}
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '13px' }}>
                      {cotizacion.validez_dias} días
                    </td>
                    {/* TOTAL */}
                    <td style={{ padding: '12px 16px', fontFamily: 'Geist, sans-serif', fontWeight: 700, color: '#b4c5ff', fontSize: '14px' }}>
                      {formatCurrency(cotizacion.total || 0)}
                    </td>
                    {/* ACCIONES */}
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(cotizacion)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b4c5ff', padding: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                        <button onClick={() => duplicarCotizacion(cotizacion)} title="Duplicar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
                        </button>
                        {(cotizacion.estado === 'enviada' || cotizacion.estado === 'aceptada') && (
                          <button onClick={() => handleConvertirAPedido(cotizacion)} title="Convertir a pedido" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffb95f', padding: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_cart</span>
                          </button>
                        )}
                        <button onClick={() => handleDelete(cotizacion.id)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCotizaciones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>request_quote</span>
              {search ? 'No se encontraron cotizaciones' : 'No hay cotizaciones registradas'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VISTA B: EDITOR SPLIT ──────────────────────────────────────
  const subtotalBruto = form.items.reduce((s, it) => s + it.subtotal, 0);
  const descuentoMonto = subtotalBruto * (parseFloat(form.descuento_porcentaje) / 100);
  const totalNeto = subtotalBruto - descuentoMonto;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header editor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cotizaciones / Editor
          </p>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
            {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit()}
            disabled={createCotizacion.isPending || updateCotizacion.isPending}
            style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            {(createCotizacion.isPending || updateCotizacion.isPending) ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', color: '#94A3B8', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-12 gap-6">
        {/* ─── Columna izquierda ─── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Panel Información del Cliente */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '24px' }}>
              <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '20px' }}>person</span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px' }}>Información del Cliente</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>SELECCIONAR CLIENTE</label>
                <ClientAutocomplete
                  clientes={clientes || []}
                  selectedId={form.cliente_id}
                  onSelect={id => setForm({ ...form, cliente_id: id })}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>DESCRIPCIÓN / TÍTULO</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ej: Lona publicitaria 3x6m + estructura"
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>FECHA VENCIMIENTO</label>
                <input
                  type="date"
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>VALIDEZ EN DÍAS</label>
                <input
                  type="number"
                  min="1"
                  value={form.validez_dias}
                  onChange={(e) => setForm({ ...form, validez_dias: e.target.value })}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Panel Ítems */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '20px' }}>list_alt</span>
                <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px' }}>Ítems de la Cotización</span>
              </div>
              <button
                onClick={agregarItem}
                style={{ background: 'none', border: 'none', color: '#b4c5ff', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                Agregar Ítem
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>AGREGAR DESDE PRODUCTO</label>
              <ProductAutocomplete
                productos={productos || []}
                onSelect={(p) => {
                  setForm(prev => ({
                    ...prev,
                    items: [...prev.items, {
                      producto_id: p.id,
                      descripcion: p.nombre || '',
                      cantidad: 1,
                      ancho: 0,
                      alto: 0,
                      precio_unitario: Number(p.precio_m2 || 0),
                      subtotal: Number(p.precio_m2 || 0),
                    }],
                  }));
                }}
              />
            </div>

            {form.items.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Descripción', 'Cant.', 'Ancho(m)', 'Alto(m)', 'P.Unit($)', 'Costo($)', 'Margen', 'Total($)', ''].map(h => (
                        <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {(() => {
                          const costeoItem = calcularCosteoItem(item);
                          return (
                            <>
                              <td style={{ padding: '6px' }}>
                                <input value={item.descripcion} onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)} placeholder="Detalle"
                                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '6px 8px', fontSize: '13px', color: '#dae2fd', width: '100%', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px', width: '70px' }}>
                                <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '6px 8px', fontSize: '13px', color: '#dae2fd', width: '100%', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px', width: '90px' }}>
                                <input type="number" step="0.01" min="0" value={item.ancho} onChange={(e) => actualizarItem(index, 'ancho', parseFloat(e.target.value) || 0)}
                                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '6px 8px', fontSize: '13px', color: '#dae2fd', width: '100%', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px', width: '90px' }}>
                                <input type="number" step="0.01" min="0" value={item.alto} onChange={(e) => actualizarItem(index, 'alto', parseFloat(e.target.value) || 0)}
                                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '6px 8px', fontSize: '13px', color: '#dae2fd', width: '100%', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px', width: '100px' }}>
                                <input type="number" step="0.01" min="0" value={item.precio_unitario} onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '6px 8px', fontSize: '13px', color: '#dae2fd', width: '100%', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px 8px', fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#dae2fd', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {formatCurrency(costeoItem.costoEstimado)}
                              </td>
                              <td style={{ padding: '6px 8px', fontFamily: 'Geist, sans-serif', fontWeight: 600, color: costeoItem.margenRealPct < margenMinimoPct ? '#EF4444' : '#10B981', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {costeoItem.margenRealPct.toFixed(1)}%
                              </td>
                              <td style={{ padding: '6px 8px', fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#b4c5ff', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {formatCurrency(item.subtotal)}
                              </td>
                              <td style={{ padding: '6px', width: '40px' }}>
                                <button onClick={() => eliminarItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                </button>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <button
              onClick={agregarItem}
              style={{ width: '100%', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '12px', color: '#64748B', background: 'none', cursor: 'pointer', fontSize: '13px', marginTop: form.items.length > 0 ? '16px' : '0', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#b4c5ff'; e.currentTarget.style.color = '#b4c5ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748B'; }}
            >
              + Agregar Ítem
            </button>
          </div>

          {/* Panel Notas */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>NOTAS / CONDICIONES</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={4}
              placeholder="Notas adicionales, condiciones de pago, etc."
              style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '10px 12px', fontSize: '14px', width: '100%', outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ─── Columna derecha ─── */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Panel Resumen */}
          <div style={{ backgroundColor: '#222a3d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <div className="space-y-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Subtotal</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>{formatCurrency(subtotalBruto)}</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>Descuento (%)</span>
                  <span style={{ color: '#ffb95f', fontWeight: 700, fontSize: '14px' }}>{form.descuento_porcentaje}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={form.descuento_porcentaje}
                  onChange={(e) => setForm({ ...form, descuento_porcentaje: e.target.value })}
                  style={{ width: '100%', accentColor: '#ffb95f' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>Total neto</span>
                <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '16px' }}>{formatCurrency(totalNeto)}</span>
              </div>
            </div>

            {/* Card total destacada */}
            <div style={{ backgroundColor: '#2563eb', borderRadius: '0.5rem', padding: '16px', marginTop: '16px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL A PAGAR</div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '32px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>{formatCurrency(totalNeto)}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' }}>Válido {form.validez_dias} días</div>
            </div>

            <div style={{ backgroundColor: 'rgba(6,14,32,0.72)', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '0.5rem', padding: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COSTEO INTERNO</div>
                  <div style={{ color: '#dae2fd', fontSize: '13px', marginTop: '4px' }}>
                    Base m2 {formatCurrency(costoBaseM2)} · Margen meta {margenGananciaPct.toFixed(1)}%
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ color: costeoBajoMinimo ? '#EF4444' : '#10B981', fontSize: '24px' }}>
                  {costeoBajoMinimo ? 'warning' : 'check_circle'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div style={{ backgroundColor: '#060e20', borderRadius: '0.4rem', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Costo</div>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, marginTop: '4px' }}>{formatCurrency(costoEstimadoTotal)}</div>
                </div>
                <div style={{ backgroundColor: '#060e20', borderRadius: '0.4rem', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Utilidad</div>
                  <div style={{ color: '#10B981', fontWeight: 700, marginTop: '4px' }}>{formatCurrency(utilidadEsperadaTotal)}</div>
                </div>
                <div style={{ backgroundColor: '#060e20', borderRadius: '0.4rem', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Margen</div>
                  <div style={{ color: costeoBajoMinimo ? '#EF4444' : '#ffb95f', fontWeight: 700, marginTop: '4px' }}>{margenEsperadoTotalPct.toFixed(1)}%</div>
                </div>
              </div>
              {costeoBajoMinimo && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#FCA5A5' }}>
                  El margen esperado está bajo el mínimo configurado.
                </div>
              )}
            </div>
          </div>

          {/* Select estado */}
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
            <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>ESTADO</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
            >
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={() => handleSubmit('borrador')}
              disabled={createCotizacion.isPending || updateCotizacion.isPending}
              style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#b4c5ff', padding: '10px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Guardar Borrador
            </button>
            <button
              onClick={() => handleSubmit('enviada')}
              disabled={createCotizacion.isPending || updateCotizacion.isPending}
              style={{ width: '100%', backgroundColor: '#2563eb', border: 'none', color: '#ffffff', fontWeight: 700, padding: '10px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px' }}
            >
              {(createCotizacion.isPending || updateCotizacion.isPending) ? 'Guardando...' : 'Guardar y Enviar'}
            </button>
            <button
              onClick={handleCancel}
              style={{ width: '100%', background: 'none', border: 'none', color: '#94A3B8', padding: '10px 16px', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
