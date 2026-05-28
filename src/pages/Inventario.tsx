import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  useMateriales, useTintas, useCreateMaterial, useUpdateMaterial, useCreateTinta, useUpdateTinta,
  usePedidos, useTrabajos, useProductoMaterialesAll, useConsumoMateriales, useConsumoTintaPedido,
  useComprasMaterial, useCreateCompraMaterial, useUpdateCompraMaterial, useDeleteCompraMaterial, useRecipeModuleEnabled, useCreateMovimientoCaja,
  useMovimientosCaja, useSolicitudesCompra, useCreateSolicitudCompra, useUpdateSolicitudCompra, useDeleteSolicitudCompra, useProveedores, useOrdenesCompra,
} from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRecipeFactor, recipeAppliesToMachine, recipeAppliesToMaterial } from '@/lib/recipeCalculations';

type TabType = 'materiales' | 'tintas' | 'compras' | 'kardex';

const TINTA_PRESENTACIONES = [
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'cartucho', label: 'Cartucho' },
  { value: 'pote', label: 'Pote' },
  { value: 'caja', label: 'Caja' },
] as const;

const TINTA_MARCAS = [
  { value: 'Mimaki BS4', label: 'Mimaki BS4' },
  { value: 'Nutte', label: 'Nutte' },
  { value: 'Epson', label: 'Epson' },
  { value: 'Roland', label: 'Roland' },
  { value: 'Otro', label: 'Otro' },
] as const;

const TINTA_COLORES = [
  { value: 'magenta', label: 'Magenta', color: '#e879f9' },
  { value: 'cian', label: 'Cian', color: '#22d3ee' },
  { value: 'amarillo', label: 'Amarillo', color: '#fde047' },
  { value: 'negro', label: 'Negro', color: '#94A3B8' },
] as const;

const TINTA_COLOR_FIELD_MAP: Record<string, 'magenta_cantidad' | 'cian_cantidad' | 'amarillo_cantidad' | 'negro_cantidad'> = {
  magenta: 'magenta_cantidad',
  cian: 'cian_cantidad',
  amarillo: 'amarillo_cantidad',
  negro: 'negro_cantidad',
};


const MATERIAL_UNIT_OPTIONS = [
  { value: 'm2', label: 'Metro cuadrado (m²)', measureLabel: 'Ancho (cm)', measurePlaceholder: '127', totalLabel: 'Metros cuadrados totales', remainingLabel: 'Metros cuadrados disponibles', stockLabel: 'Rollos en stock', priceLabel: 'Precio por m²', amountLabel: 'm²', hint: 'Ideal para lonas, telas y materiales que se miden por metro cuadrado.' },
  { value: 'rollo', label: 'Rollo de tela', measureLabel: 'Ancho (cm)', measurePlaceholder: '127', totalLabel: 'Largo total (m)', remainingLabel: 'Largo restante (m)', stockLabel: 'Rollos en stock', priceLabel: 'Precio por rollo', amountLabel: 'metros', hint: 'Ideal para telas, lonas y PVC en rollo.' },
  { value: 'metro_lineal', label: 'Metro lineal', measureLabel: 'Ancho (cm)', measurePlaceholder: '20', totalLabel: 'Metros lineales totales', remainingLabel: 'Metros lineales disponibles', stockLabel: 'Piezas / rollos', priceLabel: 'Precio por metro lineal', amountLabel: 'metros lineales', hint: 'Ideal para madera, perfiles o piezas que se venden por metro lineal.' },
  { value: 'caja', label: 'Caja', measureLabel: 'Contenido por caja', measurePlaceholder: '24', totalLabel: 'Unidades totales', remainingLabel: 'Unidades disponibles', stockLabel: 'Cajas en stock', priceLabel: 'Precio por caja', amountLabel: 'unidades', hint: 'Ideal para bisagras, grapas, tornillos y ferretería.' },
  { value: 'paquete', label: 'Paquete', measureLabel: 'Contenido por paquete', measurePlaceholder: '10', totalLabel: 'Unidades totales', remainingLabel: 'Unidades disponibles', stockLabel: 'Paquetes en stock', priceLabel: 'Precio por paquete', amountLabel: 'unidades', hint: 'Ideal para insumos agrupados por paquete.' },
  { value: 'unidad', label: 'Unidad', measureLabel: 'Contenido por unidad', measurePlaceholder: '1', totalLabel: 'Cantidad total', remainingLabel: 'Cantidad disponible', stockLabel: 'Unidades en stock', priceLabel: 'Precio por unidad', amountLabel: 'unidades', hint: 'Ideal para piezas sueltas.' },
  { value: 'ml', label: 'Mililitros', measureLabel: 'Contenido por envase (ml)', measurePlaceholder: '1000', totalLabel: 'Ml totales', remainingLabel: 'Ml disponibles', stockLabel: 'Envases en stock', priceLabel: 'Precio por envase', amountLabel: 'ml', hint: 'Ideal para pegas, solventes y líquidos.' },
  { value: 'litro', label: 'Litro', measureLabel: 'Contenido por envase (ml)', measurePlaceholder: '1000', totalLabel: 'Litros totales', remainingLabel: 'Litros disponibles', stockLabel: 'Envases en stock', priceLabel: 'Precio por envase', amountLabel: 'litros', hint: 'Ideal para productos medidos por litros.' },
  { value: 'galon', label: 'Galón', measureLabel: 'Contenido por envase (ml)', measurePlaceholder: '3785', totalLabel: 'Galones totales', remainingLabel: 'Galones disponibles', stockLabel: 'Envases en stock', priceLabel: 'Precio por galón', amountLabel: 'galones', hint: 'Ideal para pegas o pinturas en presentación de galón.' },
  { value: 'pote', label: 'Pote', measureLabel: 'Contenido por pote (ml)', measurePlaceholder: '500', totalLabel: 'Potes totales', remainingLabel: 'Potes disponibles', stockLabel: 'Potes en stock', priceLabel: 'Precio por pote', amountLabel: 'potes', hint: 'Ideal para potes de pega blanca o pega amarilla.' },
] as const;

function getMaterialUnitMeta(unidad?: string | null) {
  return MATERIAL_UNIT_OPTIONS.find(option => option.value === unidad) || MATERIAL_UNIT_OPTIONS[0];
}

function parseItemsFromPedido(pedido: any): any[] {
  try {
    if (pedido?.notas) {
      const parsed = JSON.parse(pedido.notas);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.producto_nombre) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items) && parsed.items.length > 0 && parsed.items[0]?.producto_nombre) {
        return parsed.items;
      }
    }
  } catch {
    /* notas puede ser texto plano */
  }
  return [];
}

function getPedidoBaseUnits(item: any) {
  if (item?.tipo_cobro === 'm2') {
    return (Number(item.cantidad) || 0) * (Number(item.ancho) || 0) * (Number(item.alto) || 0);
  }
  return Number(item?.cantidad) || 0;
}

function parseNotaFields(notas?: string | null) {
  return (notas || '').split('|').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) return acc;
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});
}

function parseSolicitudInventarioMeta(nota?: string | null) {
  try {
    const raw = String(nota || '').trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
  } catch {
    /* nota puede ser texto libre */
  }
  return null;
}

function getSolicitudTipoItem(solicitud?: any) {
  const meta = parseSolicitudInventarioMeta(solicitud?.nota) || {};
  const tipo = String(solicitud?.tipo_item || meta?.tipo || '').toLowerCase();
  if (tipo === 'tinta' || tipo === 'material') return tipo;
  return String(solicitud?.item_nombre || '').toLowerCase().includes('tinta') ? 'tinta' : 'material';
}

function getSolicitudTintaMeta(solicitud?: any) {
  const meta = parseSolicitudInventarioMeta(solicitud?.nota) || {};
  const color = String(meta?.color || solicitud?.tinta_color || '').trim().toLowerCase();
  return {
    marca: String(meta?.marca || solicitud?.tinta_marca || 'Sin marca').trim() || 'Sin marca',
    color,
    presentacion: String(meta?.presentacion || solicitud?.tinta_presentacion || 'bolsa').trim().toLowerCase() || 'bolsa',
    mlPresentacion: Number(meta?.unidades_por_presentacion || solicitud?.tinta_ml_presentacion || 0) || 0,
    totalMl: Number(meta?.cantidad_solicitada || solicitud?.cantidad_solicitada || 0) || 0,
    presentaciones: Number(meta?.presentaciones_solicitadas || solicitud?.tinta_presentaciones || 0) || 0,
  };
}

function groupTintasByMarca(tintas: any[] | undefined) {
  return (tintas || []).reduce((acc: Record<string, any[]>, tinta: any) => {
    const marca = String(tinta?.marca || tinta?.nombre || 'Sin marca').trim() || 'Sin marca';
    if (!acc[marca]) acc[marca] = [];
    acc[marca].push(tinta);
    return acc;
  }, {});
}

function serializeSolicitudInventarioMeta(meta: Record<string, any>) {
  return JSON.stringify(meta);
}

function normalizeSolicitudEstado(estado?: string | null) {
  const raw = String(estado || '').trim().toLowerCase();
  if (!raw) return 'pendiente';
  if (raw === 'aprobado') return 'aprobada';
  if (raw === 'recibido') return 'recibida';
  if (raw === 'en camino' || raw === 'encamino') return 'en_camino';
  if (raw === 'rechazado') return 'rechazada';
  return raw;
}

function getSolicitudEstadoIndex(estado?: string | null) {
  const order = ['pendiente', 'aprobada', 'en_camino', 'recibida'];
  const idx = order.indexOf(normalizeSolicitudEstado(estado));
  return idx === -1 ? 0 : idx;
}

