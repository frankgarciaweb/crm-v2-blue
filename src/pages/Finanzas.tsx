import { useEffect, useMemo, useState } from 'react';
import { useMovimientosCaja, usePedidos, useComprasMaterial, useCreateMovimientoCaja, useUpdateMovimientoCaja, useDolar, useConfiguracionNegocio, useUpdateConfiguracion, useSolicitudesCompra, useOrdenesCompra, useCreateOrdenCompra, useUpdateOrdenCompra, useUpdateSolicitudCompra, useProveedores, useConsumoMateriales, useConsumoTintaPedido, useMateriales, useProductoMaterialesAll, useRecipeModuleEnabled, useTintas, useUpdateTinta, useCreateTinta } from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MovimientoForm {
  tipo: string;
  concepto: string;
  monto: string;
  categoria: string;
  fecha: string;
  notas: string;
}

interface CostoFijoForm {
  concepto: string;
  categoria: string;
  monto: string;
  moneda: 'USD' | 'BS';
  tasa: string;
  fecha: string;
  notas: string;
}

const emptyForm: MovimientoForm = {
  tipo: 'ingreso',
  concepto: '',
  monto: '',
  categoria: 'ventas',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
};

const emptyCostoFijoForm: CostoFijoForm = {
  concepto: '',
  categoria: 'arriendo',
  monto: '',
  moneda: 'USD',
  tasa: '',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
};

const CATEGORIA_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  compras: 'Compras',
  gastos_fijos: 'Gastos Fijos',
  otros: 'Otros',
};

const COSTO_FIJO_LABELS: Record<string, string> = {
  arriendo: 'Arriendo',
  luz: 'Luz',
  internet: 'Internet',
  gastos_comunes: 'Gastos Comunes',
  empleados: 'Empleados',
  telefonos: 'Telefonos',
  limpieza: 'Limpieza',
  diarios: 'Gastos Diarios',
  otros: 'Otros',
};

const TINTA_COLOR_FIELD_MAP: Record<string, string> = {
  magenta: 'magenta_cantidad',
  cian: 'cian_cantidad',
  amarillo: 'amarillo_cantidad',
  negro: 'negro_cantidad',
};

export default function Finanzas() {
  const { data: movimientos, isLoading: loadingMovimientos } = useMovimientosCaja();
  const { data: pedidos } = usePedidos();
  const { data: comprasMaterial } = useComprasMaterial();
  const { data: dolar } = useDolar();
  const { data: configuracion } = useConfiguracionNegocio();
  const { data: consumosMateriales } = useConsumoMateriales();
  const { data: consumosTintas } = useConsumoTintaPedido();
  const { data: materiales } = useMateriales();
  const { data: recetasProductos } = useProductoMaterialesAll();
  const recipeFeaturesEnabled = useRecipeModuleEnabled();
  const createMovimiento = useCreateMovimientoCaja();
  const updateMovimiento = useUpdateMovimientoCaja();
  const updateConfiguracion = useUpdateConfiguracion();
  const { data: solicitudes } = useSolicitudesCompra();

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovimientoForm>(emptyForm);
  const [showCostoFijoForm, setShowCostoFijoForm] = useState(false);
  const [costoFijoForm, setCostoFijoForm] = useState<CostoFijoForm>(emptyCostoFijoForm);
  const [editingCostoFijoId, setEditingCostoFijoId] = useState<string | null>(null);
  const [m2ReferenciaForm, setM2ReferenciaForm] = useState('70');
  const [costeoSummary, setCosteoSummary] = useState<string | null>(null);
  const [tab, setTab] = useState<'movimientos' | 'dashboard' | 'compras' | 'rentabilidad'>('movimientos');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillSummary, setBackfillSummary] = useState<string | null>(null);

  // Fase 35-I: Órdenes de compra
  const { data: ordenes } = useOrdenesCompra();
  const { data: proveedores } = useProveedores();
  const createOrden = useCreateOrdenCompra();
  const updateOrdenCompra = useUpdateOrdenCompra();
  const updateSolicitud = useUpdateSolicitudCompra();
  const { data: tintas } = useTintas();
  const updateTinta = useUpdateTinta();
  const createTinta = useCreateTinta();
  const [aprobarDrawerOpen, setAprobarDrawerOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<any>(null);
  const [aprobacionForm, setAprobacionForm] = useState({
    proveedor_id: '',
    proveedor_nombre: '',
    cantidad_ordenada: '',
    precio_unitario: '',
    moneda: 'USD' as 'USD' | 'EUR' | 'Binance' | 'BS',
    tasa: '',
    fecha_entrega_estimada: '',
    nota: '',
  });
  const [solicitudesFilter, setSolicitudesFilter] = useState<'pendiente' | 'aprobada' | 'rechazada'>('pendiente');

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

  const isLoading = loadingMovimientos;

  const filteredMovimientos = movimientos?.filter(m => {
    const matchSearch = !search ||
      m.concepto?.toLowerCase().includes(search.toLowerCase()) ||
      m.categoria?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || m.tipo === filterTipo;
    return matchSearch && matchTipo;
  }) || [];

  // Estadísticas globales
  const totalIngresos = movimientos?.filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0) || 0;
  const totalEgresos = movimientos?.filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0) || 0;
  const balance = totalIngresos - totalEgresos;

  const dolaresBs = Number(dolar?.valor ?? 0);
  const binanceBs = Number(dolar?.binace ?? dolar?.binance ?? 0);
  const ingresosPedidosPagados = pedidos?.filter(p => p.estado !== 'cancelado')
    .reduce((sum, p) => sum + (Number(p.precio_total) || 0), 0) || 0;
  const comprasMaterialTotalUsd = comprasMaterial?.reduce((sum, compra) => sum + (Number(compra.precio_usd) || 0), 0) || 0;
  const comprasMaterialCredito = comprasMaterial?.filter((compra) => compra.es_credito).length || 0;
  const movimientosSinNotas = movimientos?.filter(m => !m.notas && !m.concepto)?.length || 0;
  const movimientosHistoricosSinTrazabilidad = movimientos?.filter(m => {
    const notes = `${m.notas || ''} ${m.concepto || ''}`.toLowerCase();
    return !notes.includes('pedido_id=') && !notes.includes('compra_id=');
  })?.length || 0;
  const movimientosManual = movimientos?.filter(m => !String(m.concepto || '').toLowerCase().includes('pedido') && !String(m.concepto || '').toLowerCase().includes('compra'))?.length || 0;
  const pedidoPendientesCaja = (pedidos || [])
    .filter((p: any) => p.estado !== 'cancelado')
    .slice(0, 5);
  const compraPendientesCaja = (comprasMaterial || []).slice(0, 5);
  const pedidosConciliados = pedidoPendientesCaja.filter((pedido: any) => movimientoRegistrado('pedido', pedido.id)).length;
  const comprasConciliadas = compraPendientesCaja.filter((compra: any) => movimientoRegistrado('compra_material', compra.id)).length;
  const pendientesConciliacion = pedidoPendientesCaja.length + compraPendientesCaja.length - pedidosConciliados - comprasConciliadas;

  function getMovimientoOrigen(movimiento: any) {
    const content = `${movimiento.concepto || ''} ${movimiento.notas || ''}`.toLowerCase();
    if (content.includes('origen=pedido') || content.includes('pedido_id=')) return 'pedido';
    if (content.includes('origen=compra_material') || content.includes('compra_id=')) return 'compra_material';
    if (content.includes('origen=costo_fijo') || content.includes('costo_categoria=')) return 'costo_fijo';
    return String(movimiento.origen || 'manual');
  }

  function movimientoRegistrado(tipo: 'pedido' | 'compra_material', id: string) {
    return (movimientos || []).some((m: any) => {
      const notes = `${m.concepto || ''} ${m.notas || ''}`;
      return notes.includes(`origen=${tipo}`) && notes.includes(`${tipo === 'pedido' ? 'pedido_id' : 'compra_id'}=${id}`);
    });
  }

function parseNotaFields(notas?: string | null) {
  return (notas || '').split('|').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return acc;
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});
}

function buildNotaFields(fields: Record<string, string>) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

function parseSolicitudMeta(nota?: string | null) {
  try {
    const raw = String(nota || '').trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
  } catch {
    return null;
  }
  return null;
}

function getSolicitudTipoItem(solicitud?: any) {
  const meta = parseSolicitudMeta(solicitud?.nota) || {};
  const tipo = String(solicitud?.tipo_item || meta?.tipo || '').toLowerCase();
  if (tipo === 'tinta' || tipo === 'material') return tipo;
  return String(solicitud?.item_nombre || '').toLowerCase().includes('tinta') ? 'tinta' : 'material';
}

function getSolicitudCantidad(solicitud: any) {
  const meta = parseSolicitudMeta(solicitud?.nota);
  const fromMeta = Number(meta?.cantidad_solicitada ?? meta?.unidades_a_solicitar ?? 0) || 0;
  const fromRow = Number(solicitud?.cantidad_solicitada || solicitud?.cantidad_ordenada || 0) || 0;
  return fromMeta || fromRow;
}

function getSolicitudObservacion(solicitud: any) {
  const meta = parseSolicitudMeta(solicitud?.nota);
  // Si la nota es JSON parseable, mostrar solo el campo observacion (no el JSON crudo)
  if (meta !== null) return String(meta?.observacion || '');
  return '';
}

function parsePedidoItems(pedido: any) {
  try {
    if (!pedido?.notas) return [];
    const parsed = JSON.parse(pedido.notas);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseCosteoSnapshot(notas?: string | null) {
  const line = String(notas || '')
    .split('\n')
    .find(entry => entry.startsWith('[COSTEO_V1]'));
  if (!line) return null;
  const payload = line.replace('[COSTEO_V1]', '').trim();
  return payload.split('|').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return acc;
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});
}

