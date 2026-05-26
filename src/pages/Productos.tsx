import { useEffect, useMemo, useState } from 'react';
import {
  useProductos,
  useCreateProducto,
  useUpdateProducto,
  useMateriales,
  useMovimientosCaja,
  useComprasMaterial,
  useProductoMateriales,
  useCreateProductoMaterial,
  useDeleteProductoMaterial,
  useDeleteProducto,
  useConfiguracionNegocio,
  useOrdenesCompra,
} from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProductoForm {
  nombre: string;
  precio_m2: string;
  tipo_cobro: 'm2' | 'unidad';
  descripcion: string;
  es_kit: boolean;
}

const emptyForm: ProductoForm = { nombre: '', precio_m2: '', tipo_cobro: 'm2', descripcion: '', es_kit: false };


const UNIDAD_LABELS: Record<string, string> = {
  m2: 'm²', por_m2: 'm²', unidad: 'Unidad', por_unidad: 'Unidad',
  metro: 'Metro', pieza: 'Pieza', ml: 'ml', litro: 'Litro',
  kg: 'Kg', gramo: 'Gramo', corte: 'Corte',
};

function getUnidadLabel(v: string) { return UNIDAD_LABELS[v] || v; }

function isM2Producto(p: any) { return p?.tipo_cobro === 'm2' || p?.tipo_cobro === 'mt2'; }
function normalizeTipoCobro(t?: string): 'm2' | 'unidad' { return t === 'unidad' ? 'unidad' : 'm2'; }

function parseNotaFields(notas?: string | null): Record<string, string> {
  return (notas || '').split('|').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return acc;
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});
}

const parseNum = (v: unknown, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

const fmtMoney = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem',
  backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '0.25rem', color: '#F8FAFC',
  fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none', height: '2.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem',
};