function normalizeMaterialKey(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPresentationPlural(presentation: string) {
  const map: Record<string, string> = {
    caja: 'cajas',
    paquete: 'paquetes',
    unidad: 'unidades',
    ml: 'ml',
    litro: 'litros',
    galon: 'galones',
    pote: 'potes',
    rollo: 'rollos',
    metro_lineal: 'metros lineales',
  };
  return map[normalizeMaterialKey(presentation)] || `${presentation}s`;
}

function getCajaContributionForCompra(movimientos: any[] | undefined, compra: any) {
  return (movimientos || []).reduce((total, movimiento) => {
    const notas = String(movimiento.notas || '');
    if (!notas.includes('origen=compra_material')) return total;
    const fields = parseNotaFields(notas);
    const exactId = fields.compra_id && fields.compra_id === compra.id;
    const fallbackMatch =
      !fields.compra_id &&
      fields.material_id === String(compra.material_id || '') &&
      String(fields.proveedor || '') === String(compra.proveedor || '');
    if (!exactId && !fallbackMatch) return total;
    const monto = Number(movimiento.monto || 0) || 0;
    return total + (movimiento.tipo === 'ingreso' ? monto : -monto);
  }, 0);
}

function buildProjectedMaterialRows(pedidos: any[] | undefined, trabajos: any[] | undefined, recetasProductos: any[] | undefined, materiales: any[] | undefined) {
  const recipeByProductId = (recetasProductos || []).reduce((acc: Record<string, any[]>, row: any) => {
    if (!acc[row.producto_id]) acc[row.producto_id] = [];
    acc[row.producto_id].push(row);
    return acc;
  }, {});

  const jobByPedido = (trabajos || []).reduce((acc: Record<string, any>, trabajo: any) => {
    if (!trabajo.pedido_id) return acc;
    if (!acc[trabajo.pedido_id] || new Date(trabajo.created_at || 0) > new Date(acc[trabajo.pedido_id].created_at || 0)) {
      acc[trabajo.pedido_id] = trabajo;
    }
    return acc;
  }, {});

  const rows = (pedidos || [])
    .filter((pedido: any) => pedido.estado !== 'cancelado' && pedido.estado !== 'completado')
    .flatMap((pedido: any) => {
      const items = parseItemsFromPedido(pedido);
      const trabajo = jobByPedido[pedido.id];
      const origin = trabajo?.estado === 'listo'
        ? 'Trabajo listo'
        : trabajo?.estado === 'en_proceso'
          ? 'Trabajo en proceso'
          : 'Pedido pendiente';

      return items.flatMap((item: any) => {
        const productRecipes = recipeByProductId[item.producto_id] || [];
        const baseUnits = getPedidoBaseUnits(item);
        return productRecipes.map((recipe: any) => {
          const material = (materiales || []).find((m: any) => m.id === recipe.material_id);
          if (!recipeAppliesToMachine(recipe, item.maquina_id)) return null;
          if (!recipeAppliesToMaterial(recipe, material)) return null;
          const consumo = getRecipeFactor(recipe, { quantity: Number(item.cantidad) || 0, baseUnits });
          return {
            key: `${pedido.id}-${item.id}-${recipe.id}`,
            tipo: 'proyeccion',
            created_at: trabajo?.created_at || pedido.created_at || pedido.fecha_limite || new Date().toISOString(),
            origen: origin,
            material_id: recipe.material_id,
            material_nombre: material?.tipo || material?.nombre || 'Material',
            producto_nombre: item.producto_nombre,
            consumo,
            unidad: material?.unidad_medida || 'm2',
            pedido_id: pedido.id,
            cliente: pedido.clientes?.nombre_completo || pedido.clientes?.nombre || 'Sin cliente',
          };
        }).filter(Boolean);
      });
    });

  return rows;
}

export default function Inventario() {
  const { data: pedidos } = usePedidos();
  const { data: trabajos } = useTrabajos();
  const { data: recetasProductos } = useProductoMaterialesAll();
  const { data: consumoMateriales } = useConsumoMateriales();
  const { data: consumoTintas } = useConsumoTintaPedido();
  const { data: comprasMaterial } = useComprasMaterial();
  const { data: proveedores } = useProveedores();
  const recipeFeaturesEnabled = useRecipeModuleEnabled();
  const { data: movimientosCaja } = useMovimientosCaja();
  const { data: materiales, isLoading: loadingMateriales } = useMateriales();
  const { data: tintas, isLoading: loadingTintas } = useTintas();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const createTinta = useCreateTinta();
  const updateTinta = useUpdateTinta();
  const createCompraMaterial = useCreateCompraMaterial();
  const updateCompraMaterial = useUpdateCompraMaterial();
  const deleteCompraMaterial = useDeleteCompraMaterial();
  const createMovimientoCaja = useCreateMovimientoCaja();

  const [activeTab, setActiveTab] = useState<TabType>('materiales');
  const [searchMateriales, setSearchMateriales] = useState('');
  const [searchKardex, setSearchKardex] = useState('');
  const [searchCompras, setSearchCompras] = useState('');
  const [comprasMaterialFilter, setComprasMaterialFilter] = useState<string>('all');
  const [comprasProveedorFilter, setComprasProveedorFilter] = useState('');
  const [comprasEstadoFilter, setComprasEstadoFilter] = useState('all');
  const [kardexMaterialId, setKardexMaterialId] = useState<string>('');

  // Material form state
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState({
    tipo: '',
    unidad_medida: 'rollo',
    ancho: '',
    largo_original: '',
    largo_restante: '',
    stock: '',
    nota: '',
    precio_m2: '',
  });

  // Edit material record drawer
  const [editMatDrawer, setEditMatDrawer] = useState<any>(null);
  const [editMatForm, setEditMatForm] = useState({ tipo: '', unidad_medida: 'm2', precio_m2: '', precio_unitario: '' });

  function openEditMat(mat: any) {
    setEditMatForm({
      tipo: mat.tipo || '',
      unidad_medida: mat.unidad_medida || 'm2',
      precio_m2: mat.precio_m2?.toString() || '0',
      precio_unitario: mat.precio_unitario?.toString() || '0',
    });
    setEditMatDrawer(mat);
  }
  async function handleSaveMat() {
    if (!editMatDrawer?.id) return;
    const patch: Record<string, any> = { tipo: editMatForm.tipo, unidad_medida: editMatForm.unidad_medida };
    if (editMatForm.unidad_medida === 'm2') {
      patch.precio_m2 = parseFloat(editMatForm.precio_m2) || 0;
    } else {
      patch.precio_unitario = parseFloat(editMatForm.precio_unitario) || 0;
    }
    await updateMaterial.mutateAsync({ id: editMatDrawer.id, ...patch });
    setEditMatDrawer(null);
  }

  // Reabastecer material state
  const [reabastecerMaterialId, setReabastecerMaterialId] = useState<string | null>(null);
  const [metrosAgregar, setMetrosAgregar] = useState('');
  const [reabastecerMaterialForm, setReabastecerMaterialForm] = useState({
    proveedor: '',
    moneda: 'USD',
    tasa_usd: '1',
    es_credito: false,
    estado_pago: 'pagado',
    nota: '',
  });
  const [editingCompraMaterial, setEditingCompraMaterial] = useState<any>(null);

  // Reabastecer tinta state
  const [reabastecerTintaId, setReabastecerTintaId] = useState<string | null>(null);
  const [tintaAgregar, setTintaAgregar] = useState({ magenta: '', cian: '', amarillo: '', negro: '' });
  const [tintaDrawerOpen, setTintaDrawerOpen] = useState(false);
  const [editingTinta, setEditingTinta] = useState<any>(null);
  const [tintaForm, setTintaForm] = useState({
    nombre: '',
    marca: 'Mimaki BS4',
    presentacion: 'bolsa',
    ml_presentacion: '2000',
    magenta_cantidad: '0',
    cian_cantidad: '0',
    amarillo_cantidad: '0',
    negro_cantidad: '0',
    magenta_minimo: '1',
    cian_minimo: '1',
    amarillo_minimo: '1',
    negro_minimo: '1',
  });

  // Solicitudes de compra
  const { data: solicitudes } = useSolicitudesCompra();
  const { data: ordenesCompra } = useOrdenesCompra();
  const createSolicitud = useCreateSolicitudCompra();
  const updateSolicitud = useUpdateSolicitudCompra();
  const deleteSolicitud = useDeleteSolicitudCompra();
  const [solicitudDrawerOpen, setSolicitudDrawerOpen] = useState(false);
  const [solicitudForm, setSolicitudForm] = useState({
    tipo_item: 'material' as 'material' | 'tinta',
    item_id: '',
    item_nombre: '',
    cantidad_solicitada: '',
    unidad: 'm',
    prioridad: 'normal',
    nota: '',
    tinta_marca: 'Mimaki BS4',
    tinta_color: 'magenta',
    tinta_presentacion: 'bolsa',
    tinta_ml_presentacion: '2000',
    tinta_presentaciones: '1',
  });
  const tintaLowSummary = useMemo(() => {
    const low = (tintas || []).filter((t) =>
      (t.magenta_cantidad || 0) < (t.magenta_minimo || 0) ||
      (t.cian_cantidad || 0) < (t.cian_minimo || 0) ||
      (t.amarillo_cantidad || 0) < (t.amarillo_minimo || 0) ||
      (t.negro_cantidad || 0) < (t.negro_minimo || 0)
    ).length;
    return { total: tintas?.length || 0, low };
  }, [tintas]);
  const tintasPorMarca = useMemo(() => groupTintasByMarca(tintas), [tintas]);

  const proveedorSelected = useMemo(() => {
    return (proveedores || []).find((p: any) => p.nombre === reabastecerMaterialForm.proveedor) || null;
  }, [proveedores, reabastecerMaterialForm.proveedor]);

  useEffect(() => {
    if (!proveedorSelected) return;
    setReabastecerMaterialForm(f => ({
      ...f,
      moneda: proveedorSelected.moneda_preferida || f.moneda,
      tasa_usd: proveedorSelected.politica_tasa === 'BCV' ? f.tasa_usd : f.tasa_usd,
      es_credito: Boolean(proveedorSelected.es_credito),
      estado_pago: proveedorSelected.es_credito ? 'pendiente' : f.estado_pago,
      nota: f.nota || '',
    }));
  }, [proveedorSelected]);

  const isLoading = activeTab === 'materiales' ? loadingMateriales : activeTab === 'tintas' ? loadingTintas : loadingMateriales;

  const bajaMateriales = materiales?.filter(m => m.stock <= 5 || m.largo_restante <= 10) || [];
  const bajaTintas = tintas?.filter(t =>
    (t.magenta_cantidad || 0) < (t.magenta_minimo || 0) ||
    (t.cian_cantidad || 0) < (t.cian_minimo || 0) ||
    (t.amarillo_cantidad || 0) < (t.amarillo_minimo || 0) ||
    (t.negro_cantidad || 0) < (t.negro_minimo || 0)
  ) || [];

  useEffect(() => {
    if (activeTab === 'kardex' && !kardexMaterialId && materiales?.length) {
      setKardexMaterialId(materiales[0].id);
    }
  }, [activeTab, kardexMaterialId, materiales]);

  useEffect(() => {
    if (!recipeFeaturesEnabled && activeTab === 'kardex') {
      setActiveTab('materiales');
    }
  }, [recipeFeaturesEnabled, activeTab]);

  const materialProjectionRows = useMemo(
    () => buildProjectedMaterialRows(pedidos, trabajos, recetasProductos, materiales),
    [pedidos, trabajos, recetasProductos, materiales]
  );

  const filteredKardexMaterials = (materiales || []).filter((m: any) =>
    !searchKardex || (m.tipo || '').toLowerCase().includes(searchKardex.toLowerCase())
  );

  const selectedKardexMaterial = materiales?.find((m: any) => m.id === kardexMaterialId) || null;
  const realMaterialMovements = (consumoMateriales || []).filter((row: any) =>
    !kardexMaterialId || row.material_id === kardexMaterialId
  );
  const purchasedMaterialMovements = (comprasMaterial || [])
    .filter((row: any) => !kardexMaterialId || row.material_id === kardexMaterialId)
    .map((row: any) => ({
      ...row,
      tipo: 'compra',
      fecha: row.fecha_compra || row.created_at,
      origen: 'Compra',
      cantidad: Number(row.cantidad) || 0,
      unidad: row.unidad || 'metros',
    }));
  const projectedMaterialMovements = materialProjectionRows.filter((row: any) =>
    !kardexMaterialId || row.material_id === kardexMaterialId
  );
  const kardexMaterialCurrentStock = Number(selectedKardexMaterial?.stock ?? selectedKardexMaterial?.largo_restante ?? selectedKardexMaterial?.cantidad_actual ?? 0);
  const kardexMaterialRealConsumed = realMaterialMovements.reduce((sum: number, row: any) => sum + (Number(row.cantidad_consumida) || 0), 0);
  const kardexMaterialPurchased = purchasedMaterialMovements.reduce((sum: number, row: any) => sum + (Number(row.cantidad) || 0), 0);
  const kardexMaterialProjected = projectedMaterialMovements.reduce((sum: number, row: any) => sum + (Number(row.consumo) || 0), 0);
  const kardexMaterialProjectedStock = kardexMaterialCurrentStock - kardexMaterialProjected;
  const kardexMaterialShortage = kardexMaterialProjectedStock < 0;

  const filteredComprasMaterial = (comprasMaterial || []).filter((row: any) => {
    const material = (materiales || []).find((m: any) => m.id === row.material_id);
    const materialName = (material?.tipo || material?.nombre || '').toLowerCase();
    const proveedor = String(row.proveedor || '').toLowerCase();
    const nota = String(row.nota || '').toLowerCase();
    const search = searchCompras.toLowerCase();
    const textMatch = !search || materialName.includes(search) || proveedor.includes(search) || nota.includes(search);
    const materialMatch = comprasMaterialFilter === 'all' || row.material_id === comprasMaterialFilter;
    const proveedorMatch = !comprasProveedorFilter || proveedor.includes(comprasProveedorFilter.toLowerCase());
    const estadoMatch = comprasEstadoFilter === 'all' || row.estado_pago === comprasEstadoFilter;
    return textMatch && materialMatch && proveedorMatch && estadoMatch;
  });
  const comprasCreditoCount = filteredComprasMaterial.filter((row: any) => row.es_credito).length;
  const comprasPagadasCount = filteredComprasMaterial.filter((row: any) => row.estado_pago === 'pagado').length;
  const comprasTotalUsd = filteredComprasMaterial.reduce((sum: number, row: any) => sum + (Number(row.precio_usd) || 0), 0);
  const comprasConsistenciaAlertas = useMemo(() => {
    return (comprasMaterial || []).flatMap((row: any) => {
      const material = (materiales || []).find((m: any) => m.id === row.material_id);
      const issues: string[] = [];
      if (!row.material_id || !material) issues.push('Material no encontrado');
      if (!(Number(row.cantidad) > 0)) issues.push('Cantidad inválida');
      if (!(Number(row.precio_usd) >= 0)) issues.push('Precio USD inválido');
      if (!row.moneda || !['USD', 'EUR', 'Binance', 'BS'].includes(row.moneda)) issues.push('Moneda fuera de catálogo');
      if (!row.estado_pago) issues.push('Estado de pago vacío');
      if (row.es_credito && row.estado_pago === 'pagado') issues.push('Crédito marcado como pagado');
      if (row.fecha_compra && Number.isNaN(new Date(row.fecha_compra).getTime())) issues.push('Fecha inválida');
      return issues.length > 0 ? [{
        id: row.id,
        material: material?.tipo || material?.nombre || 'Material',
        proveedor: row.proveedor || 'Sin proveedor',
        issues,
      }] : [];
    });
  }, [comprasMaterial, materiales]);

  const tintaMovements = (consumoTintas || []).map((row: any) => {
    const tinta = (tintas || []).find((t: any) => t.id === row.tinta_id);
    return {
      ...row,
      tinta_nombre: tinta?.nombre || 'Tinta',
      total_cc: ['magenta_consumida', 'cian_consumida', 'amarillo_consumida', 'negro_consumida']
        .reduce((sum, key) => sum + (Number(row[key]) || 0), 0),
    };
  });

  // Material drawer functions
  function resetReabastecerMaterialForm() {
    setReabastecerMaterialId(null);
    setEditingCompraMaterial(null);
    setMetrosAgregar('');
    setReabastecerMaterialForm({
      proveedor: '',
      moneda: 'USD',
      tasa_usd: '1',
      es_credito: false,
      estado_pago: 'pagado',
      nota: '',
    });
  }

  function openNewCompraMaterialDrawer() {
    setEditingCompraMaterial(null);
    setReabastecerMaterialId(materiales?.[0]?.id ?? null);
    setMetrosAgregar('');
    setReabastecerMaterialForm({
      proveedor: '',
      moneda: 'USD',
      tasa_usd: '1',
      es_credito: false,
      estado_pago: 'pagado',
      nota: '',
    });
  }

  function openEditCompraMaterialDrawer(compra: any) {
    setEditingCompraMaterial(compra);
    setReabastecerMaterialId(compra.material_id || null);
    setMetrosAgregar(String(compra.cantidad || ''));
    setReabastecerMaterialForm({
      proveedor: compra.proveedor || '',
      moneda: compra.moneda || 'USD',
      tasa_usd: String(compra.tasa_usd || '1'),
      es_credito: Boolean(compra.es_credito),
      estado_pago: compra.estado_pago || 'pagado',
      nota: compra.nota || '',
    });
  }

  async function handleReabastecerMaterial() {
    if (!reabastecerMaterialId || !metrosAgregar) return;
    const material = materiales?.find((m: any) => m.id === reabastecerMaterialId);
    if (!material) return;

    const cantidadAgregar = Number(metrosAgregar);
    if (!Number.isFinite(cantidadAgregar) || cantidadAgregar <= 0) return;
    const tasaUsd = Number(reabastecerMaterialForm.tasa_usd || 1) || 1;
    const precioBase = Number(material.precio_m2 || 0) * cantidadAgregar;
    const totalMoneda = reabastecerMaterialForm.moneda === 'USD' ? precioBase : precioBase * tasaUsd;
    const totalUsd = reabastecerMaterialForm.moneda === 'USD' ? precioBase : (precioBase / tasaUsd);
    const fechaCompra = new Date().toISOString().split('T')[0];

    const purchasePayload = {
      material_id: reabastecerMaterialId,
      cantidad: cantidadAgregar,
      unidad: material?.unidad_medida || 'unidad',
      moneda: reabastecerMaterialForm.moneda,
      precio_moneda: totalMoneda,
      tasa_usd: tasaUsd,
      precio_usd: totalUsd,
      proveedor: reabastecerMaterialForm.proveedor || null,
      es_credito: reabastecerMaterialForm.es_credito,
      estado_pago: reabastecerMaterialForm.estado_pago,
      fecha_compra: fechaCompra,
      fecha_pago: reabastecerMaterialForm.es_credito ? null : fechaCompra,
      nota: reabastecerMaterialForm.nota || 'Reabastecimiento registrado desde Inventario',
    };

    if (editingCompraMaterial) {
      const oldQty = Number(editingCompraMaterial.cantidad || 0);
      const oldMaterialId = editingCompraMaterial.material_id;
      const oldMaterial = materiales?.find((m: any) => m.id === oldMaterialId);
      const nextMaterial = materiales?.find((m: any) => m.id === reabastecerMaterialId);

      await updateCompraMaterial.mutateAsync({ id: editingCompraMaterial.id, ...purchasePayload });

      if (oldMaterialId === reabastecerMaterialId) {
        const delta = cantidadAgregar - oldQty;
        if (delta !== 0 && oldMaterial) {
          await updateMaterial.mutateAsync({
            id: reabastecerMaterialId,
            largo_restante: Number(oldMaterial.largo_restante) + delta,
            stock: Number(oldMaterial.stock),
          });
        }
      } else {
        if (oldMaterial) {
          await updateMaterial.mutateAsync({
            id: oldMaterialId,
            largo_restante: Number(oldMaterial.largo_restante) - oldQty,
            stock: Math.max(0, Number(oldMaterial.stock) - 1),
          });
        }
        if (nextMaterial) {
          await updateMaterial.mutateAsync({
            id: reabastecerMaterialId,
            largo_restante: Number(nextMaterial.largo_restante) + cantidadAgregar,
            stock: Number(nextMaterial.stock) + 1,
          });
        }
      }
      const targetCash = (!reabastecerMaterialForm.es_credito && reabastecerMaterialForm.estado_pago === 'pagado')
        ? totalUsd
        : 0;
      await reconcileCompraCaja({ ...editingCompraMaterial, ...purchasePayload }, targetCash);
    } else {
      const createdCompra = await createCompraMaterial.mutateAsync(purchasePayload);
      await updateMaterial.mutateAsync({
        id: reabastecerMaterialId,
        largo_restante: Number(material.largo_restante) + cantidadAgregar,
        stock: Number(material.stock) + 1,
      });
      if (!reabastecerMaterialForm.es_credito && reabastecerMaterialForm.estado_pago === 'pagado') {
        await createMovimientoCaja.mutateAsync({
          tipo: 'egreso',
          concepto: `Pago compra material ${reabastecerMaterialId.slice(0, 8).toUpperCase()}`,
          monto: totalUsd,
          categoria: 'compras',
          fecha: fechaCompra,
          notas: `origen=compra_material|compra_id=${createdCompra.id}|material_id=${reabastecerMaterialId}|proveedor=${reabastecerMaterialForm.proveedor || ''}`,
        });
      }
    }

    resetReabastecerMaterialForm();
  }

  async function reconcileCompraCaja(compra: any, targetAmount: number) {
    const currentAmount = getCajaContributionForCompra(movimientosCaja || [], compra);
    const delta = Number((targetAmount - currentAmount).toFixed(2));
    if (Math.abs(delta) < 0.01) return;
    await createMovimientoCaja.mutateAsync({
      tipo: delta > 0 ? 'egreso' : 'ingreso',
      concepto: delta > 0
        ? `Pago compra material ${String(compra.id || '').slice(0, 8).toUpperCase()}`
        : `Reverso compra material ${String(compra.id || '').slice(0, 8).toUpperCase()}`,
      monto: Math.abs(delta),
      categoria: 'compras',
      fecha: compra.fecha_compra || new Date().toISOString().split('T')[0],
      notas: `origen=compra_material|compra_id=${compra.id}|material_id=${compra.material_id || ''}|proveedor=${compra.proveedor || ''}|ajuste=${delta > 0 ? 'saldo' : 'reversion'}`,
    });
  }

  function openNewMaterialDrawer() {
    setEditingMaterial(null);
    setMaterialForm({
      tipo: '',
      unidad_medida: 'caja',
      ancho: '24',
      largo_original: '',
      largo_restante: '6',
      stock: '',
      nota: '',
      precio_m2: '',
    });
    setMaterialDrawerOpen(true);
  }
  function openEditSolicitud(sol: any) {
    const matchedMat = (materiales || []).find(
      (m: any) => String(m.tipo || '').toLowerCase() === String(sol.item_nombre || '').toLowerCase()
    );
    if (matchedMat) {
      openEditMat(matchedMat);
      return;
    }
    const meta = parseSolicitudInventarioMeta(sol?.nota) || {};
    setEditingMaterial(sol);
    setMaterialForm({
      tipo: sol.item_nombre || '',
      unidad_medida: String(meta.presentacion || sol.unidad || 'caja'),
      ancho: String(meta.unidades_por_presentacion || '1'),
      largo_original: String(meta.unidades_a_solicitar || sol.cantidad_solicitada || ''),
      largo_restante: String(meta.stock_minimo || '0'),
      stock: '',
      nota: String(meta.observacion || sol.notas || ''),
      precio_m2: '',
    });
    setMaterialDrawerOpen(true);
  }
  async function handleDeleteSolicitud(sol: any) {
    const nombre = sol.item_nombre || sol.tipo || 'este material';
    if (!window.confirm(`¿Eliminar la solicitud de "${nombre}"?`)) return;
    try {
      await deleteSolicitud.mutateAsync(sol.id);
    } catch (err: any) {
      alert(`Error al eliminar: ${err?.message || err}`);
    }
  }
  function openReorderSolicitud(solicitud: any) {
    const meta = parseSolicitudInventarioMeta(solicitud?.nota) || {};
    setEditingMaterial(null);
    setSolicitudForm({
      tipo_item: getSolicitudTipoItem(solicitud),
      item_id: solicitud?.item_id || '',
      item_nombre: solicitud?.item_nombre || solicitud?.tipo || '',
      cantidad_solicitada: String(meta?.unidades_a_solicitar || meta?.cantidad_solicitada || solicitud?.cantidad_solicitada || ''),
      unidad: String(meta?.unidad_base || solicitud?.unidad || 'm'),
      prioridad: String(solicitud?.prioridad || 'normal'),
      nota: String(meta?.observacion || solicitud?.notas || ''),
      tinta_marca: String(meta?.marca || 'Mimaki BS4'),
      tinta_color: String(meta?.color || 'magenta'),
      tinta_presentacion: String(meta?.presentacion || 'bolsa'),
      tinta_ml_presentacion: String(meta?.unidades_por_presentacion || '2000'),
      tinta_presentaciones: String(meta?.presentaciones_solicitadas || '1'),
    });
    setSolicitudDrawerOpen(true);
  }
  function closeMaterialDrawer() {
    setMaterialDrawerOpen(false);
    setEditingMaterial(null);
  }

  async function handleSaveMaterial() {
    const presentacion = materialForm.unidad_medida;
    const unidadesPorPresentacion = Number(materialForm.ancho) || 1;
    const unidadesSolicitadas = Number(materialForm.largo_original) || 0;
    const stockMinimo = Number(materialForm.largo_restante) || 0;
    const cajasNecesarias = Math.max(1, Math.ceil(unidadesSolicitadas / unidadesPorPresentacion));
    const payload = {
      solicitante: 'Sistema',
      tipo_item: 'material',
      item_nombre: materialForm.tipo,
      cantidad_solicitada: unidadesSolicitadas,
      prioridad: 'normal',
      notas: materialForm.nota || '',
      nota: serializeSolicitudInventarioMeta({
        presentacion,
        unidades_por_presentacion: unidadesPorPresentacion,
        unidades_a_solicitar: unidadesSolicitadas,
        stock_minimo: stockMinimo,
        observacion: materialForm.nota || '',
        cajas_necesarias: cajasNecesarias,
        estado_operativo: 'pendiente',
      }),
      estado: 'pendiente',
    };

    if (!materialForm.tipo || !unidadesSolicitadas || !unidadesPorPresentacion) {
      alert('Completa nombre, presentación y unidades a solicitar');
      return;
    }

    try {
      if (editingMaterial) {
        await updateSolicitud.mutateAsync({ id: editingMaterial.id, ...payload });
      } else {
        await createSolicitud.mutateAsync(payload);
      }
      closeMaterialDrawer();
    } catch (error) {
      console.error('Error al guardar solicitud de material:', error);
      alert('No se pudo guardar la solicitud. Revisa la tabla solicitudes_compra en Supabase.');
    }
  }

  async function handleSolicitudStageChange(solicitud: any, nextEstado: string) {
    if (!solicitud || !nextEstado) return;
    const currentIndex = getSolicitudEstadoIndex(solicitud.estado);
    const nextIndex = getSolicitudEstadoIndex(nextEstado);
    if (nextIndex < currentIndex) return;

    const meta = parseSolicitudInventarioMeta(solicitud.nota);
    const normalizedNext = normalizeSolicitudEstado(nextEstado);

    try {
      await updateSolicitud.mutateAsync({
        id: solicitud.id,
        estado: normalizedNext,
        nota: serializeSolicitudInventarioMeta({
          ...meta,
          estado_operativo: normalizedNext,
        }),
      });
    } catch (error) {
      console.error('Error actualizando etapa de solicitud:', error);
      alert('No se pudo actualizar la etapa. Revisa las restricciones de solicitudes_compra en Supabase.');
      return;
    }

    if (nextEstado !== 'recibida') return;

    const tipoItem = getSolicitudTipoItem(solicitud);
    const ordenAsociada = (ordenesCompra || []).find((o: any) => o.solicitud_id === solicitud.id);

    // Intentar obtener el proveedor desde la orden de compra asociada a la solicitud
    const proveedorMaterial = ordenAsociada?.proveedor_nombre || '';

    // Normalizar precio siempre a USD
    const rawPrecio = ordenAsociada?.precio_unitario || 0;
    const monedaOrden = String(ordenAsociada?.moneda || 'USD').toUpperCase();
    const tasaOrden = parseFloat(ordenAsociada?.tasa_cambio) || 1;
    const precioOrden = monedaOrden === 'USD' ? rawPrecio
      : monedaOrden === 'BS' && tasaOrden > 0 ? rawPrecio / tasaOrden
      : rawPrecio;

    if (tipoItem === 'tinta') {
      const tintaMeta = getSolicitudTintaMeta(solicitud);
      const colorField = TINTA_COLOR_FIELD_MAP[tintaMeta.color] || null;
      const totalMl = Math.max(0, tintaMeta.totalMl || (tintaMeta.mlPresentacion * tintaMeta.presentaciones));

      if (!colorField || totalMl <= 0) {
        alert('La solicitud de tinta no tiene color o cantidad válida para recibir.');
        return;
      }

      const existingTinta = (tintas || []).find((t: any) =>
        normalizeMaterialKey(t.marca || t.nombre) === normalizeMaterialKey(tintaMeta.marca)
      );

      const currentTotals = {
        magenta_cantidad: Number(existingTinta?.magenta_cantidad || 0),
        cian_cantidad: Number(existingTinta?.cian_cantidad || 0),
        amarillo_cantidad: Number(existingTinta?.amarillo_cantidad || 0),
        negro_cantidad: Number(existingTinta?.negro_cantidad || 0),
      };
      const currentMinimos = {
        magenta_minimo: Number(existingTinta?.magenta_minimo || 1) || 1,
        cian_minimo: Number(existingTinta?.cian_minimo || 1) || 1,
        amarillo_minimo: Number(existingTinta?.amarillo_minimo || 1) || 1,
        negro_minimo: Number(existingTinta?.negro_minimo || 1) || 1,
      };

      const nextTotals = {
        ...currentTotals,
        [colorField]: Number(currentTotals[colorField] || 0) + totalMl,
      };
      const nextCantidad = Object.values(nextTotals).reduce((sum, value) => sum + Number(value || 0), 0);
      const nextMinimo = Object.values(currentMinimos).reduce((sum, value) => sum + Number(value || 0), 0);

      const tintaPayload = {
        nombre: existingTinta?.nombre || tintaMeta.marca,
        marca: tintaMeta.marca,
        maquina: existingTinta?.maquina || tintaMeta.marca,
        unidad: 'ml',
        cantidad: nextCantidad,
        minimo: nextMinimo,
        porcentaje: 100,
        ...nextTotals,
        ...currentMinimos,
      };

      if (existingTinta?.id) {
        await updateTinta.mutateAsync({ id: existingTinta.id, updates: tintaPayload });
      } else {
        await createTinta.mutateAsync(tintaPayload);
      }
      return;
    }

    const materialTipo = solicitud.item_nombre || 'Material';
    const presentacion = meta?.presentacion || solicitud.unidad || 'unidad';
    const unidadesPorPresentacion = Number(meta?.unidades_por_presentacion || 1) || 1;
    const unidadesSolicitadas = Number(meta?.unidades_a_solicitar || 0) || 0;
    const stockObjetivo = Math.max(unidadesSolicitadas, 0);
    const existing = (materiales || []).find((m: any) =>
      String(m.tipo || '').toLowerCase() === String(materialTipo).toLowerCase() &&
      String(m.unidad_medida || '').toLowerCase() === String(presentacion).toLowerCase()
    );
    const isM2Material = presentacion === 'm2';
    const materialData = {
      tipo: materialTipo,
      unidad_medida: presentacion,
      ancho: unidadesPorPresentacion,
      largo_original: stockObjetivo,
      largo_restante: stockObjetivo,
      stock: stockObjetivo,
      precio_m2: isM2Material ? precioOrden : 0,
      precio_unitario: !isM2Material ? precioOrden : 0,
      proveedor: proveedorMaterial,
    };

    if (existing) {
      await updateMaterial.mutateAsync({
        id: existing.id,
        updates: {
          ...materialData,
          stock: Number(existing.stock || 0) + stockObjetivo,
          largo_restante: Number(existing.largo_restante || 0) + stockObjetivo,
        },
      });
    } else {
      await createMaterial.mutateAsync(materialData);
    }
  }

  async function handleDeleteCompraMaterial(compra: any) {
    const confirmed = window.confirm('¿Eliminar esta compra y revertir su impacto en inventario?');
    if (!confirmed) return;
    const material = materiales?.find((m: any) => m.id === compra.material_id);
    if (material) {
      await updateMaterial.mutateAsync({
        id: material.id,
        largo_restante: Number(material.largo_restante) - Number(compra.cantidad || 0),
        stock: Math.max(0, Number(material.stock) - 1),
      });
    }
    await deleteCompraMaterial.mutateAsync(compra.id);
  }

  // Reabastecer tinta
  async function handleSolicitar() {
    const isTinta = solicitudForm.tipo_item === 'tinta';
    const cantidadSolicitada = Number(solicitudForm.cantidad_solicitada) || 0;
    if (isTinta) {
      const mlPorPresentacion = Number(solicitudForm.tinta_ml_presentacion) || 0;
      const presentaciones = Number(solicitudForm.tinta_presentaciones) || 0;
      if (!(mlPorPresentacion > 0) || !(presentaciones > 0)) {
        alert('Ingresa la presentación y la cantidad de presentaciones para la tinta');
        return;
      }
    } else if (!(cantidadSolicitada > 0)) {
      alert('Ingresa la cantidad solicitada');
      return;
    }

    const mlPorPresentacion = isTinta ? Number(solicitudForm.tinta_ml_presentacion) || 0 : 0;
    const presentaciones = isTinta ? Number(solicitudForm.tinta_presentaciones) || 0 : 0;
    const totalTintaMl = isTinta ? mlPorPresentacion * presentaciones : cantidadSolicitada;
    const tintaMarca = isTinta ? solicitudForm.tinta_marca : '';
    const tintaColor = isTinta ? solicitudForm.tinta_color : '';
    const tintaPresentacion = isTinta ? solicitudForm.tinta_presentacion : '';
    try {
      await createSolicitud.mutateAsync({
        solicitante: 'Sistema',
        item_id: solicitudForm.item_id || null,
        item_nombre: isTinta
          ? `Tinta ${tintaMarca}${tintaColor ? ` ${tintaColor}` : ''}${tintaPresentacion ? ` en ${tintaPresentacion}` : ''}`
          : solicitudForm.item_nombre,
        cantidad_solicitada: isTinta ? totalTintaMl : cantidadSolicitada,
        notas: solicitudForm.nota || '',
        nota: serializeSolicitudInventarioMeta(isTinta ? {
          tipo: 'tinta',
          marca: tintaMarca,
          color: tintaColor,
          presentacion: tintaPresentacion,
          unidades_por_presentacion: mlPorPresentacion,
          presentaciones_solicitadas: presentaciones,
          cantidad_solicitada: totalTintaMl,
          observacion: solicitudForm.nota || '',
          unidad_base: 'ml',
        } : {
          tipo: 'material',
          unidades_a_solicitar: cantidadSolicitada,
          unidad_base: solicitudForm.unidad,
          prioridad: solicitudForm.prioridad || 'normal',
          observacion: solicitudForm.nota || '',
        }),
        estado: 'pendiente',
      });
      setSolicitudDrawerOpen(false);
      alert('Solicitud creada correctamente');
    } catch {
      alert('Error al crear la solicitud. Revisa la estructura de solicitudes_compra en Supabase.');
    }
  }

  async function handleReabastecerTinta() {
    if (!reabastecerTintaId) return;
    const tinta = tintas?.find((t: any) => t.id === reabastecerTintaId);
    if (!tinta) return;
    await updateTinta.mutateAsync({
      id: reabastecerTintaId,
      magenta_cantidad: Number(tinta.magenta_cantidad) + Number(tintaAgregar.magenta || 0),
      cian_cantidad: Number(tinta.cian_cantidad) + Number(tintaAgregar.cian || 0),
      amarillo_cantidad: Number(tinta.amarillo_cantidad) + Number(tintaAgregar.amarillo || 0),
      negro_cantidad: Number(tinta.negro_cantidad) + Number(tintaAgregar.negro || 0),
    });
    setReabastecerTintaId(null);
    setTintaAgregar({ magenta: '', cian: '', amarillo: '', negro: '' });
  }

  async function handleSaveTinta() {
    if (!tintaForm.nombre.trim()) {
      alert('El nombre de la tinta es obligatorio');
      return;
    }
    const mag = Number(tintaForm.magenta_cantidad) || 0;
    const cia = Number(tintaForm.cian_cantidad) || 0;
    const ama = Number(tintaForm.amarillo_cantidad) || 0;
    const neg = Number(tintaForm.negro_cantidad) || 0;
    const payload = {
      nombre: tintaForm.nombre.trim(),
      marca: tintaForm.marca.trim() || null,
      maquina: tintaForm.marca.trim() || tintaForm.nombre.trim(),
      unidad: 'ml',
      cantidad: mag + cia + ama + neg,
      minimo: (Number(tintaForm.magenta_minimo) || 0) + (Number(tintaForm.cian_minimo) || 0) + (Number(tintaForm.amarillo_minimo) || 0) + (Number(tintaForm.negro_minimo) || 0),
      porcentaje: 100,
      magenta_cantidad: mag,
      cian_cantidad: cia,
      amarillo_cantidad: ama,
      negro_cantidad: neg,
      magenta_minimo: Number(tintaForm.magenta_minimo) || 0,
      cian_minimo: Number(tintaForm.cian_minimo) || 0,
      amarillo_minimo: Number(tintaForm.amarillo_minimo) || 0,
      negro_minimo: Number(tintaForm.negro_minimo) || 0,
    };

    try {
      if (editingTinta?.id) {
        await updateTinta.mutateAsync({ id: editingTinta.id, ...payload });
      } else {
        await createTinta.mutateAsync(payload);
      }
      setTintaDrawerOpen(false);
      setEditingTinta(null);
    } catch {
      alert('Error al guardar la tinta');
    }
  }

  const materialReab = materiales?.find(m => m.id === reabastecerMaterialId);
  const solicitudesMaterial = (solicitudes || []).filter((s: any) => !String(s.item_nombre || '').toLowerCase().includes('tinta'));
  const solicitudesMaterialDefaults = useMemo(() => {
    const map = new Map<string, { presentacion: string; unidadesPorPresentacion: number; stockMinimo: number; observacion: string }>();
    for (const s of solicitudesMaterial) {
      const meta = parseSolicitudInventarioMeta(s.nota);
      const key = normalizeMaterialKey(s.item_nombre);
      if (!key || map.has(key) || !meta?.presentacion) continue;
      map.set(key, {
        presentacion: String(meta.presentacion || s.unidad || 'caja'),
        unidadesPorPresentacion: Number(meta.unidades_por_presentacion || 1) || 1,
        stockMinimo: Number(meta.stock_minimo || 0) || 0,
        observacion: String(meta.observacion || ''),
      });
    }
    return map;
  }, [solicitudesMaterial]);
  const filteredSolicitudesMaterial = solicitudesMaterial.filter((s: any) => {
    const meta = parseSolicitudInventarioMeta(s.nota);
    const text = `${s.item_nombre || ''} ${s.unidad || ''} ${meta?.presentacion || ''} ${s.nota || ''}`.toLowerCase();
    return !searchMateriales || text.includes(searchMateriales.toLowerCase());
  });

  useEffect(() => {
    if (editingMaterial) return;
    const key = normalizeMaterialKey(materialForm.tipo);
    const defaults = solicitudesMaterialDefaults.get(key);
    if (!defaults) return;
    setMaterialForm(prev => {
      if (
        prev.unidad_medida === defaults.presentacion &&
        String(prev.ancho || '') === String(defaults.unidadesPorPresentacion || '') &&
        String(prev.largo_restante || '') === String(defaults.stockMinimo || '')
      ) {
        return prev;
      }
      return {
        ...prev,
        unidad_medida: defaults.presentacion || prev.unidad_medida,
        ancho: defaults.unidadesPorPresentacion ? String(defaults.unidadesPorPresentacion) : prev.ancho,
        largo_restante: defaults.stockMinimo ? String(defaults.stockMinimo) : prev.largo_restante,
        nota: defaults.observacion || prev.nota,
      };
    });
  }, [editingMaterial, materialForm.tipo, solicitudesMaterialDefaults]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* 1. PageHeader */}
        <PageHeader
          title="Inventario"
          description="Control de materiales y tintas"
          icon="warehouse"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild variant="default" size="default" className="gap-2">
                <NavLink to="/calcular-madera">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>straighten</span>
                  Calcular madera
                </NavLink>
              </Button>
              {activeTab === 'materiales' ? (
                <button onClick={openNewMaterialDrawer} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', backgroundColor: '#2563eb', border: 'none',
                  borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  Solicitar Material
                </button>
              ) : undefined}
            </div>
          }
        />

        {/* 2. Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Materiales', value: materiales?.length || 0, icon: 'texture', color: '#b4c5ff' },
            { label: 'Stock Bajo', value: bajaMateriales.length, icon: 'warning', color: bajaMateriales.length > 0 ? '#ffb95f' : '#b4c5ff' },
            { label: 'Sets Tinta', value: tintas?.length || 0, icon: 'palette', color: '#b4c5ff' },
            { label: 'Tintas Bajas', value: bajaTintas.length, icon: 'colorize', color: bajaTintas.length > 0 ? '#EF4444' : '#b4c5ff' },
          ].map(stat => (
            <div key={stat.label} style={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.25rem',
              padding: '1rem',
            }}>
              <p style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem',
              }}>
                {stat.label}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: stat.color }}>{stat.icon}</span>
                <p style={{
                  fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700,
                  letterSpacing: '-0.01em', color: stat.color, margin: 0,
                }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Búsqueda + Segmented Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {activeTab === 'materiales' && (
            <div className="relative" style={{ flex: 1, maxWidth: '400px' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>search</span>
              <Input className="pl-10" placeholder="Buscar por tipo de material..." value={searchMateriales} onChange={e => setSearchMateriales(e.target.value)} />
            </div>
          )}
          <div style={{
            display: 'inline-flex', padding: '0.25rem',
            backgroundColor: '#131b2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.375rem', gap: '0.25rem',
          }}>
            {(['materiales', 'tintas'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '0.375rem 1.25rem',
                backgroundColor: activeTab === tab ? '#b4c5ff' : 'transparent',
                color: activeTab === tab ? '#002a78' : '#94A3B8',
                border: 'none', borderRadius: '0.25rem',
                fontWeight: activeTab === tab ? 700 : 500,
                fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                {tab === 'materiales' ? 'Materiales' : 'Tintas CMYK'}
              </button>
            ))}
            {recipeFeaturesEnabled && (
              <button
                onClick={() => setActiveTab('kardex')}
                style={{
                  padding: '0.375rem 1.25rem',
                  backgroundColor: activeTab === 'kardex' ? '#b4c5ff' : 'transparent',
                  color: activeTab === 'kardex' ? '#002a78' : '#94A3B8',
                  border: 'none', borderRadius: '0.25rem',
                  fontWeight: activeTab === 'kardex' ? 700 : 500,
                  fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Kardex
              </button>
            )}
          </div>
        </div>

        {/* 4. Solicitudes de Material */}
        {activeTab === 'materiales' && (
          <div style={{
            backgroundColor: '#1E293B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.25rem',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Solicitudes de material</p>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', color: '#F8FAFC' }}>Pedir, aprobar y recibir</h3>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#94A3B8' }}>
                {filteredSolicitudesMaterial.length} solicitud{filteredSolicitudesMaterial.length === 1 ? '' : 'es'}
              </div>
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredSolicitudesMaterial.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94A3B8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>inventory_2</span>
                  {searchMateriales ? 'No se encontraron solicitudes' : 'No hay solicitudes de material'}
                </div>
              ) : (
                filteredSolicitudesMaterial.map((sol: any) => {
                  const meta = parseSolicitudInventarioMeta(sol.nota) || {};
                  const presentacion = String(meta.presentacion || sol.unidad || 'unidad');
                  const unidadesPorPresentacion = Number(meta.unidades_por_presentacion || 1) || 1;
                  const unidadesSolicitadas = Number(meta.unidades_a_solicitar || 0) || 0;
                  const stockMinimo = Number(meta.stock_minimo || 0) || 0;
                  const presentacionesNecesarias = Number(meta.cajas_necesarias || Math.max(1, Math.ceil(unidadesSolicitadas / unidadesPorPresentacion))) || 1;
                  const presentacionPlural = getPresentationPlural(presentacion);
                  const linkedOrden = (ordenesCompra || []).find((o: any) => o.solicitud_id === sol.id);
                  const effectiveEstado = (() => {
                    const dbEstado = normalizeSolicitudEstado(sol.estado);
                    if (dbEstado === 'recibida' || dbEstado === 'rechazada') return dbEstado;
                    if (linkedOrden?.estado === 'recibida') return 'recibida';
                    if (linkedOrden?.estado === 'emitida') return 'en_camino';
                    return dbEstado !== 'pendiente' ? dbEstado : (meta.estado_operativo || sol.estado || 'pendiente');
                  })();
                  const stageState = normalizeSolicitudEstado(effectiveEstado);
                  const stageIndex = getSolicitudEstadoIndex(stageState);
                  const isRejected = sol.estado === 'rechazada';
                  const stageButtons = [
                    { key: 'aprobada', icon: 'task_alt', label: 'Aprobada', color: '#10B981', clickable: false },
                    { key: 'en_camino', icon: 'local_shipping', label: 'En camino', color: '#3B82F6', clickable: false },
                    { key: 'recibida', icon: 'inventory_2', label: 'Recibido', color: '#b4c5ff', clickable: true },
                  ] as const;

                  return (
                    <div key={sol.id} style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.375rem', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,197,255,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '18px' }}>inventory_2</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>{sol.item_nombre || 'Material'}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                          Presentación: {presentacion} · {unidadesPorPresentacion} por {presentacion} · mínimo: {stockMinimo} unidades
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {unidadesSolicitadas} unidades solicitadas · {presentacionesNecesarias} {presentacionPlural} necesarias
                        </div>
                        {meta.observacion && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontStyle: 'italic' }}>
                            {meta.observacion}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'rgba(180,197,255,0.1)', color: '#b4c5ff' }}>
                          {stageState || 'pendiente'}
                        </span>
                        {stageButtons.map((stage, index) => {
                          const active = stageIndex >= index + 1;
                          const disabled = isRejected || (stage.key === 'recibida' && stageIndex < 2);
                          const commonStyle = {
                            width: '2.2rem',
                            height: '2.2rem',
                            borderRadius: '0.35rem',
                            border: `1px solid ${active ? `${stage.color}55` : 'rgba(255,255,255,0.08)'}`,
                            backgroundColor: active ? `${stage.color}18` : 'transparent',
                            color: active ? stage.color : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: disabled ? 0.35 : 1,
                          } as const;

                          if (!stage.clickable) {
                            return (
                              <span
                                key={stage.key}
                                title={stage.label}
                                aria-label={stage.label}
                                style={{
                                  width: '2.2rem',
                                  height: '2.2rem',
                                  borderRadius: '0.35rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: active ? stage.color : '#3a4560',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'default',
                                  opacity: disabled ? 0.35 : 1,
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{stage.icon}</span>
                              </span>
                            );
                          }

                          return (
                            <button
                              key={stage.key}
                              onClick={() => handleSolicitudStageChange(sol, stage.key)}
                              disabled={disabled}
                              title={stage.label}
                              aria-label={stage.label}
                              style={{
                                ...commonStyle,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{stage.icon}</span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => openReorderSolicitud(sol)}
                          title="Solicitar de nuevo"
                          style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.35rem', border: '1px solid rgba(255,185,95,0.25)', backgroundColor: 'rgba(255,185,95,0.08)', color: '#ffb95f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_shopping_cart</span>
                        </button>
                        <button
                          onClick={() => openEditSolicitud(sol)}
                          title="Editar solicitud"
                          style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.35rem', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSolicitud(sol)}
                          title="Eliminar solicitud"
                          style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.35rem', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Edit material record drawer */}
        {editMatDrawer && <div onClick={() => setEditMatDrawer(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />}
        <aside style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: '400px', backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 70, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', transform: editMatDrawer ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
          <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4edea3', backgroundColor: 'rgba(78,222,163,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>Editar Material</span>
              <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>{editMatDrawer?.tipo || '—'}</h3>
            </div>
            <button onClick={() => setEditMatDrawer(null)} className="material-symbols-outlined" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '22px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>close</button>
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Nombre</label>
              <Input value={editMatForm.tipo} onChange={e => setEditMatForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ej: Bisagras 3 pulgadas" />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Unidad de medida</label>
              <select value={editMatForm.unidad_medida} onChange={e => setEditMatForm(f => ({ ...f, unidad_medida: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', backgroundColor: '#171f33', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.25rem', color: '#F8FAFC', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none', height: '2.5rem' }}>
                <option value="m2">m² (metro cuadrado)</option>
                <option value="unidad">Unidad / Pieza</option>
                <option value="ml">ml (mililitros)</option>
                <option value="litro">Litro</option>
                <option value="metro">Metro lineal</option>
                <option value="kg">Kg (kilogramo)</option>
                <option value="caja">Caja</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                {editMatForm.unidad_medida === 'm2' ? 'Precio por m²' : `Precio por ${editMatForm.unidad_medida}`}
              </label>
              <Input
                type="number" step="0.01" min="0"
                value={editMatForm.unidad_medida === 'm2' ? editMatForm.precio_m2 : editMatForm.precio_unitario}
                onChange={e => editMatForm.unidad_medida === 'm2'
                  ? setEditMatForm(f => ({ ...f, precio_m2: e.target.value }))
                  : setEditMatForm(f => ({ ...f, precio_unitario: e.target.value }))}
                placeholder="0.00"
              />
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                {editMatForm.unidad_medida === 'm2' ? 'Usado para calcular costo en productos por m².' : 'Precio por cada unidad individual.'}
              </p>
            </div>
          </div>
          <footer style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flexShrink: 0 }}>
            <button onClick={() => setEditMatDrawer(null)} style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSaveMat} disabled={updateMaterial.isPending} style={{ padding: '0.75rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: updateMaterial.isPending ? 0.7 : 1 }}>
              {updateMaterial.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </footer>
        </aside>

        {/* 5. Solicitudes de Tinta */}
        {activeTab === 'tintas' && (
          <div className="space-y-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '20px', color: '#F8FAFC', margin: 0 }}>Solicitudes de tinta</h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0.35rem 0 0' }}>
                  Pide tinta por color y presentación. Finanzas la aprobará como compra por ml.
                </p>
              </div>
              <button
                onClick={() => {
                  setSolicitudForm({
                    tipo_item: 'tinta',
                    item_id: '',
                    item_nombre: 'Tinta',
                    cantidad_solicitada: '',
                    unidad: 'ml',
                    prioridad: 'normal',
                    nota: '',
                    tinta_marca: 'Mimaki BS4',
                    tinta_color: 'magenta',
                    tinta_presentacion: 'bolsa',
                    tinta_ml_presentacion: '2000',
                    tinta_presentaciones: '1',
                  });
                  setSolicitudDrawerOpen(true);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', backgroundColor: '#b4c5ff', border: 'none',
                  borderRadius: '0.25rem', color: '#00203a', fontWeight: 700,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Solicitar tinta
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tintas registradas</div>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '28px', fontWeight: 700, color: '#b4c5ff', marginTop: '6px' }}>{tintaLowSummary.total}</div>
              </div>
              <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tintas con alerta</div>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '28px', fontWeight: 700, color: tintaLowSummary.low > 0 ? '#ffb95f' : '#4edea3', marginTop: '6px' }}>{tintaLowSummary.low}</div>
              </div>
              <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acción principal</div>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '18px', fontWeight: 700, color: '#F8FAFC', marginTop: '6px' }}>Solicitar por marca, color y ml</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px', lineHeight: 1.5 }}>Selecciona marca, color, presentación y cantidad. No necesitas editar tintas por canal.</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventario de tintas</div>
                  <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>Agrupado por marca</div>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {tintas?.length || 0} set{(tintas?.length || 0) === 1 ? '' : 's'}
                </div>
              </div>
              {Object.keys(tintasPorMarca).length === 0 ? (
                <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#131b2e', color: '#94A3B8', fontSize: '12px' }}>
                  Todavía no hay tintas recibidas. Cuando una solicitud pase a recibida, aparecerá aquí.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {Object.entries(tintasPorMarca).map(([marca, tintasMarca]) => (
                    <div key={marca} style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>{marca}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            {tintasMarca.length} set{tintasMarca.length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#b4c5ff', backgroundColor: 'rgba(180,197,255,0.1)', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '999px', padding: '2px 8px' }}>
                          Tinta
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tintasMarca.map((tinta: any) => {
                          const colorRows = [
                            { label: 'Magenta', cant: Number(tinta.magenta_cantidad || 0), min: Number(tinta.magenta_minimo || 0), color: '#e879f9' },
                            { label: 'Cian', cant: Number(tinta.cian_cantidad || 0), min: Number(tinta.cian_minimo || 0), color: '#22d3ee' },
                            { label: 'Amarillo', cant: Number(tinta.amarillo_cantidad || 0), min: Number(tinta.amarillo_minimo || 0), color: '#fde047' },
                            { label: 'Negro', cant: Number(tinta.negro_cantidad || 0), min: Number(tinta.negro_minimo || 0), color: '#94A3B8' },
                          ];
                          const total = colorRows.reduce((sum, c) => sum + c.cant, 0);
                          return (
                            <div key={tinta.id} style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{tinta.nombre || marca}</div>
                                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                    {tinta.presentacion || 'bolsa'}{tinta.ml_presentacion ? ` · ${tinta.ml_presentacion} ml` : ''}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 700, color: '#4edea3' }}>{total.toFixed(0)} ml</div>
                                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>disponible</div>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {colorRows.map((c) => {
                                  const pct = c.min > 0 ? Math.min(100, Math.round((c.cant / c.min) * 100)) : 100;
                                  return (
                                    <div key={c.label}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
                                        <span style={{ color: c.color, fontWeight: 700 }}>{c.label}</span>
                                        <span>{c.cant.toFixed(0)} ml{c.min > 0 ? ` · min ${c.min.toFixed(0)} ml` : ''}</span>
                                      </div>
                                      <div style={{ width: '100%', height: '6px', backgroundColor: '#171f33', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: c.color }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Solicitud rápida</div>
                  <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>Marca, color y presentación</div>
                </div>
                <button
                  onClick={() => {
                    setSolicitudForm({
                      tipo_item: 'tinta',
                      item_id: '',
                      item_nombre: 'Tinta',
                      cantidad_solicitada: '',
                      unidad: 'ml',
                      prioridad: 'normal',
                      nota: '',
                      tinta_marca: 'Mimaki BS4',
                      tinta_color: 'magenta',
                      tinta_presentacion: 'bolsa',
                      tinta_ml_presentacion: '2000',
                      tinta_presentaciones: '1',
                    });
                    setSolicitudDrawerOpen(true);
                  }}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#ffb95f', border: 'none', borderRadius: '0.25rem', color: '#1a0f00', fontWeight: 700, cursor: 'pointer' }}
                >
                  Solicitar tinta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Compras de material */}
        {activeTab === 'compras' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '20px', color: '#F8FAFC', margin: 0 }}>Historial de compras</h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0.35rem 0 0' }}>Alta, corrección y trazabilidad de reabastecimientos.</p>
              </div>
              <button
                onClick={openNewCompraMaterialDrawer}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', backgroundColor: '#4edea3', border: 'none',
                  borderRadius: '0.25rem', color: '#002a20', fontWeight: 700,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Nueva compra
              </button>
            </div>
            {comprasConsistenciaAlertas.length > 0 && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '0.25rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#EF4444', margin: 0 }}>Alertas de consistencia</p>
                    <h4 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', color: '#F8FAFC', margin: '0.25rem 0 0' }}>
                      {comprasConsistenciaAlertas.length} compra{comprasConsistenciaAlertas.length === 1 ? '' : 's'} requieren revisión
                    </h4>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>No se corrige automáticamente</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comprasConsistenciaAlertas.slice(0, 5).map((alerta: any) => (
                    <div key={alerta.id} style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.25rem', padding: '0.85rem 0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{alerta.material}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{alerta.proveedor}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>{alerta.issues.length} issue{alerta.issues.length === 1 ? '' : 's'}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {alerta.issues.map((issue: string) => (
                          <span key={issue} style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#ffb95f', backgroundColor: 'rgba(255,185,95,0.08)', border: '1px solid rgba(255,185,95,0.18)', borderRadius: '999px', padding: '2px 8px' }}>
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Compras visibles', value: filteredComprasMaterial.length, icon: 'shopping_cart', color: '#b4c5ff' },
                { label: 'Crédito', value: comprasCreditoCount, icon: 'credit_card', color: '#ffb95f' },
                { label: 'Pagadas', value: comprasPagadasCount, icon: 'done', color: '#4edea3' },
                { label: 'Total USD', value: `$${comprasTotalUsd.toFixed(2)}`, icon: 'payments', color: '#F8FAFC' },
              ].map(stat => (
                <div key={stat.label} style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
                    {stat.label}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: stat.color }}>{stat.icon}</span>
                    <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: stat.color, margin: 0 }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
              <div className="relative" style={{ gridColumn: 'span 2' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>search</span>
                <Input className="pl-10" placeholder="Buscar por material, proveedor o nota..." value={searchCompras} onChange={e => setSearchCompras(e.target.value)} />
              </div>
              <div>
                <select
                  value={comprasMaterialFilter}
                  onChange={e => setComprasMaterialFilter(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
                >
                  <option value="all">Todos los materiales</option>
                  {(materiales || []).map((material: any) => (
                    <option key={material.id} value={material.id}>{material.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={comprasEstadoFilter}
                  onChange={e => setComprasEstadoFilter(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
                >
                  <option value="all">Todos los pagos</option>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Filtro proveedor</label>
              <Input value={comprasProveedorFilter} onChange={e => setComprasProveedorFilter(e.target.value)} placeholder="Proveedor..." />
            </div>

            <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#060e20', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['FECHA', 'MATERIAL', 'PROVEEDOR', 'CANTIDAD', 'PAGO', 'TOTAL USD', 'ACCIONES'].map(h => (
                      <th key={h} style={{ padding: '1rem 1.5rem', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8d90a0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredComprasMaterial.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>shopping_cart</span>
                        No hay compras que coincidan con los filtros
                      </td>
                    </tr>
                  ) : (
                    filteredComprasMaterial.map((row: any) => {
                      const material = (materiales || []).find((m: any) => m.id === row.material_id);
                      const materialLabel = material?.tipo || material?.nombre || 'Material';
                      const isCredit = Boolean(row.es_credito);
                      const payColor = row.estado_pago === 'pagado' ? '#4edea3' : row.estado_pago === 'pendiente' ? '#ffb95f' : '#b4c5ff';
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '12px', color: '#94A3B8' }}>
                            {row.fecha_compra ? new Date(row.fecha_compra).toLocaleDateString('es-CL') : '—'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{materialLabel}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '12px', color: '#94A3B8' }}>{row.proveedor || '—'}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '12px', color: '#94A3B8' }}>
                            {Number(row.cantidad || 0).toFixed(2)} {row.unidad || 'm'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '12px', color: payColor, fontWeight: 700 }}>
                            {isCredit ? 'Crédito' : 'Contado'} · {row.estado_pago || 'pagado'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '12px', color: '#F8FAFC', fontWeight: 700 }}>
                            ${Number(row.precio_usd || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => openEditCompraMaterialDrawer(row)}
                                style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', cursor: 'pointer', color: '#94A3B8' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCompraMaterial(row)}
                                style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', cursor: 'pointer', color: '#EF4444' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Kardex operativo */}
        {recipeFeaturesEnabled && activeTab === 'kardex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>Stock actual</p>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: '#b4c5ff', margin: 0 }}>{kardexMaterialCurrentStock.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0.35rem 0 0' }}>{selectedKardexMaterial?.tipo || 'Selecciona un material'}</p>
                <p style={{ fontSize: '12px', color: '#4edea3', margin: '0.25rem 0 0' }}>Entradas por compra: {kardexMaterialPurchased.toFixed(2)}</p>
              </div>
              <div style={{ flex: '1 1 240px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>Consumo real</p>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: '#10B981', margin: 0 }}>{kardexMaterialRealConsumed.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0.35rem 0 0' }}>Movimientos ya registrados</p>
              </div>
              <div style={{ flex: '1 1 240px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>Proyección</p>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: kardexMaterialShortage ? '#EF4444' : '#ffb95f', margin: 0 }}>{kardexMaterialProjected.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0.35rem 0 0' }}>Pedidos y trabajos pendientes</p>
              </div>
              <div style={{ flex: '1 1 240px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>Stock proyectado</p>
                <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: kardexMaterialShortage ? '#EF4444' : '#4edea3', margin: 0 }}>{kardexMaterialProjectedStock.toFixed(2)}</p>
                <p style={{ fontSize: '12px', color: kardexMaterialShortage ? '#EF4444' : '#94A3B8', margin: '0.35rem 0 0' }}>
                  {kardexMaterialShortage ? 'Quiebra proyectada' : 'Cobertura suficiente'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '1rem', alignItems: 'start' }}>
              <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Buscar material</label>
                <Input value={searchKardex} onChange={e => setSearchKardex(e.target.value)} placeholder="Vinil, lona, PVC..." />
                <div style={{ marginTop: '1rem', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredKardexMaterials.map((material: any) => {
                    const selected = material.id === kardexMaterialId;
                    const real = (consumoMateriales || []).filter((row: any) => row.material_id === material.id).reduce((sum: number, row: any) => sum + (Number(row.cantidad_consumida) || 0), 0);
                    const projected = materialProjectionRows.filter((row: any) => row.material_id === material.id).reduce((sum: number, row: any) => sum + (Number(row.consumo) || 0), 0);
                    const current = Number(material.stock ?? material.largo_restante ?? material.cantidad_actual ?? 0);
                    const projectedBalance = current - projected;
                    return (
                      <button
                        key={material.id}
                        onClick={() => setKardexMaterialId(material.id)}
                        style={{
                          textAlign: 'left',
                          padding: '0.85rem 0.9rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${selected ? 'rgba(180,197,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                          background: selected ? 'rgba(180,197,255,0.08)' : '#131b2e',
                          color: '#F8FAFC',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.tipo}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{material.stock} unid. · {Number(material.largo_restante || 0).toFixed(1)}m</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 700, color: projectedBalance < 0 ? '#EF4444' : '#4edea3' }}>{projectedBalance.toFixed(2)}</div>
                            <div style={{ fontSize: '10px', color: '#94A3B8' }}>proj.</div>
                          </div>
                        </div>
                        <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
                          <span>Real: {real.toFixed(2)}</span>
                          <span>Proj.: {projected.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', margin: 0 }}>Movimientos de material</p>
                      <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', color: '#F8FAFC', margin: '0.25rem 0 0' }}>{selectedKardexMaterial?.tipo || 'Sin material seleccionado'}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '20px', fontWeight: 700, color: kardexMaterialShortage ? '#EF4444' : '#b4c5ff' }}>{kardexMaterialProjectedStock.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>stock proyectado</div>
                    </div>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {realMaterialMovements.length === 0 && projectedMaterialMovements.length === 0 && purchasedMaterialMovements.length === 0 ? (
                      <div style={{ padding: '1rem', color: '#64748B', fontSize: '12px' }}>
                        No hay movimientos para este material.
                      </div>
                    ) : (
                      [
                        ...purchasedMaterialMovements.map((row: any) => ({
                          ...row,
                          tipo: 'compra',
                          fecha: row.fecha_compra || row.created_at,
                          origen: 'Compra',
                          cantidad: Number(row.cantidad) || 0,
                        })),
                        ...realMaterialMovements.map((row: any) => ({
                          ...row,
                          tipo: 'real',
                          fecha: row.created_at,
                          origen: 'Consumo real',
                          cantidad: Number(row.cantidad_consumida) || 0,
                        })),
                        ...projectedMaterialMovements,
                      ]
                        .sort((a: any, b: any) => new Date(b.fecha || b.created_at).getTime() - new Date(a.fecha || a.created_at).getTime())
                        .map((row: any) => {
                          const isProjected = row.tipo === 'proyeccion';
                          const isPurchase = row.tipo === 'compra';
                          return (
                            <div key={row.id || row.key} style={{
                              padding: '0.85rem 0.9rem',
                              borderRadius: '0.375rem',
                              background: isProjected ? 'rgba(255,185,95,0.08)' : isPurchase ? 'rgba(78,222,163,0.08)' : 'rgba(16,185,129,0.08)',
                              border: `1px solid ${isProjected ? 'rgba(255,185,95,0.18)' : isPurchase ? 'rgba(78,222,163,0.18)' : 'rgba(16,185,129,0.18)'}`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>{row.origen}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                    {new Date(row.fecha || row.created_at).toLocaleDateString('es-CL')} · {row.cliente || row.producto_nombre || row.proveedor || '—'}
                                  </div>
                                  {isPurchase && row.proveedor && (
                                    <div style={{ fontSize: '10px', color: '#4edea3', marginTop: '2px' }}>
                                      {row.es_credito ? 'Crédito' : 'Contado'} · {row.estado_pago || 'pagado'}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 700, color: isProjected ? '#ffb95f' : isPurchase ? '#4edea3' : '#4edea3' }}>
                                    {Number(row.cantidad || row.consumo || 0).toFixed(2)} {row.unidad || 'm2'}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>{isProjected ? 'proyección' : isPurchase ? 'compra' : 'real'}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', margin: 0 }}>Movimientos de tintas</p>
                      <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', color: '#F8FAFC', margin: '0.25rem 0 0' }}>Registro real CMYK</h3>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sin proyección automática</div>
                  </div>
                  <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tintaMovements.length === 0 ? (
                      <div style={{ padding: '1rem', color: '#64748B', fontSize: '12px' }}>
                        No hay consumos de tinta registrados.
                      </div>
                    ) : (
                      tintaMovements.map((row: any) => (
                        <div key={row.id} style={{ padding: '0.85rem 0.9rem', borderRadius: '0.375rem', background: '#131b2e', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>{row.tinta_nombre}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                {new Date(row.created_at).toLocaleDateString('es-CL')} · Pedido {row.pedido_id?.slice(0, 8)?.toUpperCase() || '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 700, color: '#b4c5ff' }}>{Number(row.total_cc || 0).toFixed(2)} cc</div>
                              <div style={{ fontSize: '10px', color: '#94A3B8' }}>consumo</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === DRAWERS === */}

      {/* Overlay + Drawer 1: Crear/Editar Material */}
      {materialDrawerOpen && (
        <div onClick={closeMaterialDrawer} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '480px',
        backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        transform: materialDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b4c5ff', backgroundColor: 'rgba(180,197,255,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              {editingMaterial ? 'Editar Solicitud' : 'Solicitar Material'}
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              {solicitudForm.item_nombre || editingMaterial?.item_nombre || editingMaterial?.tipo || 'Nuevo Pedido'}
            </h3>
          </div>
          <button onClick={closeMaterialDrawer} className="material-symbols-outlined"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >close</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Nombre del material *</label>
              <Input value={materialForm.tipo} onChange={e => setMaterialForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ej: Bisagras, Pega blanca, Tela PVC" required />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Presentación *</label>
              <select
                value={materialForm.unidad_medida}
                onChange={e => setMaterialForm(f => ({ ...f, unidad_medida: e.target.value }))}
                style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
              >
                {MATERIAL_UNIT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p style={{ margin: '8px 0 0', color: '#94A3B8', fontSize: '12px', lineHeight: 1.4 }}>
                {getMaterialUnitMeta(materialForm.unidad_medida)?.hint || ''}
              </p>
            </div>

            {/* Campos dinámicos según presentación */}
            {materialForm.unidad_medida === 'rollo' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Ancho del rollo (cm)</label>
                  <Input type="number" min="1" value={materialForm.ancho} onChange={e => setMaterialForm(f => ({ ...f, ancho: e.target.value }))} placeholder="127" />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Metros del rollo</label>
                  <Input type="number" min="1" value={materialForm.largo_original} onChange={e => setMaterialForm(f => ({ ...f, largo_original: e.target.value }))} placeholder="50" />
                  {Number(materialForm.ancho) > 0 && Number(materialForm.largo_original) > 0 && (
                    <p style={{ margin: '6px 0 0', color: '#4edea3', fontSize: '12px', fontWeight: 600 }}>
                      = {((Number(materialForm.ancho) / 100) * Number(materialForm.largo_original)).toFixed(2)} m²
                    </p>
                  )}
                </div>
              </>
            ) : materialForm.unidad_medida === 'm2' || materialForm.unidad_medida === 'metro_lineal' ? (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                  {materialForm.unidad_medida === 'm2' ? 'Total m² a solicitar' : 'Metros lineales a solicitar'}
                </label>
                <Input type="number" min="1" value={materialForm.largo_original} onChange={e => setMaterialForm(f => ({ ...f, largo_original: e.target.value }))} placeholder="10" />
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                    {materialForm.unidad_medida === 'ml' ? 'Contenido por envase (ml)' :
                     materialForm.unidad_medida === 'litro' ? 'Litros por envase' :
                     materialForm.unidad_medida === 'galon' ? 'ml por galón' :
                     materialForm.unidad_medida === 'pote' ? 'Contenido por pote (ml)' :
                     materialForm.unidad_medida === 'caja' ? 'Unidades por caja' :
                     materialForm.unidad_medida === 'paquete' ? 'Unidades por paquete' :
                     'Contenido por unidad'}
                  </label>
                  <Input type="number" min="1" value={materialForm.ancho} onChange={e => setMaterialForm(f => ({ ...f, ancho: e.target.value }))} placeholder="24" />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                    {materialForm.unidad_medida === 'ml' || materialForm.unidad_medida === 'pote' ? 'Total ml que necesitas' :
                     materialForm.unidad_medida === 'litro' ? 'Total litros que necesitas' :
                     materialForm.unidad_medida === 'galon' ? 'Total galones que necesitas' :
                     'Total unidades que necesitas'}
                  </label>
                  <Input type="number" min="1" value={materialForm.largo_original} onChange={e => setMaterialForm(f => ({ ...f, largo_original: e.target.value }))} placeholder="72" />
                  {Number(materialForm.largo_original) > 0 && Number(materialForm.ancho) > 0 && (
                    <p style={{ margin: '6px 0 0', color: '#4edea3', fontSize: '12px', fontWeight: 600 }}>
                      = {Math.max(1, Math.ceil(Number(materialForm.largo_original) / Number(materialForm.ancho)))} {getPresentationPlural(materialForm.unidad_medida)}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Stock mínimo para alerta</label>
              <Input type="number" min="0" value={materialForm.largo_restante} onChange={e => setMaterialForm(f => ({ ...f, largo_restante: e.target.value }))} placeholder="6" />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Observación</label>
              <Input value={materialForm.nota} onChange={e => setMaterialForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ej: Bisagras 3 pulgadas" />
            </div>
            <div style={{ gridColumn: '1/-1', backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', padding: '0.75rem 0.9rem' }}>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '12px', lineHeight: 1.45 }}>
                El pedido se guarda primero como solicitud. Cuando cambie a recibido, se crea o actualiza el material en inventario.
              </p>
            </div>
          </div>
        </div>
        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button type="button" onClick={closeMaterialDrawer}
            style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSaveMaterial}
            disabled={createSolicitud.isPending || updateSolicitud.isPending}
            style={{ padding: '0.75rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: (createSolicitud.isPending || updateSolicitud.isPending) ? 0.7 : 1 }}>
            {(createSolicitud.isPending || updateSolicitud.isPending) ? 'Guardando...' : (() => {
              const u = materialForm.unidad_medida;
              if (u === 'rollo') {
                const m2 = ((Number(materialForm.ancho) / 100) * Number(materialForm.largo_original)).toFixed(1);
                return `Pedir 1 rollo (${m2} m²)`;
              }
              if (u === 'm2' || u === 'metro_lineal') return `Pedir ${Number(materialForm.largo_original) || 0} ${u === 'm2' ? 'm²' : 'metros'}`;
              return `Pedir ${Math.max(1, Math.ceil((Number(materialForm.largo_original) || 0) / (Number(materialForm.ancho) || 1)))} ${getPresentationPlural(u)}`;
            })()}
          </button>
        </footer>
      </aside>

      {/* Reabastecimiento de materiales ahora se gestiona desde Compras */}

      {/* Overlay + Drawer 3: Crear/Editar Tinta */}
      {tintaDrawerOpen && (
        <div onClick={() => { setTintaDrawerOpen(false); setEditingTinta(null); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '420px',
        backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        transform: tintaDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b4c5ff', backgroundColor: 'rgba(180,197,255,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              {editingTinta ? 'Editar Tinta' : 'Nueva Tinta'}
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              {editingTinta?.nombre || 'Ficha de tinta'}
            </h3>
          </div>
          <button
            onClick={() => { setTintaDrawerOpen(false); setEditingTinta(null); }}
            className="material-symbols-outlined"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >close</button>
        </header>
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Nombre *</label>
            <Input value={tintaForm.nombre} onChange={e => setTintaForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: CMYK Standard" />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Marca</label>
            <select
              value={tintaForm.marca}
              onChange={e => setTintaForm(f => ({ ...f, marca: e.target.value }))}
              style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
            >
              {TINTA_MARCAS.map(marca => (
                <option key={marca.value} value={marca.value}>{marca.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>Presentación</label>
              <select
                value={tintaForm.presentacion}
                onChange={e => setTintaForm(f => ({ ...f, presentacion: e.target.value }))}
                style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
              >
                {TINTA_PRESENTACIONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>Ml por presentación</label>
              <Input type="number" min="1" step="1" value={tintaForm.ml_presentacion} onChange={e => setTintaForm(f => ({ ...f, ml_presentacion: e.target.value }))} placeholder="2000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { key: 'magenta_cantidad', label: 'Magenta', color: '#e879f9' },
              { key: 'cian_cantidad', label: 'Cian', color: '#22d3ee' },
              { key: 'amarillo_cantidad', label: 'Amarillo', color: '#fde047' },
              { key: 'negro_cantidad', label: 'Negro', color: '#94A3B8' },
              { key: 'magenta_minimo', label: 'Min. Magenta', color: '#e879f9' },
              { key: 'cian_minimo', label: 'Min. Cian', color: '#22d3ee' },
              { key: 'amarillo_minimo', label: 'Min. Amarillo', color: '#fde047' },
              { key: 'negro_minimo', label: 'Min. Negro', color: '#94A3B8' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: field.color, marginBottom: '0.35rem' }}>
                  {field.label}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(tintaForm as any)[field.key]}
                  onChange={e => setTintaForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => { setTintaDrawerOpen(false); setEditingTinta(null); }}
            style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveTinta}
            disabled={createTinta.isPending || updateTinta.isPending}
            style={{ padding: '0.75rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: (createTinta.isPending || updateTinta.isPending) ? 0.7 : 1 }}
          >
            {(createTinta.isPending || updateTinta.isPending) ? 'Guardando...' : 'Guardar tinta'}
          </button>
        </footer>
      </aside>

      {/* Overlay + Drawer 3: Reabastecer Tinta */}
      {reabastecerTintaId && (
        <div onClick={() => { setReabastecerTintaId(null); setTintaAgregar({ magenta: '', cian: '', amarillo: '', negro: '' }); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '400px',
        backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        transform: reabastecerTintaId ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e879f9', backgroundColor: 'rgba(232,121,249,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              Reabastecer
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              Tintas CMYK
            </h3>
          </div>
          <button onClick={() => { setReabastecerTintaId(null); setTintaAgregar({ magenta: '', cian: '', amarillo: '', negro: '' }); }} className="material-symbols-outlined"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >close</button>
        </header>
        <div style={{ flex: 1, padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { key: 'magenta', label: 'Magenta', color: '#e879f9' },
              { key: 'cian', label: 'Cian', color: '#22d3ee' },
              { key: 'amarillo', label: 'Amarillo', color: '#fde047' },
              { key: 'negro', label: 'Negro', color: '#94A3B8' },
            ].map(canal => (
              <div key={canal.key}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: canal.color, display: 'inline-block' }} />
                  {canal.label} (cc)
                </label>
                <Input
                  type="number" min="0" placeholder="0"
                  value={tintaAgregar[canal.key as keyof typeof tintaAgregar]}
                  onChange={e => setTintaAgregar(f => ({ ...f, [canal.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button type="button" onClick={() => { setReabastecerTintaId(null); setTintaAgregar({ magenta: '', cian: '', amarillo: '', negro: '' }); }}
            style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleReabastecerTinta}
            disabled={updateTinta.isPending}
            style={{ padding: '0.75rem', backgroundColor: '#4edea3', border: 'none', borderRadius: '0.25rem', color: '#002a20', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: updateTinta.isPending ? 0.7 : 1 }}>
            {updateTinta.isPending ? 'Agregando...' : 'Confirmar'}
          </button>
        </footer>
      </aside>

      {/* ═══ DRAWER: SOLICITUD DE COMPRA ════════════════════════════ */}
      {solicitudDrawerOpen && (
        <div onClick={() => setSolicitudDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '420px',
        backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        transform: solicitudDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb95f', backgroundColor: 'rgba(255,185,95,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              Nueva Solicitud
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              {solicitudForm.item_nombre || 'Solicitar compra'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
              {solicitudForm.tipo_item}
            </p>
          </div>
          <button onClick={() => setSolicitudDrawerOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '22px', lineHeight: 1, padding: '2px' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {solicitudForm.tipo_item === 'tinta' ? (
            <>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Marca</label>
                <select
                  value={solicitudForm.tinta_marca}
                  onChange={e => setSolicitudForm(f => ({ ...f, tinta_marca: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                >
                  {TINTA_MARCAS.map(marca => <option key={marca.value} value={marca.value}>{marca.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Color</label>
                  <select
                    value={solicitudForm.tinta_color}
                    onChange={e => setSolicitudForm(f => ({ ...f, tinta_color: e.target.value }))}
                    style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                  >
                    {TINTA_COLORES.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Presentación</label>
                  <select
                    value={solicitudForm.tinta_presentacion}
                    onChange={e => setSolicitudForm(f => ({ ...f, tinta_presentacion: e.target.value }))}
                    style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                  >
                    {TINTA_PRESENTACIONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Ml por presentación</label>
                  <Input
                    type="number" min="1" step="1" placeholder="2000"
                    value={solicitudForm.tinta_ml_presentacion}
                    onChange={e => setSolicitudForm(f => ({ ...f, tinta_ml_presentacion: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Presentaciones a pedir</label>
                  <Input
                    type="number" min="1" step="1" placeholder="1"
                    value={solicitudForm.tinta_presentaciones}
                    onChange={e => setSolicitudForm(f => ({ ...f, tinta_presentaciones: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ padding: '0.75rem 0.9rem', backgroundColor: '#131b2e', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.06)', color: '#dae2fd', fontSize: '12px', lineHeight: 1.5 }}>
                Se enviará a Finanzas como <strong>{Number(solicitudForm.tinta_presentaciones || 0) * Number(solicitudForm.tinta_ml_presentacion || 0)} ml</strong> de tinta {solicitudForm.tinta_marca} {solicitudForm.tinta_color}.
                Allí se aprobará el precio por presentación y el sistema lo dividirá entre los ml para calcular el costo por ml.
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Cantidad *</label>
                <Input
                  type="number" min="0" step="0.1" placeholder="0"
                  value={solicitudForm.cantidad_solicitada}
                  onChange={e => setSolicitudForm(f => ({ ...f, cantidad_solicitada: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Unidad</label>
                <select
                  value={solicitudForm.unidad}
                  onChange={e => setSolicitudForm(f => ({ ...f, unidad: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="m">metros</option>
                  <option value="ml_lineal">metros lineales</option>
                  <option value="cc">cc</option>
                  <option value="unid">unidades</option>
                  <option value="kg">kg</option>
                  <option value="lt">litros</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Prioridad</label>
            <select
              value={solicitudForm.prioridad}
              onChange={e => setSolicitudForm(f => ({ ...f, prioridad: e.target.value }))}
              style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>Nota (opcional)</label>
            <Input
              placeholder="Observaciones para la compra..."
              value={solicitudForm.nota}
              onChange={e => setSolicitudForm(f => ({ ...f, nota: e.target.value }))}
            />
          </div>

          {/* Solicitudes recientes */}
          {solicitudes && solicitudes.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Solicitudes recientes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {solicitudes.slice(0, 5).map((s: any) => {
                  const estadoColor: Record<string, string> = {
                    pendiente: '#ffb95f', aprobada: '#10B981', rechazada: '#EF4444',
                    comprada: '#3B82F6', recibida: '#b4c5ff',
                  };
                  const color = estadoColor[s.estado] || '#94A3B8';
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#131b2e', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '12px', color: '#dae2fd' }}>{s.item_nombre} — {Number(parseSolicitudInventarioMeta(s.nota)?.unidades_a_solicitar || 0).toLocaleString('es-CL')} {s.unidad}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color, padding: '1px 6px', borderRadius: '0.125rem', backgroundColor: `${color}20` }}>
                        {s.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button type="button" onClick={() => setSolicitudDrawerOpen(false)}
            style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSolicitar}
            disabled={createSolicitud.isPending}
            style={{ padding: '0.75rem', backgroundColor: '#ffb95f', border: 'none', borderRadius: '0.25rem', color: '#1a0f00', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: createSolicitud.isPending ? 0.7 : 1 }}>
            {createSolicitud.isPending ? 'Guardando...' : 'Solicitar'}
          </button>
        </footer>
      </aside>

      {/* Overlay + Drawer 2: Compras de Material */}
      {reabastecerMaterialId && (
        <div onClick={resetReabastecerMaterialForm} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '400px',
        backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 70, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        transform: reabastecerMaterialId ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4edea3', backgroundColor: 'rgba(78,222,163,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
              {editingCompraMaterial ? 'Editar compra' : 'Nueva compra'}
            </span>
            <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              {editingCompraMaterial ? 'Corrección de compra' : (materialReab?.tipo || 'Material')}
            </h3>
          </div>
          <button onClick={resetReabastecerMaterialForm} className="material-symbols-outlined"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >close</button>
        </header>
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Material</label>
            <select
              value={reabastecerMaterialId || ''}
              onChange={e => setReabastecerMaterialId(e.target.value || null)}
              style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
            >
              <option value="">Selecciona un material</option>
              {(materiales || []).map((material: any) => (
                <option key={material.id} value={material.id}>{material.tipo}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>{materialReab ? getMaterialUnitMeta(materialReab.unidad_medida).amountLabel + ' a agregar' : 'Cantidad a agregar'}</label>
            <Input type="number" min="0" placeholder="0" value={metrosAgregar} onChange={e => setMetrosAgregar(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Proveedor</label>
              <select
                value={reabastecerMaterialForm.proveedor}
                onChange={e => setReabastecerMaterialForm(f => ({ ...f, proveedor: e.target.value }))}
                style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
              >
                <option value="">Proveedor libre</option>
                {(proveedores || []).map((p: any) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Moneda</label>
              <select
                value={reabastecerMaterialForm.moneda}
                onChange={e => setReabastecerMaterialForm(f => ({ ...f, moneda: e.target.value }))}
                style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="Binance">Binance</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Tasa → USD</label>
              <Input type="number" min="0" step="0.01" value={reabastecerMaterialForm.tasa_usd} onChange={e => setReabastecerMaterialForm(f => ({ ...f, tasa_usd: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Pago</label>
              <select
                value={reabastecerMaterialForm.estado_pago}
                onChange={e => setReabastecerMaterialForm(f => ({ ...f, estado_pago: e.target.value }))}
                style={{ width: '100%', height: '42px', borderRadius: '0.375rem', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', padding: '0 0.75rem' }}
              >
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
          </div>
          {proveedorSelected && (
            <div style={{ backgroundColor: 'rgba(180,197,255,0.08)', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '0.375rem', padding: '10px 12px', color: '#dae2fd', fontSize: '12px', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{proveedorSelected.nombre}</div>
              <div>
                {proveedorSelected.moneda_preferida || 'USD'} · {proveedorSelected.politica_tasa || 'BCV'} · {proveedorSelected.es_credito ? `${proveedorSelected.dias_credito || 0} días crédito` : 'Contado'} · {proveedorSelected.metodo_pago_habitual || 'Sin método'}
              </div>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC' }}>
            <input
              type="checkbox"
              checked={reabastecerMaterialForm.es_credito}
              onChange={e => setReabastecerMaterialForm(f => ({ ...f, es_credito: e.target.checked, estado_pago: e.target.checked ? 'pendiente' : 'pagado' }))}
            />
            Compra a crédito
          </label>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Nota</label>
            <Input value={reabastecerMaterialForm.nota} onChange={e => setReabastecerMaterialForm(f => ({ ...f, nota: e.target.value }))} placeholder="Observación opcional" />
          </div>
          {materialReab && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8', margin: 0 }}>
              Disponible actual: {materialReab.largo_restante} / {materialReab.largo_original} {getMaterialUnitMeta(materialReab.unidad_medida).amountLabel}
            </p>
          )}
        </div>
        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button type="button" onClick={resetReabastecerMaterialForm}
            style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleReabastecerMaterial}
            disabled={updateMaterial.isPending || createCompraMaterial.isPending || updateCompraMaterial.isPending}
            style={{ padding: '0.75rem', backgroundColor: '#4edea3', border: 'none', borderRadius: '0.25rem', color: '#002a20', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: (updateMaterial.isPending || createCompraMaterial.isPending || updateCompraMaterial.isPending) ? 0.7 : 1 }}>
            {updateMaterial.isPending || createCompraMaterial.isPending || updateCompraMaterial.isPending ? 'Agregando...' : 'Confirmar'}
          </button>
        </footer>
      </aside>
    </>
  );
}