function getPedidoAreaM2(pedido: any) {
  return parsePedidoItems(pedido).reduce((sum: number, item: any) => {
    const cantidad = Number(item.cantidad) || 0;
    const ancho = Number(item.ancho) || 0;
    const alto = Number(item.alto) || 0;
    if (String(item.tipo_cobro || '').toLowerCase() !== 'm2') return sum;
    return sum + (cantidad * ancho * alto);
  }, 0);
}

function getPedidoIngresoRegistrado(movimientos: any[] | undefined, pedidoId: string) {
  return (movimientos || []).reduce((sum, mov: any) => {
    const fields = parseNotaFields(mov.notas);
    if (fields.origen !== 'pedido' || fields.pedido_id !== pedidoId) return sum;
    if (mov.tipo !== 'ingreso') return sum;
    return sum + (Number(mov.monto) || 0);
  }, 0);
}

function getTintaCosteUsd(consumosTintas: any[] | undefined, pedidoId: string, costoTintaM2: number) {
  return (consumosTintas || []).reduce((sum, row: any) => {
    if (row.pedido_id !== pedidoId) return sum;
    const m2 = Number(row.metros_cuadrados) || 0;
    if (m2 <= 0) return sum;
    return sum + (m2 * costoTintaM2);
  }, 0);
}