export default function Productos() {
  const { data: productos, isLoading } = useProductos();
  const { data: materiales } = useMateriales();
  const { data: movimientos } = useMovimientosCaja();
  const { data: comprasMaterial } = useComprasMaterial();
  const { data: configuracion } = useConfiguracionNegocio();
  const { data: ordenesCompra } = useOrdenesCompra();
  const createProducto = useCreateProducto();
  const updateProducto = useUpdateProducto();
  const createMat = useCreateProductoMaterial();
  const deleteMat = useDeleteProductoMaterial();
  const deleteProducto = useDeleteProducto();

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'm2' | 'unidad'>('todos');
  const [drawerProducto, setDrawerProducto] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductoForm>(emptyForm);
  const [newComp, setNewComp] = useState({ material_id: '', cantidad: '', unidad: 'm2' });
  const [materialSearch, setMaterialSearch] = useState('');
  const [costModal, setCostModal] = useState<any>(null);
  const [addingComp, setAddingComp] = useState(false);

  const drawerProductId = drawerProducto?.id && drawerProducto.id !== '__new__' ? drawerProducto.id : undefined;
  const { data: drawerMaterials } = useProductoMateriales(drawerProductId);
  const { data: costModalMaterials } = useProductoMateriales(costModal?.id);

  const materialMap = useMemo(
    () => new Map((materiales || []).map((m: any) => [m.id, m])),
    [materiales],
  );

  const filteredMateriales = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    return [...(materiales || [])].filter((m: any) => {
      if (!term) return true;
      const text = `${m.nombre || ''} ${m.tipo || ''} ${m.descripcion || ''} ${m.unidad_medida || ''}`.toLowerCase();
      return text.includes(term);
    }).sort((a: any, b: any) => {
      const nameA = String(a.nombre || a.tipo || a.descripcion || '').toLowerCase();
      const nameB = String(b.nombre || b.tipo || b.descripcion || '').toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });
  }, [materiales, materialSearch]);

  const compraPriceMap = useMemo(() => {
    const latestByMaterial = new Map<string, { fecha: number; unitPrice: number }>();
    (comprasMaterial || []).forEach((compra: any) => {
      if (!compra?.material_id) return;
      const qty = Number(compra.cantidad || 0);
      const totalUsd = Number(compra.precio_usd || 0);
      if (!(qty > 0) || !(totalUsd >= 0)) return;

      const fecha = new Date(compra.fecha_compra || compra.created_at || Date.now()).getTime();
      const unitPrice = totalUsd / qty;
      const current = latestByMaterial.get(compra.material_id);
      if (!current || fecha >= current.fecha) {
        latestByMaterial.set(compra.material_id, { fecha, unitPrice });
      }
    });
    return latestByMaterial;
  }, [comprasMaterial]);

  const configMap = useMemo(() => {
    const rows = Array.isArray(configuracion) ? configuracion : configuracion ? [configuracion] : [];
    return rows.reduce((acc: Record<string, string>, item: any) => { acc[item.clave] = item.valor || ''; return acc; }, {});
  }, [configuracion]);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const costosFijosUsd = useMemo(() => (movimientos || []).reduce((sum: number, mov: any) => {
    const fecha = new Date(mov.fecha || mov.created_at || new Date().toISOString());
    const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (periodo !== currentPeriod) return sum;
    const fields = parseNotaFields(mov.notas);
    if (mov.categoria !== 'gastos_fijos' && fields.origen !== 'costo_fijo') return sum;
    const moneda = String(fields.moneda || '').toUpperCase();
    const tasa = parseNum(fields.tasa, 0);
    const monto = parseNum(mov.monto, 0);
    const montoUsd = parseNum(fields.monto_usd, NaN);
    if (Number.isFinite(montoUsd)) return sum + montoUsd;
    if (moneda === 'BS' && tasa > 0) return sum + monto / tasa;
    return sum + monto;
  }, 0), [movimientos, currentPeriod]);

  const m2Ref = useMemo(() => { const n = Number(configMap['m2_referencia_mensual']); return Number.isFinite(n) && n > 0 ? n : 70; }, [configMap]);
  const costoFijoPorM2 = costosFijosUsd / m2Ref;
  const costoTintaM2 = parseNum(configMap['costo_tinta_m2']);
  const costoMediaM2 = parseNum(configMap['costo_media_m2']);
  const costoAcabadoM2 = parseNum(configMap['costo_acabado_m2']);
  const margenPct = parseNum(configMap['margen_ganancia']);

  // Mapa de precios desde ordenes_compra → siempre en USD (convierte BS→USD con tasa_cambio)
  // Usa la orden MÁS RECIENTE por nombre de item
  const ordenPriceMap = useMemo(() => {
    const map = new Map<string, { precioUsd: number; fecha: number }>();
    (ordenesCompra || []).forEach((o: any) => {
      const nombre = (o.item_nombre || '').toLowerCase().trim();
      if (!nombre || !(parseNum(o.precio_unitario) > 0)) return;
      const moneda = String(o.moneda || 'USD').toUpperCase();
      const tasa = parseFloat(o.tasa_cambio) || 1;
      const precioUsd = moneda === 'USD' ? parseNum(o.precio_unitario)
        : moneda === 'BS' && tasa > 0 ? parseNum(o.precio_unitario) / tasa
        : parseNum(o.precio_unitario);
      const fecha = new Date(o.created_at || 0).getTime();
      const clave = nombre.split(' ')[0];
      const existing = map.get(clave);
      if (!existing || fecha > existing.fecha) map.set(clave, { precioUsd, fecha });
    });
    return map;
  }, [ordenesCompra]);

  const getMatPrice = (mat: any, materialId?: string): number => {
    if (!mat && !materialId) return 0;

    // Prioridad 1: precio de la orden de compra (tiene moneda explícita → siempre USD)
    if (mat) {
      const nombre = (mat.tipo || mat.nombre || mat.descripcion || '').toLowerCase().trim();
      const clave = nombre.split(' ')[0];
      const ordenEntry = ordenPriceMap.get(clave);
      if (ordenEntry && ordenEntry.precioUsd > 0) return ordenEntry.precioUsd;
    }

    // Prioridad 2: precio del inventario (moneda desconocida, solo si no hay orden)
    const inventoryPrice = mat
      ? (mat.unidad_medida === 'm2' ? parseNum(mat.precio_m2) : parseNum(mat.precio_unitario))
      : 0;
    if (inventoryPrice > 0) return inventoryPrice;

    // Prioridad 3: precio de compras_material
    return materialId ? compraPriceMap.get(materialId)?.unitPrice || 0 : 0;
  };

  const calcCosto = (mats: any[]) => {
    // m² totales de materiales tipo rollo (unidad_medida === 'm2') en la composición
    const m2Rollo = (mats || []).reduce((sum, row) => {
      const mat = materialMap.get(row.material_id);
      if (!mat || mat.unidad_medida !== 'm2') return sum;
      return sum + parseNum(row.cantidad_por_m2);
    }, 0);

    const matCost = (mats || []).reduce((sum, row) => {
      const mat = materialMap.get(row.material_id);
      return sum + parseNum(row.cantidad_por_m2) * getMatPrice(mat, row.material_id);
    }, 0);

    // Si hay rollo, tinta = m²_del_rollo × costo/m²; si no, costo plano (1 unidad)
    const costoTintaTotal = m2Rollo > 0 ? m2Rollo * costoTintaM2 : costoTintaM2;
    const subtotal = matCost + costoTintaTotal + costoMediaM2 + costoAcabadoM2 + costoFijoPorM2;
    const sugerido = subtotal * (1 + margenPct / 100);
    return { matCost, subtotal, sugerido, costoTintaTotal, m2Rollo };
  };

  useEffect(() => {
    if ((drawerMaterials || []).length > 0 && !form.es_kit) {
      setForm(prev => ({ ...prev, es_kit: true }));
    }
  }, [drawerMaterials?.length]);

  const filteredProductos = (productos || []).filter(p => {
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || (filterTipo === 'm2' ? isM2Producto(p) : p.tipo_cobro === 'unidad');
    return matchSearch && matchTipo;
  });

  const totalProductos = (productos || []).length;
  const productosPorM2 = (productos || []).filter(isM2Producto).length;
  const productosPorUnidad = (productos || []).filter(p => p.tipo_cobro === 'unidad').length;
  const precioPromedio = totalProductos > 0
    ? ((productos || []).reduce((s, p) => s + (p.precio_m2 || 0), 0) / totalProductos).toFixed(2)
    : '0.00';

  function openNewDrawer() {
    setForm(emptyForm);
    setEditingId(null);
    setDrawerProducto({ id: '__new__' });
    setNewComp({ material_id: '', cantidad: '', unidad: 'm2' });
    setMaterialSearch('');
  }

  function openDrawer(producto: any) {
    setForm({
      nombre: producto.nombre || '',
      precio_m2: producto.precio_m2?.toString() || '',
      tipo_cobro: normalizeTipoCobro(producto.tipo_cobro),
      descripcion: producto.descripcion || '',
      es_kit: Boolean(producto.es_kit),
    });
    setEditingId(producto.id);
    setDrawerProducto(producto);
    setNewComp({ material_id: '', cantidad: '', unidad: 'm2' });
    setMaterialSearch('');
  }

  function closeDrawer() {
    setDrawerProducto(null);
    setEditingId(null);
    setForm(emptyForm);
    setNewComp({ material_id: '', cantidad: '', unidad: 'm2' });
    setMaterialSearch('');
  }

  async function handleSubmit() {
    if (!form.nombre.trim() || !form.precio_m2) { alert('Nombre y Precio son obligatorios'); return; }
    const payload = {
      nombre: form.nombre.trim(),
      precio_por_m2: parseFloat(form.precio_m2),
      tipo_cobro: form.tipo_cobro,
      descripcion: form.descripcion,
      es_kit: form.es_kit,
    };
    if (editingId && editingId !== '__new__') {
      const saved = await updateProducto.mutateAsync({ id: editingId, updates: payload });
      setDrawerProducto(saved);
    } else {
      const saved = await createProducto.mutateAsync(payload);
      setEditingId(saved.id);
      setDrawerProducto(saved);
    }
  }

  async function handleAddComp() {
    if (!drawerProductId || !newComp.material_id || !newComp.cantidad || Number(newComp.cantidad) <= 0) {
      alert('Selecciona un material y define una cantidad mayor a cero.');
      return;
    }
    setAddingComp(true);
    try {
      await createMat.mutateAsync({
        producto_id: drawerProductId,
        material_id: newComp.material_id,
        cantidad_por_m2: Number(newComp.cantidad),
        tipo_calculo: newComp.unidad,
      });
      if (!drawerProducto?.es_kit) {
        const saved = await updateProducto.mutateAsync({ id: drawerProductId, updates: { es_kit: true } });
        setDrawerProducto(saved);
        setForm(prev => ({ ...prev, es_kit: true }));
      }
      setNewComp({ material_id: '', cantidad: '', unidad: 'm2' });
    } finally {
      setAddingComp(false);
    }
  }

  async function handleDeleteComp(rowId: string) {
    await deleteMat.mutateAsync(rowId);
  }

  async function handleApplyPrice(precio: number) {
    if (!costModal?.id) return;
    const saved = await updateProducto.mutateAsync({ id: costModal.id, updates: { precio_por_m2: precio } });
    if (editingId === costModal.id) {
      setDrawerProducto(saved);
      setForm(prev => ({ ...prev, precio_m2: precio.toFixed(2) }));
    }
    setCostModal(null);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  const costData = calcCosto(costModalMaterials || []);
  const hasOperationalConfig = (costoTintaM2 + costoMediaM2 + costoAcabadoM2 + costoFijoPorM2) > 0;

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <PageHeader
          title="Catálogo de Productos"
          description={`${filteredProductos.length} productos`}
          icon="inventory_2"
          actions={
            <button onClick={openNewDrawer} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              Nuevo Producto
            </button>
          }
        />

        {/* Búsqueda */}
        <div className="relative">
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>search</span>
          <Input className="pl-10" placeholder="Buscar por nombre o descripción..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['todos', 'm2', 'unidad'] as const).map(tipo => (
            <button key={tipo} onClick={() => setFilterTipo(tipo)} style={{ padding: '0.375rem 1rem', borderRadius: '999px', backgroundColor: filterTipo === tipo ? '#b4c5ff' : '#171f33', color: filterTipo === tipo ? '#002a78' : '#94A3B8', border: filterTipo === tipo ? 'none' : '1px solid rgba(255,255,255,0.08)', fontWeight: filterTipo === tipo ? 700 : 500, fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
              {tipo === 'todos' ? 'Todos' : tipo === 'm2' ? 'Por m²' : 'Por Unidad'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Total', value: totalProductos, icon: 'inventory_2', color: '#b4c5ff' },
            { label: 'Por m²', value: productosPorM2, icon: 'straighten', color: '#b4c5ff' },
            { label: 'Por Unidad', value: productosPorUnidad, icon: 'deployed_code', color: '#4edea3' },
            { label: 'Precio Promedio', value: `$${precioPromedio}`, icon: 'payments', color: '#ffb95f' },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>{stat.label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: stat.color }}>{stat.icon}</span>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: stat.color, margin: 0 }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProductos.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 0', color: '#94A3B8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}>inventory_2</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>{search ? 'No se encontraron productos' : 'No hay productos registrados'}</p>
            </div>
          ) : filteredProductos.map(producto => {
            const esM2 = isM2Producto(producto);
            const accentColor = esM2 ? '#b4c5ff' : '#4edea3';
            const headerBg = esM2 ? 'rgba(37,99,235,0.15)' : 'rgba(0,125,85,0.15)';
            return (
              <div key={producto.id} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,197,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; }}>
                <div style={{ height: '7rem', backgroundColor: headerBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', fontSize: '7rem', color: accentColor, opacity: 0.08, userSelect: 'none', pointerEvents: 'none' }}>{esM2 ? 'straighten' : 'deployed_code'}</span>
                  <span style={{ padding: '0.25rem 0.75rem', backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44`, borderRadius: '0.125rem', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{esM2 ? 'Por m²' : 'Por Unidad'}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setCostModal(producto)} title="Costo estimado" style={{ padding: '0.375rem', backgroundColor: 'rgba(255,185,95,0.1)', border: '1px solid rgba(255,185,95,0.25)', borderRadius: '0.25rem', cursor: 'pointer', color: '#ffb95f', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,185,95,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,185,95,0.1)')}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calculate</span>
                    </button>
                    <button onClick={() => openDrawer(producto)} style={{ padding: '0.375rem', backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}33`, borderRadius: '0.25rem', cursor: 'pointer', color: accentColor, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${accentColor}33`)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${accentColor}18`)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) return;
                      try { await deleteProducto.mutateAsync(producto.id); } catch (err: any) { alert(`Error: ${err?.message || err}`); }
                    }} style={{ padding: '0.375rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.25rem', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0, flex: 1, paddingRight: '0.5rem' }}>{producto.nombre}</h3>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', color: accentColor }}>${fmtMoney(Number(producto.precio_m2 || 0))}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{esM2 ? 'por m²' : 'por unidad'}</div>
                    </div>
                  </div>
                  {producto.descripcion && (
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#94A3B8', margin: '0 0 1rem 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{producto.descripcion}</p>
                  )}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{esM2 ? 'straighten' : 'deployed_code'}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Cobro:</span>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{esM2 ? 'Metro Cuadrado' : 'Por Unidad'}</span>
                  </div>
                  {producto.es_kit && (
                    <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', backgroundColor: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)', borderRadius: '0.25rem', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>layers</span>
                      Compuesto
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlay drawer */}
      {drawerProducto && <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />}

      {/* Drawer */}
      <aside style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: '460px', backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 70, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', transform: drawerProducto ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        {/* Drawer header */}
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b4c5ff', backgroundColor: 'rgba(180,197,255,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              {editingId && editingId !== '__new__' ? 'Editar Producto' : 'Nuevo Producto'}
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              {form.nombre || 'Nuevo Producto'}
            </h3>
          </div>
          <button onClick={closeDrawer} className="material-symbols-outlined" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>close</button>
        </header>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre *</label>
            <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del producto" />
          </div>

          {/* Precio + Tipo cobro */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Precio *</label>
              <Input type="number" step="0.01" min="0" value={form.precio_m2} onChange={e => setForm({ ...form, precio_m2: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Tipo de Cobro</label>
              <select value={form.tipo_cobro} onChange={e => setForm({ ...form, tipo_cobro: e.target.value as 'm2' | 'unidad' })} style={selectStyle}>
                <option value="m2">Por m²</option>
                <option value="unidad">Por Unidad</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" />
          </div>

          {/* Es compuesto */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', backgroundColor: form.es_kit ? 'rgba(78,222,163,0.08)' : '#171f33', border: `1px solid ${form.es_kit ? 'rgba(78,222,163,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '0.25rem', color: '#F8FAFC', fontFamily: 'Inter, sans-serif', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <input type="checkbox" checked={form.es_kit} onChange={e => setForm({ ...form, es_kit: e.target.checked })} style={{ width: '1rem', height: '1rem', accentColor: '#4edea3', cursor: 'pointer' }} />
            <div>
              <div style={{ fontWeight: 600, color: form.es_kit ? '#4edea3' : '#F8FAFC' }}>Es producto compuesto</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Al venderse descuenta materiales del inventario</div>
            </div>
          </label>

          {/* Sección composición */}
          {form.es_kit && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontFamily: 'Geist, Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: '#F8FAFC' }}>Materiales del producto</h4>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                    {drawerProductId ? 'Estos materiales se descuentan del inventario al vender.' : 'Guarda el producto primero para agregar materiales.'}
                  </p>
                </div>
                <span style={{ background: 'rgba(78,222,163,0.12)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.25)', borderRadius: '0.25rem', padding: '0.25rem 0.6rem', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {(drawerMaterials || []).length} ítem{(drawerMaterials || []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {drawerProductId ? (
                <>
                  {/* Tabla de materiales existentes */}
                  {(drawerMaterials || []).length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 36px', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#0d1525', borderRadius: '0.25rem' }}>
                        {['Material', 'Cantidad', 'Unidad', ''].map(h => (
                          <span key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>{h}</span>
                        ))}
                      </div>
                      {(drawerMaterials || []).map((row: any) => {
                        const mat = materialMap.get(row.material_id);
                        const nombreMat = mat?.nombre || mat?.tipo || mat?.descripcion || row.material_id?.slice(0, 8) || '—';
                        const unidadLabel = mat?.unidad_medida ? getUnidadLabel(mat.unidad_medida) : getUnidadLabel(row.tipo_calculo || 'm2');
                        return (
                          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 36px', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.25rem' }}>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nombreMat}>{nombreMat}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#b4c5ff', fontWeight: 700 }}>{Number(row.cantidad_por_m2)}</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8' }}>{unidadLabel}</span>
                            <button onClick={() => handleDeleteComp(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', padding: '0.25rem', opacity: 0.7 }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Agregar nuevo material */}
                  <div style={{ backgroundColor: '#060e20', border: '1px dashed rgba(180,197,255,0.2)', borderRadius: '0.25rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>Agregar material</span>
                    <Input
                      value={materialSearch}
                      onChange={e => setMaterialSearch(e.target.value)}
                      placeholder="Buscar material, por ejemplo: madera"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={newComp.material_id}
                        onChange={e => {
                          const mat = materialMap.get(e.target.value);
                          setNewComp({ ...newComp, material_id: e.target.value, unidad: mat?.unidad_medida || 'm2' });
                        }}
                        style={{ ...selectStyle, backgroundColor: '#171f33', fontSize: '13px' }}
                      >
                        <option value="">{filteredMateriales.length ? 'Seleccionar material…' : 'Sin resultados'}</option>
                        {filteredMateriales.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.nombre || m.tipo || m.descripcion || m.id}</option>
                        ))}
                      </select>
                      <Input type="number" min="0" step="0.01" value={newComp.cantidad} onChange={e => setNewComp({ ...newComp, cantidad: e.target.value })} placeholder="Cant." />
                      <div style={{ height: '2.5rem', padding: '0 0.75rem', backgroundColor: 'rgba(180,197,255,0.08)', border: '1px solid rgba(180,197,255,0.2)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#b4c5ff', whiteSpace: 'nowrap', minWidth: '52px' }}>
                        {newComp.material_id ? getUnidadLabel(newComp.unidad) : '—'}
                      </div>
                    </div>
                    {materialSearch.trim() && filteredMateriales.length > 0 && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                        {filteredMateriales.length} material{filteredMateriales.length !== 1 ? 'es' : ''} encontrados.
                      </p>
                    )}
                    {newComp.material_id && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                        Unidad tomada del inventario: <strong style={{ color: '#94A3B8' }}>{getUnidadLabel(newComp.unidad)}</strong>
                      </p>
                    )}
                    <button onClick={handleAddComp} disabled={addingComp || !newComp.material_id || !newComp.cantidad} style={{ padding: '0.6rem 1rem', backgroundColor: addingComp || !newComp.material_id || !newComp.cantidad ? '#1e293b' : '#4edea3', color: '#002a20', border: 'none', borderRadius: '0.25rem', cursor: addingComp || !newComp.material_id || !newComp.cantidad ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, opacity: addingComp || !newComp.material_id || !newComp.cantidad ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                      {addingComp ? 'Agregando…' : 'Agregar material'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.25rem', color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '13px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>save</span>
                  Guarda el producto primero, luego podrás definir sus materiales.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <footer style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {drawerProductId && (
            <button type="button" onClick={() => setCostModal(drawerProducto)} style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(255,185,95,0.1)', border: '1px solid rgba(255,185,95,0.3)', borderRadius: '0.25rem', color: '#ffb95f', fontWeight: 600, fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calculate</span>
              Costo estimado
            </button>
          )}
          <button type="button" onClick={closeDrawer} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={createProducto.isPending || updateProducto.isPending} style={{ flex: 2, padding: '0.75rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: createProducto.isPending || updateProducto.isPending ? 0.7 : 1 }}>
            {createProducto.isPending || updateProducto.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </footer>
      </aside>

      {/* Cost Modal overlay */}
      {costModal && <div onClick={() => setCostModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.75)', backdropFilter: 'blur(4px)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} />}

      {/* Cost Modal */}
      {costModal && (() => {
        const { matCost, subtotal, sugerido, costoTintaTotal, m2Rollo } = costData;
        const mats = costModalMaterials || [];
        return (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 90, width: '100%', maxWidth: '520px', backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb95f', backgroundColor: 'rgba(255,185,95,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.4rem' }}>Costo Estimado</span>
                <h3 style={{ margin: 0, fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 600, color: '#F8FAFC' }}>{costModal.nombre}</h3>
              </div>
              <button onClick={() => setCostModal(null)} className="material-symbols-outlined" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '2rem', height: '2rem' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>close</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Materiales */}
              {mats.length > 0 ? (
                <div>
                  <p style={{ margin: '0 0 0.75rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>Materiales de composición</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {mats.map((row: any) => {
                      const mat = materialMap.get(row.material_id);
                      const nombre = mat?.nombre || mat?.tipo || mat?.descripcion || '?';
                      const qty = Number(row.cantidad_por_m2 || 0);
                      const precio = getMatPrice(mat, row.material_id);
                      const subtotalRow = qty * precio;
                      const unidad = mat?.unidad_medida ? getUnidadLabel(mat.unidad_medida) : getUnidadLabel(row.tipo_calculo || 'm2');
                      const nombreClave = (mat?.tipo || mat?.nombre || mat?.descripcion || '').toLowerCase().split(' ')[0];
                      const tieneOrden = nombreClave ? (ordenPriceMap.get(nombreClave)?.precioUsd || 0) > 0 : false;
                      const sinPrecio = precio === 0;
                      const usaCompra = tieneOrden && precio > 0;
                      return (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: '#171f33', borderRadius: '0.25rem', border: `1px solid ${sinPrecio ? 'rgba(239,68,68,0.2)' : usaCompra ? 'rgba(255,185,95,0.22)' : 'rgba(255,255,255,0.06)'}` }}>
                          <div>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC' }}>{nombre}</span>
                            {sinPrecio && <span style={{ display: 'block', fontSize: '10px', color: '#EF4444', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>Sin precio en inventario</span>}
                            {usaCompra && !sinPrecio && <span style={{ display: 'block', fontSize: '10px', color: '#ffb95f', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>Usando última compra</span>}
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {qty} {unidad} × ${fmtMoney(precio)}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: sinPrecio ? '#64748B' : '#b4c5ff', fontWeight: 700, textAlign: 'right' }}>${fmtMoney(subtotalRow)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.875rem', backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.25rem', color: '#94A3B8', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                  Este producto no tiene materiales de composición definidos.
                </div>
              )}

              {/* Costos de configuración */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>Costos operativos (por m²)</p>
                  {!hasOperationalConfig && (
                    <span style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'Inter, sans-serif', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.25rem', padding: '2px 6px' }}>
                      Configura en Configuración
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {[
                    { label: m2Rollo > 0 ? `Tinta (${m2Rollo.toFixed(2)} m²)` : 'Tinta', value: costoTintaTotal },
                    { label: 'Sustrato / Media', value: costoMediaM2 },
                    { label: 'Acabado', value: costoAcabadoM2 },
                    { label: 'Costos fijos prorrateados', value: costoFijoPorM2 },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#171f33', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#94A3B8' }}>{item.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#F8FAFC', fontWeight: 600 }}>${fmtMoney(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen */}
              <div style={{ backgroundColor: '#060e20', border: '1px solid rgba(180,197,255,0.2)', borderRadius: '0.375rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                  <span>Subtotal materiales</span><span style={{ color: '#F8FAFC', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>${fmtMoney(matCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                  <span>Costo técnico total</span><span style={{ color: '#F8FAFC', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>${fmtMoney(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                  <span>Margen ({margenPct}%)</span><span style={{ color: '#F8FAFC', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>${fmtMoney(sugerido - subtotal)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'rgba(180,197,255,0.15)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4edea3' }}>Precio sugerido</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: '#4edea3' }}>${fmtMoney(sugerido)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                  Precio actual del producto: <strong style={{ color: '#94A3B8' }}>${fmtMoney(Number(costModal.precio_m2 || 0))}</strong>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <button onClick={() => setCostModal(null)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>Cerrar</button>
              <button onClick={() => handleApplyPrice(sugerido)} disabled={sugerido <= 0 || updateProducto.isPending} style={{ flex: 2, padding: '0.75rem', backgroundColor: sugerido <= 0 ? '#1e293b' : '#4edea3', color: '#002a20', border: 'none', borderRadius: '0.25rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: sugerido <= 0 ? 'not-allowed' : 'pointer', opacity: sugerido <= 0 ? 0.5 : 1 }}>
                Aplicar precio sugerido
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