function getMaterialCosteUsd(consumosMateriales: any[] | undefined, pedidoId: string, materiales: any[] | undefined) {
  const materialMap = new Map((materiales || []).map((material: any) => [material.id, material]));
  return (consumosMateriales || []).reduce((sum: number, row: any) => {
    if (row.pedido_id !== pedidoId) return sum;
    const material = materialMap.get(row.material_id);
    const consumo = Number(row.cantidad_consumida) || 0;
    const precioMetro = Number(material?.precio_m2) || 0;
    return sum + (consumo * precioMetro);
  }, 0);
}

  function toNumber(value: unknown, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getCostoFijoFormFromMovimiento(movimiento: any): CostoFijoForm {
    const fields = parseNotaFields(movimiento.notas);
    const monto = toNumber(movimiento.monto, 0);
    const moneda = String(fields.moneda || 'USD').toUpperCase() === 'BS' ? 'BS' : 'USD';
    const tasa = moneda === 'BS' ? String(toNumber(fields.tasa, 0) || '') : '';
    const categoria = String(fields.costo_categoria || movimiento.categoria || 'arriendo');
    const notas = String(fields.detalle || '');
    return {
      concepto: String(movimiento.concepto || ''),
      categoria,
      monto: String(monto),
      moneda,
      tasa,
      fecha: String(movimiento.fecha || movimiento.created_at || new Date().toISOString().split('T')[0]).slice(0, 10),
      notas,
    };
  }

  function buildCostoFijoNotas(form: CostoFijoForm, monto: number) {
    const tasa = toNumber(form.tasa, 0);
    const montoUsd = form.moneda === 'BS'
      ? (tasa > 0 ? monto / tasa : 0)
      : monto;
    return buildNotaFields({
      origen: 'costo_fijo',
      costo_categoria: form.categoria,
      moneda: form.moneda,
      tasa: form.moneda === 'BS' ? String(tasa > 0 ? tasa : 0) : '1',
      monto_usd: montoUsd.toFixed(4),
      detalle: form.notas,
    });
  }

  const costosFijosMovimientos = useMemo(
    () => (movimientos || []).filter((m: any) => {
      const fields = parseNotaFields(m.notas);
      return m.categoria === 'gastos_fijos' || fields.origen === 'costo_fijo';
    }),
    [movimientos]
  );

  const costosFijosAgrupados = useMemo(() => {
    const grouped = costosFijosMovimientos.reduce((acc: Record<string, { periodo: string; totalUsd: number; cantidad: number }>, mov: any) => {
      const fields = parseNotaFields(mov.notas);
      const fecha = new Date(mov.fecha || mov.created_at || new Date().toISOString());
      const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const tasa = toNumber(fields.tasa, 0);
      const moneda = String(fields.moneda || '').toUpperCase();
      const montoMovimiento = toNumber(mov.monto, 0);
      const montoUsdFromNotes = toNumber(fields.monto_usd, NaN);
      const montoUsd = Number.isFinite(montoUsdFromNotes)
        ? montoUsdFromNotes
        : moneda === 'BS' && tasa > 0
          ? (montoMovimiento / tasa)
          : montoMovimiento;
      if (!acc[periodo]) {
        acc[periodo] = { periodo, totalUsd: 0, cantidad: 0 };
      }
      acc[periodo].totalUsd += montoUsd;
      acc[periodo].cantidad += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [costosFijosMovimientos]);

  const costosFijosMesActualUsd = useMemo(() => {
    const now = new Date();
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const match = costosFijosAgrupados.find(row => row.periodo === periodo);
    return match?.totalUsd || 0;
  }, [costosFijosAgrupados]);

  const m2ReferenciaConfigurada = useMemo(() => {
    const raw = configMap['m2_referencia_mensual'];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 70;
  }, [configMap]);

  const costoFijoPorM2 = useMemo(() => {
    if (!m2ReferenciaConfigurada || m2ReferenciaConfigurada <= 0) return 0;
    return costosFijosMesActualUsd / m2ReferenciaConfigurada;
  }, [costosFijosMesActualUsd, m2ReferenciaConfigurada]);

  const costoTintaM2 = useMemo(() => {
    const n = Number(configMap['costo_tinta_m2']);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [configMap]);

  useEffect(() => {
    setM2ReferenciaForm(String(m2ReferenciaConfigurada));
  }, [m2ReferenciaConfigurada]);

  function upsertNotaField(notas: string | null | undefined, key: string, value: string) {
    const fields = parseNotaFields(notas);
    fields[key] = value;
    return Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|');
  }

  function inferPedidoMove(pedido: any) {
    const target = Number(pedido.precio_total) || 0;
    const pedidoTag = String(pedido.id || '').slice(0, 8).toUpperCase();
    return (movimientos || []).find((m: any) => {
      const text = `${m.concepto || ''} ${m.notas || ''}`.toLowerCase();
      const sameAmount = Math.abs((Number(m.monto) || 0) - target) < 0.01;
      const sameDay = pedido.created_at && m.fecha
        ? new Date(pedido.created_at).toDateString() === new Date(m.fecha).toDateString()
        : true;
      const conceptMatch = text.includes('pedido') || text.includes(pedidoTag.toLowerCase());
      return sameAmount && sameDay && conceptMatch;
    });
  }

  function inferCompraMove(compra: any) {
    const target = Number(compra.precio_usd || compra.precio_moneda || 0);
    const compraTag = String(compra.id || '').slice(0, 8).toUpperCase();
    return (movimientos || []).find((m: any) => {
      const text = `${m.concepto || ''} ${m.notas || ''}`.toLowerCase();
      const sameAmount = Math.abs((Number(m.monto) || 0) - target) < 0.01;
      const sameDay = compra.fecha_compra && m.fecha
        ? new Date(compra.fecha_compra).toDateString() === new Date(m.fecha).toDateString()
        : true;
      const conceptMatch = text.includes('compra') || text.includes(compraTag.toLowerCase());
      return sameAmount && sameDay && conceptMatch;
    });
  }

  async function backfillTrazabilidadHistorica() {
    if (backfilling) return;
    setBackfilling(true);
    try {
      let updated = 0;
      let skipped = 0;

      for (const pedido of pedidos || []) {
        const registered = movimientoRegistrado('pedido', pedido.id);
        if (registered) continue;
        const inferred = inferPedidoMove(pedido);
        if (!inferred) { skipped += 1; continue; }
        const nextNota = upsertNotaField(inferred.notas, 'origen', 'pedido');
        const withId = upsertNotaField(nextNota, 'pedido_id', pedido.id);
        await updateMovimiento.mutateAsync({ id: inferred.id, notas: withId });
        updated += 1;
      }

      for (const compra of comprasMaterial || []) {
        const registered = movimientoRegistrado('compra_material', compra.id);
        if (registered) continue;
        const inferred = inferCompraMove(compra);
        if (!inferred) { skipped += 1; continue; }
        const nextNota = upsertNotaField(inferred.notas, 'origen', 'compra_material');
        const withId = upsertNotaField(nextNota, 'compra_id', compra.id);
        await updateMovimiento.mutateAsync({ id: inferred.id, notas: withId });
        updated += 1;
      }

      setBackfillSummary(`Trazabilidad normalizada: ${updated} movimientos actualizados, ${skipped} sin coincidencia segura.`);
    } catch {
      setBackfillSummary('No se pudo completar el backfill histórico.');
    } finally {
      setBackfilling(false);
    }
  }

  async function registrarIngresoPedido(pedido: any) {
    const cliente = pedido.clientes?.nombre_completo || pedido.clientes?.nombre || 'Sin cliente';
    await createMovimiento.mutateAsync({
      tipo: 'ingreso',
      concepto: `Cobro pedido ${pedido.id?.slice(0, 8)?.toUpperCase() || ''}`,
      monto: Number(pedido.precio_total) || 0,
      categoria: 'ventas',
      fecha: pedido.fecha || pedido.created_at || new Date().toISOString().split('T')[0],
      notas: `origen=pedido|pedido_id=${pedido.id}|cliente=${cliente}`,
    });
  }

  async function registrarEgresoCompra(compra: any) {
    await createMovimiento.mutateAsync({
      tipo: 'egreso',
      concepto: `Pago compra material ${compra.id?.slice(0, 8)?.toUpperCase() || ''}`,
      monto: Number(compra.precio_usd || compra.precio_moneda || 0),
      categoria: 'compras',
      fecha: compra.fecha_compra || compra.created_at || new Date().toISOString().split('T')[0],
      notas: `origen=compra_material|compra_id=${compra.id}|material_id=${compra.material_id}|proveedor=${compra.proveedor || ''}`,
    });
  }

  const movimientosCruzados = useMemo(() => {
    const recientesPedidos = (pedidos || [])
      .filter(p => p.estado !== 'cancelado')
      .slice(0, 5)
      .map((p: any) => ({
        key: `pedido-${p.id}`,
        tipo: 'ingreso',
        fecha: p.created_at || p.fecha || new Date().toISOString(),
        concepto: `Pedido ${p.id?.slice(0, 8)?.toUpperCase() || ''}`,
        categoria: 'ventas',
        monto: Number(p.precio_total) || 0,
        origen: 'pedido',
        referencia: p.id,
      }));

    const recientesCompras = (comprasMaterial || [])
      .slice(0, 5)
      .map((c: any) => ({
        key: `compra-${c.id}`,
        tipo: 'egreso',
        fecha: c.fecha_compra || c.created_at || new Date().toISOString(),
        concepto: `Compra material ${c.material_id?.slice(0, 8)?.toUpperCase() || ''}`,
        categoria: 'compras',
        monto: Number(c.precio_usd) || 0,
        origen: 'compra_material',
        referencia: c.id,
      }));

  return [...recientesPedidos, ...recientesCompras].sort(
      (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [pedidos, comprasMaterial]);

  const rentabilidadPedidos = useMemo(() => {
    const pedidoRows = (pedidos || [])
      .filter((p: any) => p.estado !== 'cancelado')
      .map((pedido: any) => {
        const items = parsePedidoItems(pedido);
        const snapshot = parseCosteoSnapshot(pedido.notas);
        const areaM2 = getPedidoAreaM2(pedido);
        const ingresoRegistradoUsd = getPedidoIngresoRegistrado(movimientos || [], pedido.id);
        const ingresoUsd = ingresoRegistradoUsd > 0 ? ingresoRegistradoUsd : (Number(pedido.precio_total) || 0);
        const materialRealUsd = getMaterialCosteUsd(consumosMateriales, pedido.id, materiales);
        const tintaRealUsd = getTintaCosteUsd(consumosTintas, pedido.id, costoTintaM2);
        const costoFijoAsignadoUsd = areaM2 * costoFijoPorM2;
        const costoRealConsumidoUsd = materialRealUsd + tintaRealUsd + costoFijoAsignadoUsd;
        const utilidadRealUsd = ingresoUsd - costoRealConsumidoUsd;
        const costoEstimadoUsd = snapshot?.costo_estimado_usd ? Number(snapshot.costo_estimado_usd) || 0 : costoRealConsumidoUsd;
        const utilidadEstimdaUsd = snapshot?.utilidad_estimada_usd
          ? Number(snapshot.utilidad_estimada_usd) || 0
          : Math.max(0, ingresoUsd - costoEstimadoUsd);
        const margenRealPct = ingresoUsd > 0 ? (utilidadRealUsd / ingresoUsd) * 100 : 0;
        const margenEstimadoPct = ingresoUsd > 0 ? (utilidadEstimdaUsd / ingresoUsd) * 100 : 0;

        return {
          pedido,
          items,
          snapshot,
          areaM2,
          ingresoUsd,
          ingresoRegistradoUsd,
          materialRealUsd,
          tintaRealUsd,
          costoFijoAsignadoUsd,
          costoRealConsumidoUsd,
          costoEstimadoUsd,
          utilidadRealUsd,
          utilidadEstimdaUsd,
          margenRealPct,
          margenEstimadoPct,
          tieneConsumosReales: materialRealUsd > 0 || tintaRealUsd > 0,
        };
      })
      .sort((a: any, b: any) => new Date(b.pedido.created_at || 0).getTime() - new Date(a.pedido.created_at || 0).getTime());

    const totalIngresos = pedidoRows.reduce((sum: number, row: any) => sum + row.ingresoUsd, 0);
    const totalCostoReal = pedidoRows.reduce((sum: number, row: any) => sum + row.costoRealConsumidoUsd, 0);
    const totalCostoEstimado = pedidoRows.reduce((sum: number, row: any) => sum + row.costoEstimadoUsd, 0);
    const totalUtilidadReal = pedidoRows.reduce((sum: number, row: any) => sum + row.utilidadRealUsd, 0);
    const totalUtilidadEstimada = pedidoRows.reduce((sum: number, row: any) => sum + row.utilidadEstimdaUsd, 0);
    const recipeRowsTotal = recipeFeaturesEnabled ? (recetasProductos || []).length : 0;

    return {
      rows: pedidoRows,
      summary: {
        pedidos: pedidoRows.length,
        ingresos: totalIngresos,
        costoReal: totalCostoReal,
        costoEstimado: totalCostoEstimado,
        utilidadReal: totalUtilidadReal,
        utilidadEstimada: totalUtilidadEstimada,
        diferenciaUtilidad: totalUtilidadReal - totalUtilidadEstimada,
        recipesTotal: recipeRowsTotal,
      },
    };
  }, [pedidos, movimientos, consumosMateriales, consumosTintas, materiales, costoTintaM2, costoFijoPorM2, recipeFeaturesEnabled, recetasProductos]);

  // Ingresos de pedidos
  const ingresosPedidos = pedidos?.filter(p => p.estado !== 'cancelado')
    .reduce((sum, p) => sum + (p.precio_total || 0), 0) || 0;

  // Mes actual
  const now = new Date();
  const movimientosMes = movimientos?.filter(m => {
    const d = new Date(m.fecha || m.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) || [];
  const ingresosMes = movimientosMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (m.monto || 0), 0);
  const egresosMes = movimientosMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (m.monto || 0), 0);
  const balanceMes = ingresosMes - egresosMes;

  // Últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
      mes: d.getMonth(),
      año: d.getFullYear(),
    };
  });

  const datosMeses = meses.map(m => {
    const movs = movimientos?.filter(mov => {
      const d = new Date(mov.fecha || mov.created_at);
      return d.getMonth() === m.mes && d.getFullYear() === m.año;
    }) || [];
    return {
      label: m.label,
      ingresos: movs.filter(mov => mov.tipo === 'ingreso').reduce((s, mov) => s + (mov.monto || 0), 0),
      egresos: movs.filter(mov => mov.tipo === 'egreso').reduce((s, mov) => s + (mov.monto || 0), 0),
    };
  });

  const maxMes = Math.max(...datosMeses.map(d => Math.max(d.ingresos, d.egresos)), 1);

  // Por categoría
  const categorias = ['ventas', 'compras', 'gastos_fijos', 'otros'];
  const datosCategorias = categorias.map(cat => ({
    cat,
    label: CATEGORIA_LABELS[cat] || cat,
    total: movimientos?.filter(m => m.categoria === cat).reduce((s, m) => s + (m.monto || 0), 0) || 0,
  })).filter(d => d.total > 0);

  const maxCat = Math.max(...datosCategorias.map(d => d.total), 1);

  // Métricas dashboard
  const promedioIngresos = datosMeses.length > 0
    ? datosMeses.reduce((s, d) => s + d.ingresos, 0) / datosMeses.length
    : 0;
  const promedioEgresos = datosMeses.length > 0
    ? datosMeses.reduce((s, d) => s + d.egresos, 0) / datosMeses.length
    : 0;
  const mesMasIngresos = datosMeses.reduce((max, d) => d.ingresos > max.ingresos ? d : max, datosMeses[0] || { label: '-', ingresos: 0 });
  const catTopGasto = datosCategorias.reduce((max, d) => d.total > max.total ? d : max, datosCategorias[0] || { label: '-', total: 0 });

  async function handleSubmit() {
    if (!form.concepto || !form.monto) return;
    await createMovimiento.mutateAsync({
      tipo: form.tipo,
      concepto: form.concepto,
      monto: Number(form.monto),
      categoria: form.categoria,
      fecha: form.fecha,
      notas: form.notas || null,
    });
    setForm(emptyForm);
    setShowForm(false);
  }

  async function handleRegistrarCostoFijo() {
    const monto = toNumber(costoFijoForm.monto, 0);
    if (!costoFijoForm.concepto || monto <= 0) return;
    const notas = buildCostoFijoNotas(costoFijoForm, monto);

    if (editingCostoFijoId) {
      await updateMovimiento.mutateAsync({
        id: editingCostoFijoId,
        tipo: 'egreso',
        concepto: costoFijoForm.concepto,
        monto,
        categoria: 'gastos_fijos',
        fecha: costoFijoForm.fecha,
        notas,
      });
    } else {
      await createMovimiento.mutateAsync({
        tipo: 'egreso',
        concepto: costoFijoForm.concepto,
        monto,
        categoria: 'gastos_fijos',
        fecha: costoFijoForm.fecha,
        notas,
      });
    }

    setCostoFijoForm(emptyCostoFijoForm);
    setEditingCostoFijoId(null);
    setShowCostoFijoForm(false);
  }

  async function guardarM2Referencia() {
    const nextM2 = toNumber(m2ReferenciaForm, 0);
    if (nextM2 <= 0) {
      setCosteoSummary('El m2 de referencia debe ser mayor que cero.');
      return;
    }
    try {
      await updateConfiguracion.mutateAsync({
        clave: 'm2_referencia_mensual',
        valor: String(nextM2),
      });
      setCosteoSummary(`M2 de referencia actualizado a ${nextM2}.`);
    } catch {
      setCosteoSummary('No se pudo guardar el m2 de referencia.');
    }
  }

  const formatCurrency = (val: number) => '$' + val.toLocaleString('es-CL');
  const formatMoney = (val: number, moneda: 'USD' | 'EUR' | 'Binance' | 'BS') =>
    `${moneda} ${val.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function abrirAprobar(sol: any) {
    setSelectedSolicitud(sol);
    const prov = (proveedores || []).find((p: any) => p.id === sol.proveedor_id);
    setAprobacionForm({
      proveedor_id: prov?.id || '',
      proveedor_nombre: prov?.nombre || '',
      cantidad_ordenada: String(getSolicitudCantidad(sol) || ''),
      precio_unitario: '',
      moneda: (prov?.moneda || 'USD') as 'USD' | 'EUR' | 'Binance' | 'BS',
      tasa: prov?.tasa_cambio ? String(prov.tasa_cambio) : '',
      fecha_entrega_estimada: '',
      nota: '',
    });
    setAprobarDrawerOpen(true);
    setTab('compras');
  }
  const totalAprobacion = useMemo(() => {
    if (!aprobacionForm.precio_unitario || !aprobacionForm.cantidad_ordenada) return 0;
    const precioUnit = Number(aprobacionForm.precio_unitario);
    const cantidad = Number(aprobacionForm.cantidad_ordenada);
    const meta = parseSolicitudMeta(selectedSolicitud?.nota);
    const uPP = Number(meta?.unidades_por_presentacion) || 0;
    if (meta?.presentacion && uPP > 1) {
      return Math.ceil(cantidad / uPP) * precioUnit;
    }
    return precioUnit * cantidad;
  }, [aprobacionForm.precio_unitario, aprobacionForm.cantidad_ordenada, selectedSolicitud]);

  // Total normalizado a USD (para guardar y comparar)
  const totalUsdAprobacion = useMemo(() => {
    if (!totalAprobacion) return 0;
    const tasaNum = Number(aprobacionForm.tasa) || 1;
    if (aprobacionForm.moneda === 'USD') return totalAprobacion;
    return tasaNum > 0 ? totalAprobacion / tasaNum : 0;
  }, [totalAprobacion, aprobacionForm.moneda, aprobacionForm.tasa]);

  // Equivalente en BS (para mostrar como referencia)
  const totalBsAprobacion = useMemo(() => {
    if (!totalAprobacion) return 0;
    const tasaNum = Number(aprobacionForm.tasa) || 0;
    if (!tasaNum) return 0;
    if (aprobacionForm.moneda === 'BS') return totalAprobacion;
    return totalAprobacion * tasaNum;
  }, [totalAprobacion, aprobacionForm.moneda, aprobacionForm.tasa]);

  async function handleRecibirOrden(o: any) {
    await updateOrdenCompra.mutateAsync({ id: o.id, estado: 'recibida' });

    const solicitud = (solicitudes || []).find((s: any) => s.id === o.solicitud_id);
    if (!solicitud) return;

    await updateSolicitud.mutateAsync({ id: solicitud.id, estado: 'recibida' });

    if (getSolicitudTipoItem(solicitud) !== 'tinta') return;

    const meta = parseSolicitudMeta(solicitud.nota) || {};
    const marca = String(meta.marca || '').trim() || 'Sin marca';
    const color = String(meta.color || '').trim().toLowerCase();
    const totalMl = Math.max(0,
      Number(meta.cantidad_solicitada || 0) ||
      (Number(meta.unidades_por_presentacion || 0) * Number(meta.presentaciones_solicitadas || 0))
    );
    const colorField = TINTA_COLOR_FIELD_MAP[color];

    if (!colorField || totalMl <= 0) return;

    const existingTinta = (tintas || []).find((t: any) =>
      String(t.marca || t.nombre || '').trim().toLowerCase() === marca.toLowerCase()
    );

    if (existingTinta) {
      const newColorQty = Number(existingTinta[colorField] || 0) + totalMl;
      const newTotal = (Number(existingTinta.cantidad || 0) - Number(existingTinta[colorField] || 0)) + newColorQty;
      await updateTinta.mutateAsync({
        id: existingTinta.id,
        [colorField]: newColorQty,
        cantidad: newTotal,
      });
    } else {
      const colorQtys = {
        magenta_cantidad: color === 'magenta' ? totalMl : 0,
        cian_cantidad: color === 'cian' ? totalMl : 0,
        amarillo_cantidad: color === 'amarillo' ? totalMl : 0,
        negro_cantidad: color === 'negro' ? totalMl : 0,
      };
      await createTinta.mutateAsync({
        nombre: marca,
        marca,
        maquina: marca,
        unidad: 'ml',
        cantidad: totalMl,
        minimo: 1,
        porcentaje: 100,
        ...colorQtys,
        magenta_minimo: 1,
        cian_minimo: 1,
        amarillo_minimo: 1,
        negro_minimo: 1,
      });
    }
  }

  async function submitAprobacion() {
    if (!selectedSolicitud) return;
    if (!aprobacionForm.cantidad_ordenada || !aprobacionForm.precio_unitario) {
      alert('Ingresa cantidad y precio unitario');
      return;
    }
    const tasaNum = Number(aprobacionForm.tasa) || 1;
    const precioUnit = Number(aprobacionForm.precio_unitario);
    const cantidad = Number(aprobacionForm.cantidad_ordenada);
    const metaAprob = parseSolicitudMeta(selectedSolicitud?.nota);
    const tipoSolicitud = getSolicitudTipoItem(selectedSolicitud);
    const uPPAprob = Number(metaAprob?.unidades_por_presentacion) || 0;
    const tienePresentAprob = Boolean(metaAprob?.presentacion) && uPPAprob > 1;
    // Convertir precio a USD independientemente de la moneda ingresada
    const precioUsdPorPresentacion = aprobacionForm.moneda === 'USD'
      ? precioUnit
      : (tasaNum > 0 ? precioUnit / tasaNum : precioUnit);
    // Precio por unidad base en USD (ej. por ml, por m², por unidad)
    const precioUsdBase = tienePresentAprob ? precioUsdPorPresentacion / uPPAprob : precioUsdPorPresentacion;
    try {
      await createOrden.mutateAsync({
        solicitud_id: selectedSolicitud.id,
        proveedor_id: aprobacionForm.proveedor_id || null,
        proveedor_nombre: aprobacionForm.proveedor_nombre || null,
        item_nombre: selectedSolicitud.item_nombre,
        item_id: selectedSolicitud.item_id || null,
        cantidad_ordenada: cantidad,
        precio_unitario: precioUsdBase,       // siempre USD por unidad base
        moneda: 'USD',                         // normalizado a USD
        tasa_cambio: tasaNum > 1 ? tasaNum : null,
        total_clp: totalUsdAprobacion,         // total en USD
        estado: 'emitida',
        nota: aprobacionForm.nota || null,
        fecha_entrega_estimada: aprobacionForm.fecha_entrega_estimada || null,
      });

      if (tipoSolicitud === 'tinta' && precioUsdBase > 0) {
        const tintaM2 = precioUsdBase * 45;
        await updateConfiguracion.mutateAsync({ clave: 'costo_tinta_ml', valor: String(precioUsdBase) });
        await updateConfiguracion.mutateAsync({ clave: 'costo_tinta_m2', valor: String(tintaM2) });
      }

      await updateSolicitud.mutateAsync({ id: selectedSolicitud.id, estado: 'aprobada' });
      setAprobarDrawerOpen(false);
      setSelectedSolicitud(null);
    } catch (e: any) {
      alert('Error al crear la orden: ' + (e?.message || 'verifica que la tabla ordenes_compra exista en Supabase'));
    }
  }

  async function handleRechazar(sol: any) {
    if (!confirm(`¿Rechazar la solicitud de "${sol.item_nombre}"?`)) return;
    try {
      await updateSolicitud.mutateAsync({ id: sol.id, estado: 'rechazada' });
    } catch (e: any) {
      alert('Error: ' + (e?.message || 'no se pudo rechazar'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ─── VISTA A: MOVIMIENTOS ──────────────────────────────────────
  if (tab === 'movimientos') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finanzas / Movimientos
            </p>
            <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
              Finanzas
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('rentabilidad')}
              style={{ border: '1px solid rgba(180,197,255,0.35)', backgroundColor: 'rgba(180,197,255,0.08)', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>query_stats</span>
              Rentabilidad
            </button>
            <button
              onClick={() => setTab('compras')}
              style={{ border: '1px solid rgba(255,185,95,0.35)', backgroundColor: 'rgba(255,185,95,0.08)', color: '#ffb95f', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_cart</span>
              Órdenes de Compra
              {(solicitudes || []).filter((s: any) => s.estado === 'pendiente').length > 0 && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ffb95f', color: '#002a78', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', lineHeight: 1.4 }}>
                  {(solicitudes || []).filter((s: any) => s.estado === 'pendiente').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('dashboard')}
              style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
              Dashboard
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, padding: '8px 16px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Nuevo Movimiento
            </button>
            <button
              onClick={() => {
                setEditingCostoFijoId(null);
                setCostoFijoForm(emptyCostoFijoForm);
                setShowCostoFijoForm(v => !v);
              }}
              style={{ backgroundColor: '#ffb95f', color: '#002a78', fontWeight: 700, padding: '8px 16px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
              Nuevo Costo Fijo
            </button>
            <button
              onClick={backfillTrazabilidadHistorica}
              disabled={backfilling}
              style={{ border: '1px solid rgba(180,197,255,0.35)', backgroundColor: 'rgba(180,197,255,0.08)', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: backfilling ? 'wait' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: backfilling ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{backfilling ? 'progress_activity' : 'manage_search'}</span>
              {backfilling ? 'Normalizando...' : 'Backfill histórico'}
            </button>
          </div>
        </div>

        {(backfillSummary || movimientosHistoricosSinTrazabilidad > 0) && (
          <div style={{ backgroundColor: 'rgba(180,197,255,0.08)', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '0.5rem', padding: '12px 16px', color: '#dae2fd', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#b4c5ff' }}>info</span>
            <span style={{ fontSize: '13px' }}>
              {backfillSummary || `${movimientosHistoricosSinTrazabilidad} movimientos siguen sin trazabilidad explícita.`}
            </span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos Totales', value: formatCurrency(totalIngresos), icon: 'trending_up', color: '#10B981' },
            { label: 'Egresos Totales', value: formatCurrency(totalEgresos), icon: 'trending_down', color: '#EF4444' },
            { label: 'Balance', value: formatCurrency(balance), icon: 'account_balance_wallet', color: balance >= 0 ? '#b4c5ff' : '#EF4444' },
            { label: 'Ingresos de Pedidos', value: formatCurrency(ingresosPedidos), icon: 'shopping_cart', color: '#ffb95f' },
            { label: 'Compras Material', value: formatCurrency(comprasMaterialTotalUsd), icon: 'inventory_2', color: '#4edea3' },
            { label: 'Dólar BCV', value: dolaresBs ? `${dolaresBs.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : '—', icon: 'currency_exchange', color: '#b4c5ff' },
            { label: 'Binance', value: binanceBs ? `${binanceBs.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : '—', icon: 'payments', color: '#94A3B8' },
            { label: 'Compras a Crédito', value: String(comprasMaterialCredito), icon: 'credit_card', color: '#ffb95f' },
            { label: 'Sin Trazabilidad', value: String(movimientosHistoricosSinTrazabilidad), icon: 'history', color: movimientosHistoricosSinTrazabilidad > 0 ? '#ffb95f' : '#4edea3' },
            { label: 'Costos Fijos (Mes)', value: formatCurrency(costosFijosMesActualUsd), icon: 'home_work', color: '#ffb95f' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: '24px' }}>{stat.icon}</span>
              </div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Formulario inline */}
        {showForm && (
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px' }}>Registrar Movimiento</span>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>TIPO</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>CONCEPTO</label>
                <input placeholder="Descripción del movimiento" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>MONTO ($)</label>
                <input placeholder="0" type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>CATEGORÍA</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}>
                  <option value="ventas">Ventas</option>
                  <option value="compras">Compras</option>
                  <option value="gastos_fijos">Gastos Fijos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>FECHA</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>NOTAS (OPCIONAL)</label>
                <input placeholder="Notas adicionales" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={createMovimiento.isPending || !form.concepto || !form.monto}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, padding: '8px 20px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: (createMovimiento.isPending || !form.concepto || !form.monto) ? 0.5 : 1 }}>
                {createMovimiento.isPending ? 'Registrando...' : 'Registrar'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }}
                style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 20px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showCostoFijoForm && (
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '15px' }}>{editingCostoFijoId ? 'Editar Costo Fijo' : 'Registrar Costo Fijo'}</span>
              <button onClick={() => { setShowCostoFijoForm(false); setCostoFijoForm(emptyCostoFijoForm); setEditingCostoFijoId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>CONCEPTO</label>
                <input placeholder="Ej: Arriendo local" value={costoFijoForm.concepto} onChange={e => setCostoFijoForm(f => ({ ...f, concepto: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>CATEGORIA</label>
                <select value={costoFijoForm.categoria} onChange={e => setCostoFijoForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}>
                  {Object.entries(COSTO_FIJO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>MONEDA</label>
                <select value={costoFijoForm.moneda} onChange={e => setCostoFijoForm(f => ({ ...f, moneda: e.target.value as 'USD' | 'BS' }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}>
                  <option value="USD">USD</option>
                  <option value="BS">BS</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>MONTO</label>
                <input placeholder="0" type="number" value={costoFijoForm.monto} onChange={e => setCostoFijoForm(f => ({ ...f, monto: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>TASA (SI BS)</label>
                <input placeholder="0" type="number" value={costoFijoForm.tasa} onChange={e => setCostoFijoForm(f => ({ ...f, tasa: e.target.value }))}
                  disabled={costoFijoForm.moneda !== 'BS'}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none', opacity: costoFijoForm.moneda !== 'BS' ? 0.6 : 1 }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>FECHA</label>
                <input type="date" value={costoFijoForm.fecha} onChange={e => setCostoFijoForm(f => ({ ...f, fecha: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
              <div className="md:col-span-2">
                <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>NOTAS (OPCIONAL)</label>
                <input placeholder="Detalle breve del gasto fijo" value={costoFijoForm.notas} onChange={e => setCostoFijoForm(f => ({ ...f, notas: e.target.value }))}
                  style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleRegistrarCostoFijo} disabled={createMovimiento.isPending || updateMovimiento.isPending || !costoFijoForm.concepto || !costoFijoForm.monto}
                style={{ backgroundColor: '#ffb95f', color: '#002a78', fontWeight: 700, padding: '8px 20px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: (createMovimiento.isPending || updateMovimiento.isPending || !costoFijoForm.concepto || !costoFijoForm.monto) ? 0.5 : 1 }}>
                {(createMovimiento.isPending || updateMovimiento.isPending) ? (editingCostoFijoId ? 'Actualizando...' : 'Registrando...') : (editingCostoFijoId ? 'Actualizar Costo Fijo' : 'Guardar Costo Fijo')}
              </button>
              <button onClick={() => { setShowCostoFijoForm(false); setCostoFijoForm(emptyCostoFijoForm); }}
                style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 20px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            COSTOS FIJOS POR PERIODO (USD)
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {costosFijosAgrupados.slice(0, 6).map((periodo) => (
              <div key={periodo.periodo} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.375rem', padding: '10px 12px' }}>
                <span style={{ color: '#94A3B8', fontSize: '12px' }}>{periodo.periodo}</span>
                <span style={{ color: '#ffb95f', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(periodo.totalUsd)}</span>
              </div>
            ))}
            {costosFijosAgrupados.length === 0 && (
              <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>
                Sin costos fijos registrados.
              </div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            PRORRATEO COSTO FIJO POR M2
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                M2 REFERENCIA MENSUAL
              </label>
              <input
                type="number"
                min="1"
                value={m2ReferenciaForm}
                onChange={e => setM2ReferenciaForm(e.target.value)}
                style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                COSTO FIJO MES
              </div>
              <div style={{ color: '#ffb95f', fontWeight: 700, fontSize: '14px' }}>{formatCurrency(costosFijosMesActualUsd)}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                COSTO FIJO / M2
              </div>
              <div style={{ color: '#4edea3', fontWeight: 700, fontSize: '14px' }}>
                {formatCurrency(costoFijoPorM2)}
              </div>
            </div>
            <div>
              <button
                onClick={guardarM2Referencia}
                disabled={updateConfiguracion.isPending}
                style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, padding: '8px 14px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: updateConfiguracion.isPending ? 0.6 : 1 }}
              >
                {updateConfiguracion.isPending ? 'Guardando...' : 'Guardar M2'}
              </button>
            </div>
          </div>
          {costeoSummary && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#b4c5ff' }}>{costeoSummary}</div>
          )}
        </div>

        {/* Solicitudes pendientes — con botones de aprobación */}
        {(() => {
          const pendientes = (solicitudes || []).filter((s: any) => s.estado === 'pendiente');
          if (pendientes.length === 0) return null;
          return (
            <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,185,95,0.25)', borderRadius: '0.5rem', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>add_shopping_cart</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SOLICITUDES PENDIENTES
                </span>
                <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,185,95,0.15)', color: '#ffb95f', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                  {pendientes.length}
                </span>
                <button onClick={() => setTab('compras')} style={{ border: '1px solid rgba(255,185,95,0.3)', backgroundColor: 'transparent', color: '#ffb95f', padding: '4px 10px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '11px' }}>
                  Ver todas
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendientes.slice(0, 5).map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="material-symbols-outlined" style={{ color: getSolicitudTipoItem(s) === 'tinta' ? '#e879f9' : '#4edea3', fontSize: '18px', flexShrink: 0 }}>
                      {getSolicitudTipoItem(s) === 'tinta' ? 'water_drop' : 'inventory_2'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.item_nombre || s.item_id || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {getSolicitudTipoItem(s) === 'tinta' ? 'Tinta' : 'Material'} · {s.prioridad || parseSolicitudMeta(s.nota)?.prioridad || 'normal'} · {new Date(s.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right', marginRight: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffb95f' }}>
                          {getSolicitudCantidad(s)} {s.unidad}
                        </div>
                      </div>
                      <button
                        onClick={() => abrirAprobar(s)}
                        style={{ padding: '5px 10px', borderRadius: '0.25rem', border: 'none', backgroundColor: '#10B981', color: '#062a1c', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(s)}
                        style={{ padding: '5px 10px', borderRadius: '0.25rem', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
                {pendientes.length > 5 && (
                  <button onClick={() => setTab('compras')} style={{ fontSize: '12px', color: '#ffb95f', textAlign: 'center', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    +{pendientes.length - 5} más — ver todas las solicitudes
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Buscador + filtro */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '20px' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por concepto o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '10px 12px 10px 40px', color: '#dae2fd', fontSize: '14px', width: '100%', outline: 'none' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '20px' }}>filter_list</span>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}
              style={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', outline: 'none' }}>
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(6,14,32,0.5)' }}>
                {['FECHA', 'CONCEPTO', 'CATEGORÍA', 'TIPO', 'ORIGEN', 'MONTO'].map(h => (
                  <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMovimientos.map((movimiento) => {
                const isCostoFijo = movimiento.categoria === 'gastos_fijos' || getMovimientoOrigen(movimiento) === 'costo_fijo';
                return (
                <tr key={movimiento.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(34,42,61,0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* FECHA */}
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#94A3B8' }}>
                    {new Date(movimiento.fecha || movimiento.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </td>
                  {/* CONCEPTO */}
                  <td style={{ padding: '12px 16px', color: '#F8FAFC', fontSize: '13px' }}>
                    {movimiento.concepto}
                  </td>
                  {/* CATEGORÍA */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ backgroundColor: '#131b2e', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '0.125rem' }}>
                      {CATEGORIA_LABELS[movimiento.categoria] || movimiento.categoria}
                    </span>
                  </td>
                  {/* TIPO */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '0.125rem',
                      backgroundColor: movimiento.tipo === 'ingreso' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: movimiento.tipo === 'ingreso' ? '#10B981' : '#EF4444',
                      border: `1px solid ${movimiento.tipo === 'ingreso' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    }}>
                      {movimiento.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>
                    {getMovimientoOrigen(movimiento)}
                  </td>
                  {/* MONTO */}
                  <td style={{ padding: '12px 16px', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: '14px', color: movimiento.tipo === 'ingreso' ? '#10B981' : '#EF4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                      <span>{movimiento.tipo === 'ingreso' ? '+' : '-'}${(movimiento.monto || 0).toLocaleString('es-CL')}</span>
                      {isCostoFijo && (
                        <button
                          type="button"
                          title="Editar costo fijo"
                          aria-label="Editar costo fijo"
                          onClick={() => {
                            setEditingCostoFijoId(movimiento.id);
                            setCostoFijoForm(getCostoFijoFormFromMovimiento(movimiento));
                            setShowCostoFijoForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: '#131b2e',
                            color: '#ffb95f',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>

          {filteredMovimientos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>account_balance_wallet</span>
              {search || filterTipo !== 'todos'
                ? 'No se encontraron movimientos'
                : 'No hay movimientos registrados. Los ingresos se generan automáticamente con los pedidos.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VISTA C: ÓRDENES DE COMPRA ───────────────────────────────
  if (tab === 'compras') {
    const solicitudesFiltradas = (solicitudes || []).filter((s: any) => s.estado === solicitudesFilter);
    const ordenesEmitidas = (ordenes || []).filter((o: any) => o.estado === 'emitida');
    const ordenesRecibidas = (ordenes || []).filter((o: any) => o.estado === 'recibida');
    const totalComprometido = ordenesEmitidas.reduce((sum: number, o: any) => sum + (Number(o.total_clp) || 0), 0);
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finanzas / Órdenes de Compra
            </p>
            <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
              Compras
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('rentabilidad')}
              style={{ border: '1px solid rgba(180,197,255,0.35)', backgroundColor: 'rgba(180,197,255,0.08)', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>query_stats</span>
              Rentabilidad
            </button>
            <button
              onClick={() => setTab('movimientos')}
              style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
              Movimientos
            </button>
            <button
              onClick={() => setTab('dashboard')}
              style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
              Dashboard
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pendientes', value: (solicitudes || []).filter((s: any) => s.estado === 'pendiente').length, color: '#ffb95f', icon: 'schedule' },
            { label: 'Aprobadas', value: (solicitudes || []).filter((s: any) => s.estado === 'aprobada').length, color: '#10B981', icon: 'check_circle' },
            { label: 'Órdenes emitidas', value: ordenesEmitidas.length, color: '#b4c5ff', icon: 'receipt_long' },
            { label: 'Comprometido', value: formatCurrency(totalComprometido), color: '#e879f9', icon: 'payments' },
          ].map((k, i) => (
            <div key={i} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '16px' }}>
              <span className="material-symbols-outlined" style={{ color: k.color, fontSize: '20px', display: 'block', marginBottom: '6px' }}>{k.icon}</span>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Solicitudes con filtro de estado */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span className="material-symbols-outlined" style={{ color: '#ffb95f', fontSize: '20px' }}>add_shopping_cart</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOLICITUDES</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              {(['pendiente', 'aprobada', 'rechazada'] as const).map(est => (
                <button key={est} onClick={() => setSolicitudesFilter(est)}
                  style={{ padding: '4px 10px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    backgroundColor: solicitudesFilter === est ? (est === 'pendiente' ? '#ffb95f' : est === 'aprobada' ? '#10B981' : '#EF4444') : '#131b2e',
                    color: solicitudesFilter === est ? (est === 'pendiente' ? '#002a78' : '#fff') : '#94A3B8',
                  }}
                >
                  {est.charAt(0).toUpperCase() + est.slice(1)} ({(solicitudes || []).filter((s: any) => s.estado === est).length})
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {solicitudesFiltradas.length === 0 && (
              <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No hay solicitudes {solicitudesFilter === 'pendiente' ? 'pendientes' : solicitudesFilter === 'aprobada' ? 'aprobadas' : 'rechazadas'}
              </div>
            )}
            {solicitudesFiltradas.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="material-symbols-outlined" style={{ color: getSolicitudTipoItem(s) === 'tinta' ? '#e879f9' : '#4edea3', fontSize: '18px', flexShrink: 0 }}>
                  {getSolicitudTipoItem(s) === 'tinta' ? 'water_drop' : 'inventory_2'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{s.item_nombre || '—'}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {getSolicitudTipoItem(s) === 'tinta' ? 'Tinta' : 'Material'} · {s.prioridad || parseSolicitudMeta(s.nota)?.prioridad || 'normal'} · {new Date(s.created_at).toLocaleDateString('es-CL')}
                    {getSolicitudObservacion(s) && <> · <span style={{ fontStyle: 'italic' }}>{getSolicitudObservacion(s)}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right', marginRight: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffb95f' }}>{getSolicitudCantidad(s)} {s.unidad}</div>
                  </div>
                  {solicitudesFilter === 'pendiente' && (
                    <>
                      <button onClick={() => abrirAprobar(s)} style={{ padding: '6px 12px', borderRadius: '0.25rem', border: 'none', backgroundColor: '#10B981', color: '#062a1c', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                        Aprobar
                      </button>
                      <button onClick={() => handleRechazar(s)} style={{ padding: '6px 12px', borderRadius: '0.25rem', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                        Rechazar
                      </button>
                    </>
                  )}
                  {solicitudesFilter !== 'pendiente' && (
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      backgroundColor: s.estado === 'aprobada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: s.estado === 'aprobada' ? '#10B981' : '#EF4444',
                    }}>
                      {s.estado}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Órdenes de compra emitidas */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(180,197,255,0.15)', borderRadius: '0.5rem', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '20px' }}>receipt_long</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ÓRDENES DE COMPRA</span>
            <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(180,197,255,0.1)', color: '#b4c5ff', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
              {(ordenes || []).length}
            </span>
          </div>
          {(ordenes || []).length === 0 ? (
            <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              No hay órdenes de compra aún. Aprueba una solicitud para generar la primera.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(ordenes || []).map((o: any) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="material-symbols-outlined" style={{ color: getSolicitudTipoItem(o) === 'tinta' ? '#e879f9' : '#4edea3', fontSize: '18px', flexShrink: 0 }}>
                    {getSolicitudTipoItem(o) === 'tinta' ? 'water_drop' : 'inventory_2'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{o.item_nombre || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      {o.proveedor_nombre || 'Sin proveedor'} · {new Date(o.created_at).toLocaleDateString('es-CL')}
                      {o.fecha_entrega_estimada && <> · Entrega: {new Date(o.fecha_entrega_estimada).toLocaleDateString('es-CL')}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#b4c5ff' }}>{o.cantidad_ordenada} {o.unidad}</div>
                      {o.total_clp && <div style={{ fontSize: '11px', color: '#64748B' }}>{formatCurrency(Number(o.total_clp))}</div>}
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      backgroundColor: o.estado === 'recibida' ? 'rgba(16,185,129,0.15)' : o.estado === 'cancelada' ? 'rgba(239,68,68,0.15)' : 'rgba(180,197,255,0.1)',
                      color: o.estado === 'recibida' ? '#10B981' : o.estado === 'cancelada' ? '#EF4444' : '#b4c5ff',
                    }}>
                      {o.estado || 'emitida'}
                    </span>
                    {o.estado === 'emitida' && (
                      <button
                        onClick={() => handleRecibirOrden(o)}
                        style={{ padding: '5px 10px', borderRadius: '0.25rem', border: 'none', backgroundColor: '#10B981', color: '#062a1c', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                      >
                        Recibir
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {ordenesRecibidas.length > 0 && (
                <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'right', marginTop: '4px' }}>
                  {ordenesRecibidas.length} {ordenesRecibidas.length === 1 ? 'orden recibida' : 'órdenes recibidas'} · recuerda registrar los egresos en Movimientos
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer aprobación */}
        {aprobarDrawerOpen && selectedSolicitud && (() => {
          // Calcular variables de presentación
          const metaDrawer = parseSolicitudMeta(selectedSolicitud.nota);
          const presentNombre = metaDrawer?.presentacion as string | null | undefined;
          const uPPDrawer = Number(metaDrawer?.unidades_por_presentacion) || 0;
          const usarPresentacion = Boolean(presentNombre) && uPPDrawer > 1;
          const cantBaseDrawer = Number(aprobacionForm.cantidad_ordenada) || 0;
          const cajasDrawer = usarPresentacion ? Math.ceil(cantBaseDrawer / uPPDrawer) : null;
          const precioPoteDrawer = Number(aprobacionForm.precio_unitario) || 0;
          const tasaDrawer = Number(aprobacionForm.tasa) || 0;
          // Precio en USD por presentación (pote, caja, etc.)
          const precioUsdPoteDrawer = aprobacionForm.moneda === 'USD'
            ? precioPoteDrawer
            : (tasaDrawer > 0 ? precioPoteDrawer / tasaDrawer : 0);
          // Precio en USD por unidad base (ml, m², unidad) — lo que se guarda
          const precioUsdBaseDrawer = precioUsdPoteDrawer > 0
            ? (usarPresentacion && uPPDrawer > 0 ? precioUsdPoteDrawer / uPPDrawer : precioUsdPoteDrawer)
            : null;
          const unidadBaseDrawer = selectedSolicitud.unidad || '';

          return (
          <>
            <div onClick={() => setAprobarDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '420px', maxWidth: '95vw', backgroundColor: '#0F172A', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 61, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px', transition: 'transform 0.25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aprobar Solicitud</p>
                  <h2 style={{ fontFamily: 'Geist, sans-serif', fontSize: '18px', fontWeight: 700, color: '#b4c5ff', marginTop: '2px' }}>{selectedSolicitud.item_nombre}</h2>
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{getSolicitudTipoItem(selectedSolicitud)} · {getSolicitudCantidad(selectedSolicitud)} {parseSolicitudMeta(selectedSolicitud.nota)?.unidad_base || selectedSolicitud.unidad || 'unid'} solicitados</p>
                </div>
                <button onClick={() => setAprobarDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                </button>
              </div>

              {/* Proveedor */}
              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Proveedor</label>
                <select
                  value={aprobacionForm.proveedor_id}
                  onChange={e => {
                    const prov = (proveedores || []).find((p: any) => p.id === e.target.value);
                    setAprobacionForm(f => ({ ...f, proveedor_id: e.target.value, proveedor_nombre: prov?.nombre || f.proveedor_nombre, moneda: prov?.moneda || f.moneda, tasa: prov?.tasa_cambio ? String(prov.tasa_cambio) : f.tasa }));
                  }}
                  style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="">Sin proveedor / manual</option>
                  {(proveedores || []).map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {!aprobacionForm.proveedor_id && (
                  <input
                    type="text" placeholder="Nombre del proveedor (manual)"
                    value={aprobacionForm.proveedor_nombre}
                    onChange={e => setAprobacionForm(f => ({ ...f, proveedor_nombre: e.target.value }))}
                    style={{ width: '100%', marginTop: '6px', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                  />
                )}
              </div>

              {/* Cantidad + Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                    Cantidad a ordenar{unidadBaseDrawer ? ` (${unidadBaseDrawer})` : ''}
                  </label>
                  <input type="number" min="0" value={aprobacionForm.cantidad_ordenada}
                    onChange={e => setAprobacionForm(f => ({ ...f, cantidad_ordenada: e.target.value }))}
                    style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                  />
                  {usarPresentacion && cajasDrawer !== null && (
                    <p style={{ marginTop: '5px', fontSize: '11px', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                      → {cajasDrawer} {presentNombre}{cajasDrawer !== 1 ? 's' : ''} a comprar
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                    {usarPresentacion ? `Precio por ${presentNombre}` : 'Precio unitario'}
                  </label>
                  <input type="number" min="0" value={aprobacionForm.precio_unitario}
                    onChange={e => setAprobacionForm(f => ({ ...f, precio_unitario: e.target.value }))}
                    placeholder="0"
                    style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                  />
                  {precioPoteDrawer > 0 && precioUsdBaseDrawer !== null && (
                    <p style={{ marginTop: '5px', fontSize: '11px', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                      = USD {precioUsdBaseDrawer.toFixed(6)}{unidadBaseDrawer ? `/${unidadBaseDrawer}` : '/unid'} (se guardará)
                    </p>
                  )}
                </div>
              </div>

              {/* Moneda + tasa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Moneda del precio</label>
                  <select value={aprobacionForm.moneda} onChange={e => setAprobacionForm(f => ({ ...f, moneda: e.target.value as 'USD' | 'EUR' | 'Binance' | 'BS' }))}
                    style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="Binance">Binance</option>
                    <option value="BS">BS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                    {aprobacionForm.moneda === 'USD' ? 'Tasa BS/USD (ref. BS)' : `Tasa ${aprobacionForm.moneda}/USD`}
                  </label>
                  <input type="number" min="0" value={aprobacionForm.tasa}
                    onChange={e => setAprobacionForm(f => ({ ...f, tasa: e.target.value }))}
                    placeholder={String(dolaresBs || '')}
                    style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                  />
                  {aprobacionForm.moneda === 'USD' && (
                    <p style={{ marginTop: '4px', fontSize: '10px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                      Para ver equiv. en BS
                    </p>
                  )}
                </div>
              </div>

              {/* Total estimado */}
              {aprobacionForm.precio_unitario && aprobacionForm.cantidad_ordenada && (
                <div style={{ backgroundColor: 'rgba(180,197,255,0.06)', border: '1px solid rgba(180,197,255,0.15)', borderRadius: '0.5rem', padding: '12px 14px' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>TOTAL — SE GUARDARÁ EN USD</span>
                  <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: '#b4c5ff', marginTop: '2px' }}>
                    USD {totalUsdAprobacion.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {aprobacionForm.moneda !== 'USD' && (
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
                      {formatMoney(totalAprobacion, aprobacionForm.moneda)} pagados en {aprobacionForm.moneda}
                    </div>
                  )}
                  {aprobacionForm.moneda === 'USD' && totalBsAprobacion > 0 && (
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                      ≈ BS {totalBsAprobacion.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (referencia)
                    </div>
                  )}
                  {usarPresentacion && cajasDrawer !== null && precioPoteDrawer > 0 && (
                    <p style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                      {cajasDrawer} {presentNombre}{cajasDrawer !== 1 ? 's' : ''} × {precioPoteDrawer.toLocaleString('es-CL')} {aprobacionForm.moneda}
                    </p>
                  )}
                  {precioUsdBaseDrawer !== null && precioUsdBaseDrawer > 0 && (
                    <p style={{ marginTop: '6px', fontSize: '11px', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                      USD {precioUsdBaseDrawer.toFixed(6)}{unidadBaseDrawer ? ` por ${unidadBaseDrawer}` : '/unid'} (precio base guardado)
                    </p>
                  )}
                </div>
              )}

              {/* Fecha entrega */}
              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Fecha de entrega estimada (opcional)</label>
                <input type="date" value={aprobacionForm.fecha_entrega_estimada}
                  onChange={e => setAprobacionForm(f => ({ ...f, fecha_entrega_estimada: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Nota */}
              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Nota (opcional)</label>
                <textarea value={aprobacionForm.nota} rows={2}
                  onChange={e => setAprobacionForm(f => ({ ...f, nota: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', color: '#dae2fd', padding: '9px 12px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={() => setAprobarDrawerOpen(false)}
                  style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '10px 0', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button onClick={submitAprobacion} disabled={createOrden.isPending || updateSolicitud.isPending}
                  style={{ flex: 2, backgroundColor: '#10B981', color: '#062a1c', padding: '10px 0', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: createOrden.isPending ? 0.7 : 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  {createOrden.isPending ? 'Creando orden...' : 'Confirmar Orden de Compra'}
                </button>
              </div>
            </div>
          </>
          );
        })()}
      </div>
    );
  }

  // ─── VISTA D: RENTABILIDAD POR PEDIDO ───────────────────────────
  if (tab === 'rentabilidad') {
    const rows = rentabilidadPedidos.rows;
    const summary = rentabilidadPedidos.summary;
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finanzas / Rentabilidad
            </p>
            <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
              Rentabilidad por Pedido
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('movimientos')}
              style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
              Movimientos
            </button>
            <button
              onClick={() => setTab('dashboard')}
              style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
              Dashboard
            </button>
            <button
              onClick={() => setTab('compras')}
              style={{ border: '1px solid rgba(255,185,95,0.35)', backgroundColor: 'rgba(255,185,95,0.08)', color: '#ffb95f', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_cart</span>
              Compras
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pedidos analizados', value: summary.pedidos, icon: 'query_stats', color: '#b4c5ff' },
            { label: 'Ingresos', value: formatCurrency(summary.ingresos), icon: 'payments', color: '#10B981' },
            { label: 'Costo real', value: formatCurrency(summary.costoReal), icon: 'inventory_2', color: '#EF4444' },
            { label: 'Utilidad real', value: formatCurrency(summary.utilidadReal), icon: 'trending_up', color: summary.utilidadReal >= 0 ? '#10B981' : '#EF4444' },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: '24px' }}>{stat.icon}</span>
              </div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(180,197,255,0.12)', borderRadius: '0.5rem', padding: '20px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              UTILIDAD ESTIMADA VS REAL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Utilidad estimada</span>
                <span style={{ color: '#b4c5ff', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(summary.utilidadEstimada)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Utilidad real</span>
                <span style={{ color: summary.utilidadReal >= 0 ? '#10B981' : '#EF4444', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(summary.utilidadReal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Diferencia</span>
                <span style={{ color: summary.diferenciaUtilidad >= 0 ? '#10B981' : '#EF4444', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(summary.diferenciaUtilidad)}</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(180,197,255,0.12)', borderRadius: '0.5rem', padding: '20px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              COSTOS DESCOMPUESTOS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Material real</span>
                <span style={{ color: '#4edea3', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(summary.costoReal - (rows.reduce((sum: number, row: any) => sum + row.tintaRealUsd + row.costoFijoAsignadoUsd, 0)))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Tinta real</span>
                <span style={{ color: '#e879f9', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(rows.reduce((sum: number, row: any) => sum + row.tintaRealUsd, 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>Fijo asignado</span>
                <span style={{ color: '#ffb95f', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(rows.reduce((sum: number, row: any) => sum + row.costoFijoAsignadoUsd, 0))}</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(180,197,255,0.12)', borderRadius: '0.5rem', padding: '20px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              COBERTURA
            </div>
            <div style={{ color: '#dae2fd', fontSize: '13px', lineHeight: 1.6 }}>
              <div>Pedidos con consumo real: <strong>{rows.filter((row: any) => row.tieneConsumosReales).length}</strong></div>
              <div>Pedidos con snapshot: <strong>{rows.filter((row: any) => row.snapshot).length}</strong></div>
              <div>Recetas cargadas: <strong>{summary.recipesTotal}</strong></div>
              <div style={{ marginTop: '8px', color: '#94A3B8' }}>
                Si un pedido aún no tiene consumos reales, el tablero usa el costo estimado como referencia operativa.
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(6,14,32,0.5)' }}>
                {['PEDIDO', 'INGRESO', 'COSTO REAL', 'COSTO EST.', 'UTILIDAD REAL', 'MARGEN', 'ESTADO'].map(h => (
                  <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row: any) => (
                <tr key={row.pedido.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#b4c5ff' }}>#{row.pedido.id?.slice(0, 8)?.toUpperCase()}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {row.pedido.descripcion || `Pedido ${row.items.length} ítem(s)`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10B981', fontWeight: 700 }}>{formatCurrency(row.ingresoUsd)}</td>
                  <td style={{ padding: '12px 16px', color: '#EF4444', fontWeight: 700 }}>{formatCurrency(row.costoRealConsumidoUsd)}</td>
                  <td style={{ padding: '12px 16px', color: '#ffb95f', fontWeight: 700 }}>{formatCurrency(row.costoEstimadoUsd)}</td>
                  <td style={{ padding: '12px 16px', color: row.utilidadRealUsd >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{formatCurrency(row.utilidadRealUsd)}</td>
                  <td style={{ padding: '12px 16px', color: row.margenRealPct >= 0 ? '#b4c5ff' : '#EF4444', fontWeight: 700 }}>{row.margenRealPct.toFixed(1)}%</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '0.125rem',
                      backgroundColor: row.tieneConsumosReales ? 'rgba(16,185,129,0.2)' : 'rgba(255,185,95,0.2)',
                      color: row.tieneConsumosReales ? '#10B981' : '#ffb95f',
                      border: `1px solid ${row.tieneConsumosReales ? 'rgba(16,185,129,0.4)' : 'rgba(255,185,95,0.4)'}`,
                    }}>
                      {row.tieneConsumosReales ? 'real' : 'estimado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>query_stats</span>
              No hay pedidos para analizar rentabilidad.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VISTA B: DASHBOARD ────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Finanzas / Dashboard
          </p>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff' }}>
            Dashboard Financiero
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('rentabilidad')}
            style={{ border: '1px solid rgba(180,197,255,0.35)', backgroundColor: 'rgba(180,197,255,0.08)', color: '#b4c5ff', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>query_stats</span>
            Rentabilidad
          </button>
          <button
            onClick={() => setTab('compras')}
            style={{ border: '1px solid rgba(255,185,95,0.35)', backgroundColor: 'rgba(255,185,95,0.08)', color: '#ffb95f', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_cart</span>
            Compras
            {(solicitudes || []).filter((s: any) => s.estado === 'pendiente').length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ffb95f', color: '#002a78', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', lineHeight: 1.4 }}>
                {(solicitudes || []).filter((s: any) => s.estado === 'pendiente').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('movimientos')}
            style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', padding: '8px 16px', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
            Ver Movimientos
          </button>
        </div>
      </div>

      {/* Balance del mes */}
      <div style={{ backgroundColor: '#222a3d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          BALANCE DEL MES ACTUAL
        </div>
        <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '40px', fontWeight: 700, color: balanceMes >= 0 ? '#b4c5ff' : '#EF4444' }}>
          {formatCurrency(balanceMes)}
        </div>
        <div className="flex gap-6 mt-3">
          <span style={{ color: '#10B981', fontSize: '14px', fontWeight: 600 }}>Ingresos: {formatCurrency(ingresosMes)}</span>
          <span style={{ color: '#EF4444', fontSize: '14px', fontWeight: 600 }}>Egresos: {formatCurrency(egresosMes)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            CONCILIACIÓN OPERATIVA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Pedidos cobrados</span>
              <span style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(ingresosPedidosPagados)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Ingresos registrados</span>
              <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(totalIngresos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Compras materiales</span>
              <span style={{ color: '#4edea3', fontSize: '13px', fontWeight: 700 }}>{formatCurrency(comprasMaterialTotalUsd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Movimientos sin notas</span>
              <span style={{ color: movimientosSinNotas > 0 ? '#ffb95f' : '#F8FAFC', fontSize: '13px', fontWeight: 700 }}>{movimientosSinNotas}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Conciliados</span>
              <span style={{ color: '#4edea3', fontSize: '13px', fontWeight: 700 }}>{pedidosConciliados + comprasConciliadas}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Pendientes revisión</span>
              <span style={{ color: pendientesConciliacion > 0 ? '#ffb95f' : '#F8FAFC', fontSize: '13px', fontWeight: 700 }}>{pendientesConciliacion}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            MOVIMIENTOS MANUALES
          </div>
          <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '32px', fontWeight: 700, color: movimientosManual > 0 ? '#ffb95f' : '#b4c5ff' }}>
            {movimientosManual}
          </div>
          <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>
            Estos movimientos no se cruzan automáticamente con pedidos o compras. Conviene revisarlos.
          </div>
        </div>

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            TIPO DE CAMBIO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>BCV</span>
              <span style={{ color: '#b4c5ff', fontSize: '13px', fontWeight: 700 }}>{dolaresBs ? `${dolaresBs.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: '13px' }}>Binance</span>
              <span style={{ color: '#4edea3', fontSize: '13px', fontWeight: 700 }}>{binanceBs ? `${binanceBs.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : '—'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              El valor de compras en USD se mantiene consistente con los reabastecimientos de inventario.
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
          FUENTES RECIENTES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {movimientosCruzados.slice(0, 8).map((item: any) => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{item.concepto}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                  {new Date(item.fecha).toLocaleDateString('es-CL')} · {String(item.origen).replaceAll('_', ' ')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: item.tipo === 'ingreso' ? '#10B981' : '#EF4444' }}>
                  {item.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(Number(item.monto) || 0)}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>
                  {item.categoria}
                </div>
              </div>
            </div>
          ))}
          {movimientosCruzados.length === 0 && (
            <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>Sin fuentes para conciliar</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            INGRESOS DESDE PEDIDOS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pedidoPendientesCaja.map((pedido: any) => {
              const cliente = pedido.clientes?.nombre_completo || pedido.clientes?.nombre || 'Sin cliente';
              const already = movimientoRegistrado('pedido', pedido.id);
              return (
                <div key={pedido.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{cliente}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      Pedido {pedido.id?.slice(0, 8)?.toUpperCase() || '—'} · {pedido.estado || 'sin estado'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{formatCurrency(Number(pedido.precio_total) || 0)}</div>
                    <button
                      onClick={() => registrarIngresoPedido(pedido)}
                      disabled={already || createMovimiento.isPending}
                      style={{ marginTop: '6px', padding: '6px 10px', borderRadius: '0.25rem', border: 'none', backgroundColor: already ? '#2d3449' : '#10B981', color: already ? '#94A3B8' : '#062a1c', fontWeight: 700, fontSize: '12px', cursor: already ? 'not-allowed' : 'pointer' }}
                    >
                      {already ? 'Registrado' : 'Cobrar'}
                    </button>
                  </div>
                </div>
              );
            })}
            {pedidoPendientesCaja.length === 0 && (
              <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>No hay pedidos para conciliar</div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            EGRESOS DESDE COMPRAS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {compraPendientesCaja.map((compra: any) => {
              const already = movimientoRegistrado('compra_material', compra.id);
              const material = (comprasMaterial || []).find((c: any) => c.id === compra.id);
              return (
                <div key={compra.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', backgroundColor: '#131b2e', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{compra.proveedor || 'Compra material'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      {material?.material_id ? `Material ${String(material.material_id).slice(0, 8).toUpperCase()}` : 'Sin material'} · {compra.estado_pago || 'pagado'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>{formatCurrency(Number(compra.precio_usd || compra.precio_moneda || 0))}</div>
                    <button
                      onClick={() => registrarEgresoCompra(compra)}
                      disabled={already || createMovimiento.isPending}
                      style={{ marginTop: '6px', padding: '6px 10px', borderRadius: '0.25rem', border: 'none', backgroundColor: already ? '#2d3449' : '#EF4444', color: already ? '#94A3B8' : '#fff1f1', fontWeight: 700, fontSize: '12px', cursor: already ? 'not-allowed' : 'pointer' }}
                    >
                      {already ? 'Registrado' : 'Pagar'}
                    </button>
                  </div>
                </div>
              );
            })}
            {compraPendientesCaja.length === 0 && (
              <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>No hay compras para conciliar</div>
            )}
          </div>
        </div>
      </div>

      {/* Últimos 6 meses */}
      <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
          ÚLTIMOS 6 MESES
        </div>
        <div className="flex items-end justify-around" style={{ height: '160px', gap: '12px' }}>
          {datosMeses.map((d, i) => {
            const hIng = maxMes > 0 ? (d.ingresos / maxMes) * 120 : 0;
            const hEgr = maxMes > 0 ? (d.egresos / maxMes) * 120 : 0;
            return (
              <div key={i} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div className="flex items-end gap-1" style={{ height: '120px' }}>
                  <div style={{ width: '24px', height: `${hIng}px`, backgroundColor: '#10B981', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} title={`Ingresos: ${formatCurrency(d.ingresos)}`} />
                  <div style={{ width: '24px', height: `${hEgr}px`, backgroundColor: '#EF4444', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} title={`Egresos: ${formatCurrency(d.egresos)}`} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', marginTop: '8px' }}>{d.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', backgroundColor: '#10B981', borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Ingresos</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', backgroundColor: '#EF4444', borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Egresos</span>
          </div>
        </div>
      </div>

      {/* Por categoría + Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por categoría */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
            POR CATEGORÍA
          </div>
          <div className="space-y-4">
            {datosCategorias.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '13px', color: '#dae2fd' }}>{d.label}</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 600, color: '#b4c5ff' }}>{formatCurrency(d.total)}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(d.total / maxCat) * 100}%`, height: '100%', backgroundColor: '#b4c5ff', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
            {datosCategorias.length === 0 && (
              <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos por categoría</div>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '24px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
            FLUJO INGRESO VS EGRESO
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Promedio Mensual Ingresos', value: formatCurrency(promedioIngresos), color: '#10B981', icon: 'trending_up' },
              { label: 'Promedio Mensual Egresos', value: formatCurrency(promedioEgresos), color: '#EF4444', icon: 'trending_down' },
              { label: 'Mes con Más Ingresos', value: mesMasIngresos.label, color: '#b4c5ff', icon: 'calendar_month' },
              { label: 'Categoría Top de Gasto', value: catTopGasto.label, color: '#ffb95f', icon: 'category' },
            ].map((m, i) => (
              <div key={i} style={{ backgroundColor: '#171f33', borderRadius: '0.5rem', padding: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: m.color, fontSize: '20px', display: 'block', marginBottom: '8px' }}>{m.icon}</span>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
