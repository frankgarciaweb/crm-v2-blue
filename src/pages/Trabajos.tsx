import { useEffect, useMemo, useState } from 'react';
import {
  useTrabajos, useCreateTrabajo, useUpdateTrabajo, usePedidos, useMaquinas,
  useCreateConsumoTinta, useCreateConsumoMaterial,
  useUpdateTinta, useUpdateMaterial, useUpdateMaquina,
  useTintas, useMateriales, useProductoMaterialesAll, useRecipeModuleEnabled, useMaquinaTintaActiva,
} from '@/hooks/useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Search, Edit, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { getRecipeFactor, recipeAppliesToMachine, recipeAppliesToMaterial } from '@/lib/recipeCalculations';

interface TrabajoForm {
  pedido_id: string;
  descripcion: string;
  metros_cuadrados: string;
  maquina_asignada: string;
  prioridad: string;
  estado: string;
  notas: string;
  fecha_estimada: string;
}

const emptyForm: TrabajoForm = {
  pedido_id: '',
  descripcion: '',
  metros_cuadrados: '',
  maquina_asignada: '',
  prioridad: 'normal',
  estado: 'pendiente',
  notas: '',
  fecha_estimada: '',
};

const ESTADOS = [
  {
    value: 'pendiente',
    label: 'Pendiente',
    color: '#64748B',
    borderClass: 'border-l-[#64748B]',
    dotClass: 'bg-[#64748B]',
    badgeClass: 'bg-[#64748B]/20 text-[#64748B] border border-[#64748B]/30',
  },
  {
    value: 'en_proceso',
    label: 'En Producción',
    color: '#3B82F6',
    borderClass: 'border-l-[#3B82F6]',
    dotClass: 'bg-[#3B82F6] animate-pulse',
    badgeClass: 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30',
  },
  {
    value: 'listo',
    label: 'Listo',
    color: '#10B981',
    borderClass: 'border-l-[#10B981]',
    dotClass: 'bg-[#10B981]',
    badgeClass: 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30',
  },
  {
    value: 'entregado',
    label: 'Entregado',
    color: '#b4c5ff',
    borderClass: 'border-l-[#b4c5ff]/40',
    dotClass: 'bg-[#b4c5ff]/40',
    badgeClass: 'bg-[#b4c5ff]/10 text-[#b4c5ff]/60 border border-[#b4c5ff]/20',
  },
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', badgeClass: 'bg-[#171f33] text-[#c3c6d7] border border-[rgba(255,255,255,0.08)]' },
  { value: 'normal', label: 'Normal', badgeClass: 'bg-[#171f33] text-[#c3c6d7] border border-[rgba(255,255,255,0.08)]' },
  { value: 'alta', label: 'Alta', badgeClass: 'bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/30' },
  { value: 'urgente', label: 'Urgente', badgeClass: 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' },
];

const SELECT_CLASS =
  'flex h-10 w-full rounded border border-[rgba(255,255,255,0.08)] bg-[#131b2e] px-3 py-2 text-sm text-[#dae2fd] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]';

const CMYK = [
  { key: 'magenta_cc', label: 'Magenta', color: '#e879f9' },
  { key: 'cian_cc',    label: 'Cian',    color: '#22d3ee' },
  { key: 'amarillo_cc',label: 'Amarillo',color: '#fde047' },
  { key: 'negro_cc',   label: 'Negro',   color: '#94A3B8' },
] as const;

function groupTintasByMarca(tintas: any[] | undefined) {
  return (tintas || []).reduce((acc: Record<string, any[]>, tinta: any) => {
    const marca = String(tinta?.marca || 'Sin marca').trim() || 'Sin marca';
    if (!acc[marca]) acc[marca] = [];
    acc[marca].push(tinta);
    return acc;
  }, {});
}

function getPrioridad(v: string) {
  return PRIORIDADES.find(p => p.value === v) || PRIORIDADES[1];
}
function getEstado(v: string) {
  return ESTADOS.find(e => e.value === v) || ESTADOS[0];
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
    /* notas es texto plano */
  }
  return [];
}

function getPedidoBaseUnits(item: any) {
  if (item?.tipo_cobro === 'm2') {
    return (Number(item.cantidad) || 0) * (Number(item.ancho) || 0) * (Number(item.alto) || 0);
  }
  return Number(item?.cantidad) || 0;
}

function buildExpectedConsumption(
  trabajo: any,
  pedidoActivo: any,
  recetasProductos: any[] | undefined,
  materiales: any[] | undefined,
  machineLookup: Record<string, string>,
) {
  if (!trabajo || !pedidoActivo || !Array.isArray(recetasProductos) || recetasProductos.length === 0) {
    return {
      items: [] as any[],
      materials: [] as any[],
      totalMaterials: 0,
      totalConsumed: 0,
      hasRecipe: false,
      singleMaterial: null as any,
    };
  }

  const pedidoItems = parseItemsFromPedido(pedidoActivo);
  if (pedidoItems.length === 0) {
    return {
      items: [] as any[],
      materials: [] as any[],
      totalMaterials: 0,
      totalConsumed: 0,
      hasRecipe: false,
      singleMaterial: null as any,
    };
  }

  const recipeByProductId = (recetasProductos || []).reduce((acc: Record<string, any[]>, row: any) => {
    if (!acc[row.producto_id]) acc[row.producto_id] = [];
    acc[row.producto_id].push(row);
    return acc;
  }, {});

  const rows = pedidoItems.flatMap((item: any) => {
    const productRecipes = recipeByProductId[item.producto_id] || [];
    const baseUnits = getPedidoBaseUnits(item);
    const machineId = item.maquina_id || (trabajo?.maquina_asignada ? machineLookup[trabajo.maquina_asignada] : '') || '';
    return productRecipes.map((recipe: any) => {
      const material = (materiales || []).find((m: any) => m.id === recipe.material_id);
      if (!recipeAppliesToMachine(recipe, machineId)) return null;
      if (!recipeAppliesToMaterial(recipe, material)) return null;
      const consumo = getRecipeFactor(recipe, { quantity: Number(item.cantidad) || 0, baseUnits });
      const disponible = Number(material?.stock ?? material?.largo_restante ?? material?.cantidad_actual ?? 0);
      return {
        key: `${item.id}-${recipe.id}`,
        producto_nombre: item.producto_nombre,
        material_id: recipe.material_id,
        material_nombre: material?.tipo || material?.nombre || 'Material',
        tipo_calculo: recipe.tipo_calculo || 'por_m2',
        consumo,
        disponible,
        restante: disponible - consumo,
        unidad: material?.unidad_medida || 'm2',
      };
    }).filter(Boolean);
  });

  const materials = rows.reduce((acc: Record<string, any>, row: any) => {
    const key = row.material_id;
    if (!acc[key]) {
      acc[key] = { ...row, consumo: 0, disponible: row.disponible, unidad: row.unidad };
    }
    acc[key].consumo += row.consumo;
    acc[key].restante = acc[key].disponible - acc[key].consumo;
    return acc;
  }, {});

  const materialsArr = Object.values(materials) as any[];
  const singleMaterial = materialsArr.length === 1 ? materialsArr[0] : null;

  return {
    items: rows,
    materials: materialsArr,
    totalMaterials: materialsArr.length,
    totalConsumed: materialsArr.reduce((s, row: any) => s + row.consumo, 0),
    hasRecipe: rows.length > 0,
    singleMaterial,
  };
}

export default function Trabajos() {
  const { data: trabajos, isLoading: loadingTrabajos } = useTrabajos();
  const { data: pedidos, isLoading: loadingPedidos } = usePedidos();
  const { data: maquinas } = useMaquinas();
  const { data: tintas } = useTintas();
  const { data: materiales } = useMateriales();
  const { data: recetasProductos } = useProductoMaterialesAll();
  const recipeFeaturesEnabled = useRecipeModuleEnabled();
  // ─── Consumo state ───────────────────────────────────────────────
  const [consumoTrabajo, setConsumoTrabajo] = useState<any>(null);
  const [consumoRegistrado, setConsumoRegistrado] = useState(false);
  const [consumoForm, setConsumoForm] = useState({
    tinta_id: '', material_id: '', metros_cuadrados: '',
    magenta_cc: '0', cian_cc: '0', amarillo_cc: '0', negro_cc: '0',
    metros_material: '0', horas_maquina: '0',
  });
  const [consumoLoading, setConsumoLoading] = useState(false);

  const machineLookup = useMemo(() => {
    return (maquinas || []).reduce((acc: Record<string, string>, maquina: any) => {
      if (maquina?.nombre) acc[maquina.nombre] = maquina.id;
      return acc;
    }, {});
  }, [maquinas]);
  const consumoMaquinaId = consumoTrabajo?.maquina_asignada ? machineLookup[consumoTrabajo.maquina_asignada] : '';
  const { data: maquinaTintaActiva } = useMaquinaTintaActiva(consumoMaquinaId || undefined);
  const tintaActivaTrabajo = useMemo(() => {
    const asignacion = Array.isArray(maquinaTintaActiva) ? maquinaTintaActiva[0] : null;
    if (!asignacion?.tinta_id) return null;
    return tintas?.find((t: any) => t.id === asignacion.tinta_id) || null;
  }, [maquinaTintaActiva, tintas]);
  const tintasPorMarca = useMemo(() => groupTintasByMarca(tintas), [tintas]);

  const createTrabajo = useCreateTrabajo();
  const updateTrabajo = useUpdateTrabajo();
  const createConsumoTinta = useCreateConsumoTinta();
  const createConsumoMaterial = useCreateConsumoMaterial();
  const updateTintaHook = useUpdateTinta();
  const updateMaterialHook = useUpdateMaterial();
  const updateMaquinaHook = useUpdateMaquina();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'tablero' | 'lista' | 'maquinas'>('tablero');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrabajoForm>(emptyForm);
  const [draggingTrabajoId, setDraggingTrabajoId] = useState<string | null>(null);
  const [dragOverEstado, setDragOverEstado] = useState<string | null>(null);

  const isLoading = loadingTrabajos || loadingPedidos;

  const pedidoActivo = useMemo(
    () => pedidos?.find((p: any) => p.id === consumoTrabajo?.pedido_id) || null,
    [pedidos, consumoTrabajo?.pedido_id]
  );

  const expectedConsumption = useMemo(
    () => recipeFeaturesEnabled
      ? buildExpectedConsumption(consumoTrabajo, pedidoActivo, recetasProductos, materiales, machineLookup)
      : {
          items: [] as any[],
          materials: [] as any[],
          totalMaterials: 0,
          totalConsumed: 0,
          hasRecipe: false,
          singleMaterial: null as any,
        },
    [consumoTrabajo, pedidoActivo, recetasProductos, materiales, recipeFeaturesEnabled, machineLookup]
  );

  useEffect(() => {
    if (!consumoTrabajo) return;
    if (!tintaActivaTrabajo?.id) return;
    setConsumoForm(prev => {
      if (prev.tinta_id && prev.tinta_id !== tintaActivaTrabajo.id) return prev;
      if (prev.tinta_id === tintaActivaTrabajo.id) return prev;
      return { ...prev, tinta_id: tintaActivaTrabajo.id };
    });
  }, [consumoTrabajo?.id, tintaActivaTrabajo?.id]);

  const filtered = trabajos?.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.descripcion?.toLowerCase().includes(q) ||
      t.pedidos?.clientes?.nombre?.toLowerCase().includes(q) ||
      t.maquina_asignada?.toLowerCase().includes(q)
    );
  }) || [];

  const byEstado = ESTADOS.map(e => ({
    ...e,
    items: filtered.filter(t => t.estado === e.value),
  }));

  // Stats
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const m2Hoy = trabajos?.filter(t => new Date(t.created_at) >= hoy)
    .reduce((s, t) => s + (t.metros_cuadrados || 0), 0) || 0;
  const entregadosHoy = trabajos?.filter(t => t.estado === 'entregado' && new Date(t.created_at) >= hoy).length || 0;
  const enProduccion = trabajos?.filter(t => t.estado === 'en_proceso').length || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) { alert('La descripción es obligatoria'); return; }

    const data: Record<string, unknown> = {
      pedido_id: form.pedido_id || null,
      descripcion: form.descripcion,
      metros_cuadrados: form.metros_cuadrados ? parseFloat(form.metros_cuadrados) : null,
      maquina_asignada: form.maquina_asignada || null,
      prioridad: form.prioridad,
      estado: form.estado,
      notas: form.notas || null,
      fecha_estimada: form.fecha_estimada || null,
    };

    try {
      if (editingId) {
        await updateTrabajo.mutateAsync({ id: editingId, ...data });
      } else {
        await createTrabajo.mutateAsync(data);
      }
      setForm(emptyForm); setEditingId(null); setShowForm(false);
    } catch {
      alert('Error al guardar el trabajo');
    }
  };

  const handleEdit = (t: any) => {
    setForm({
      pedido_id: t.pedido_id || '',
      descripcion: t.descripcion || '',
      metros_cuadrados: t.metros_cuadrados?.toString() || '',
      maquina_asignada: t.maquina_asignada || '',
      prioridad: t.prioridad || 'normal',
      estado: t.estado || 'pendiente',
      notas: t.notas || '',
      fecha_estimada: t.fecha_estimada ? t.fecha_estimada.slice(0, 10) : '',
    });
    setEditingId(t.id); setShowForm(true);
  };

  const hasExistingConsumption = async (trabajoId: string, pedidoId?: string | null) => {
    const [tintaRows, materialRows] = await Promise.all([
      supabase.from('consumo_tinta_pedido').select('id').eq('trabajo_id', trabajoId).limit(1),
      pedidoId
        ? supabase.from('consumo_materiales').select('id').eq('pedido_id', pedidoId).limit(1)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    return Boolean((tintaRows.data || []).length || (materialRows.data || []).length);
  };

  const moveTrabajoToEstado = async (trabajo: any, targetEstado: string) => {
    if (!trabajo) return;
    if (trabajo.estado === targetEstado) return;

    try {
      if (targetEstado === 'entregado') {
        const alreadyHasConsumption = await hasExistingConsumption(trabajo.id, trabajo.pedido_id);
        if (!alreadyHasConsumption) {
          abrirConsumo(trabajo);
          alert('Primero registra el consumo antes de marcarlo como entregado.');
          return;
        }
      }

      await updateTrabajo.mutateAsync({ id: trabajo.id, estado: targetEstado });

      if (targetEstado === 'listo') {
        abrirConsumo(trabajo);
      }
    } catch {
      console.error('Error al mover trabajo');
    }
  };

  const handleQuickMove = async (id: string, dir: 'next' | 'prev') => {
    const t = trabajos?.find(x => x.id === id); if (!t) return;
    const idx = ESTADOS.findIndex(e => e.value === t.estado);
    const newIdx = dir === 'next' ? Math.min(idx + 1, ESTADOS.length - 1) : Math.max(idx - 1, 0);
    try {
      await moveTrabajoToEstado(t, ESTADOS[newIdx].value);
    } catch { console.error('Error al mover trabajo'); }
  };

  // ─── Abrir drawer de consumo ────────────────────────────────────
  function abrirConsumo(trabajo: any) {
    const pedido = pedidos?.find((p: any) => p.id === trabajo.pedido_id) || null;
    const expected = recipeFeaturesEnabled
      ? buildExpectedConsumption(trabajo, pedido, recetasProductos, materiales, machineLookup)
      : {
          items: [] as any[],
          materials: [] as any[],
          totalMaterials: 0,
          totalConsumed: 0,
          hasRecipe: false,
          singleMaterial: null as any,
        };
    setConsumoTrabajo(trabajo);
    setConsumoRegistrado(false);
    const expectedM2 = trabajo.metros_cuadrados?.toString() || '';
    setConsumoForm({
      tinta_id: tintaActivaTrabajo?.id || '',
      material_id: expected.singleMaterial?.material_id || '',
      metros_cuadrados: expectedM2 || '0',
      magenta_cc: '0', cian_cc: '0', amarillo_cc: '0', negro_cc: '0',
      metros_material: expected.singleMaterial ? expected.singleMaterial.consumo.toFixed(2) : '0',
      horas_maquina: '0',
    });
    (async () => {
      try {
        setConsumoRegistrado(await hasExistingConsumption(trabajo.id, trabajo.pedido_id));
      } catch {
        setConsumoRegistrado(false);
      }
    })();
  }

  function cerrarConsumo() {
    setConsumoTrabajo(null);
    setConsumoLoading(false);
  }

  // ─── Registrar consumo real y marcar como entregado ─────────────
  async function handleRegistrarConsumo(soloEntregar = false) {
    if (!consumoTrabajo) return;
    setConsumoLoading(true);
    try {
      if (consumoTrabajo.estado === 'entregado') {
        alert('Este trabajo ya fue entregado.');
        setConsumoLoading(false);
        return;
      }

      if (soloEntregar && !consumoRegistrado) {
        alert('Debes registrar el consumo antes de marcar como entregado.');
        setConsumoLoading(false);
        return;
      }

      const { data: tintaDuplicada } = await supabase
        .from('consumo_tinta_pedido')
        .select('id')
        .eq('trabajo_id', consumoTrabajo.id)
        .limit(1);

      if (tintaDuplicada && tintaDuplicada.length > 0) {
        alert('Este trabajo ya tiene consumo registrado. No se puede duplicar.');
        setConsumoLoading(false);
        return;
      }

      if (!soloEntregar) {
        const m2 = parseFloat(consumoForm.metros_cuadrados) || 0;
        const materialSeleccionado = Boolean(consumoForm.material_id);
        const horas = parseFloat(consumoForm.horas_maquina) || 0;
        const mcc = parseFloat(consumoForm.magenta_cc) || 0;
        const ccc = parseFloat(consumoForm.cian_cc) || 0;
        const ycc = parseFloat(consumoForm.amarillo_cc) || 0;
        const kcc = parseFloat(consumoForm.negro_cc) || 0;
        const metrosMaterial = parseFloat(consumoForm.metros_material) || 0;
        const tintaTotal = mcc + ccc + ycc + kcc;
        const tintaIdConsumo = consumoForm.tinta_id || tintaActivaTrabajo?.id || '';

        if (m2 < 0 || mcc < 0 || ccc < 0 || ycc < 0 || kcc < 0 || metrosMaterial < 0 || horas < 0) {
          alert('Los valores de consumo no pueden ser negativos.');
          setConsumoLoading(false);
          return;
        }

        // consumo_tinta_pedido exige pedido_id NOT NULL en schema real
        if ((consumoForm.tinta_id || tintaActivaTrabajo?.id) && !consumoTrabajo.pedido_id) {
          alert('Este trabajo no tiene pedido asociado. Asocia un pedido antes de registrar consumo de tinta.');
          setConsumoLoading(false);
          return;
        }

        // Evitar inserciones vacías de consumo
        if ((consumoForm.tinta_id || tintaActivaTrabajo?.id) && tintaTotal <= 0 && !materialSeleccionado && horas <= 0) {
          alert('Seleccionaste set de tinta, pero no registraste consumo.');
          setConsumoLoading(false);
          return;
        }

        // 1. Consumo de tinta
        if (tintaIdConsumo && tintaTotal > 0) {
          const tinta = tintas?.find((t: any) => t.id === tintaIdConsumo);
          if (tinta) {
            await createConsumoTinta.mutateAsync({
              pedido_id: consumoTrabajo.pedido_id,
              trabajo_id: consumoTrabajo.id,
              tinta_id: tintaIdConsumo,
              magenta_consumida: mcc,
              cian_consumida: ccc,
              amarillo_consumida: ycc,
              negro_consumida: kcc,
              metros_cuadrados: m2,
              producto_descripcion: consumoTrabajo.descripcion,
            });

            await updateTintaHook.mutateAsync({
              id: tintaIdConsumo,
              magenta_cantidad: Math.max(0, (tinta.magenta_cantidad || 0) - mcc),
              cian_cantidad: Math.max(0, (tinta.cian_cantidad || 0) - ccc),
              amarillo_cantidad: Math.max(0, (tinta.amarillo_cantidad || 0) - ycc),
              negro_cantidad: Math.max(0, (tinta.negro_cantidad || 0) - kcc),
            });
          }
        }

        // 2. Consumo automático por receta
        const existingMaterialRows = recipeFeaturesEnabled && consumoTrabajo.pedido_id
          ? await supabase
              .from('consumo_materiales')
              .select('id, material_id, cantidad_consumida')
              .eq('pedido_id', consumoTrabajo.pedido_id)
          : { data: [], error: null };

        if (recipeFeaturesEnabled && expectedConsumption.materials.length > 0) {
          for (const row of expectedConsumption.materials) {
            const alreadyRegistered = (existingMaterialRows.data || []).some((entry: any) =>
              entry.material_id === row.material_id &&
              Math.abs((Number(entry.cantidad_consumida) || 0) - row.consumo) < 0.0001
            );
            if (alreadyRegistered || row.consumo <= 0) continue;

            await createConsumoMaterial.mutateAsync({
              pedido_id: consumoTrabajo.pedido_id || null,
              material_id: row.material_id,
              cantidad_consumida: row.consumo,
            });

            const material = materiales?.find((m: any) => m.id === row.material_id);
            if (material) {
              await updateMaterialHook.mutateAsync({
                id: row.material_id,
                largo_restante: Math.max(0, (material.largo_restante || 0) - row.consumo),
              });
            }
          }
        }

        // 3. Consumo manual adicional
        if (materialSeleccionado && metrosMaterial > 0) {
          const material = materiales?.find((m: any) => m.id === consumoForm.material_id);
          const alreadyRegistered = (existingMaterialRows.data || []).some((entry: any) =>
            entry.material_id === consumoForm.material_id &&
            Math.abs((Number(entry.cantidad_consumida) || 0) - metrosMaterial) < 0.0001
          );

          if (!alreadyRegistered && material) {
            await createConsumoMaterial.mutateAsync({
              pedido_id: consumoTrabajo.pedido_id || null,
              material_id: consumoForm.material_id,
              cantidad_consumida: metrosMaterial,
            });

            await updateMaterialHook.mutateAsync({
              id: consumoForm.material_id,
              largo_restante: Math.max(0, (material.largo_restante || 0) - metrosMaterial),
            });
          }
        }

        // 4. Horas de máquina
        if (horas > 0 && consumoTrabajo.maquina_asignada) {
          const maquina = maquinas?.find((m: any) => m.nombre === consumoTrabajo.maquina_asignada);
          if (maquina) {
            await updateMaquinaHook.mutateAsync({
              id: maquina.id,
              horas_uso: (maquina.horas_uso || 0) + horas,
            });
          }
        }
      }

      // 5. Marcar como entregado
      await updateTrabajo.mutateAsync({ id: consumoTrabajo.id, estado: 'entregado' });

      cerrarConsumo();
      alert(soloEntregar ? 'Trabajo marcado como entregado.' : 'Consumo registrado y trabajo entregado.');
    } catch (err) {
      alert('Error: ' + (err as Error).message);
      setConsumoLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.01em', lineHeight: '38px', margin: 0 }}>
            Cola de Producción
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Gestión operativa de trabajos en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex p-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131b2e]">
            {(['tablero', 'lista', 'maquinas'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-[#222a3d] text-[#b4c5ff] shadow font-bold'
                    : 'text-[#94A3B8] hover:text-[#b4c5ff]'
                }`}
              >
                {t === 'tablero' ? 'Tablero' : t === 'lista' ? 'Lista' : 'Máquinas'}
              </button>
            ))}
          </div>
          <Button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            style={{ background: '#2563eb', color: '#fff', fontWeight: 700, borderRadius: '0.25rem' }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Trabajo
          </Button>
        </div>
      </div>

      {/* ─── SEARCH ─── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] h-4 w-4" />
        <input
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#131b2e] border border-[rgba(255,255,255,0.08)] text-[#dae2fd] text-sm placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#b4c5ff]"
          placeholder="Buscar trabajos, clientes o máquinas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ─── FORM ─── */}
      {showForm && (
        <div
          style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '1.5rem' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              {editingId ? 'Editar Trabajo' : 'Nuevo Trabajo'}
            </h3>
            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(false); }} className="text-[#64748B] hover:text-[#b4c5ff] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descripción *</Label>
              <Input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Impresión lona 3×6m, corte vinil..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Pedido asociado</Label>
              <select
                value={form.pedido_id}
                onChange={e => setForm({ ...form, pedido_id: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">Sin pedido</option>
                {pedidos?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion || `Pedido #${p.id?.slice(0, 8)}`} — {p.clientes?.nombre || 'Sin cliente'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Máquina asignada</Label>
              <select
                value={form.maquina_asignada}
                onChange={e => setForm({ ...form, maquina_asignada: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">Sin asignar</option>
                {maquinas?.map(m => (
                  <option key={m.id} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Metros cuadrados</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.metros_cuadrados}
                onChange={e => setForm({ ...form, metros_cuadrados: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fecha estimada de entrega</Label>
              <Input
                type="date"
                value={form.fecha_estimada}
                onChange={e => setForm({ ...form, fecha_estimada: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <select
                value={form.prioridad}
                onChange={e => setForm({ ...form, prioridad: e.target.value })}
                className={SELECT_CLASS}
              >
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {editingId && (
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <select
                  value={form.estado}
                  onChange={e => setForm({ ...form, estado: e.target.value })}
                  className={SELECT_CLASS}
                >
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <Label>Notas</Label>
              <Input
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(false); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTrabajo.isPending || updateTrabajo.isPending}
                style={{ background: '#2563eb', color: '#fff', fontWeight: 700 }}>
                {(createTrabajo.isPending || updateTrabajo.isPending) ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TABLERO (KANBAN) ─── */}
      {tab === 'tablero' && (
        <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(180,197,255,0.1) transparent' }}>
          <div className="flex gap-6" style={{ minWidth: `${ESTADOS.length * 344}px` }}>
            {byEstado.map(col => (
              <div
                key={col.value}
                className="flex flex-col gap-4"
                style={{
                  minWidth: '320px',
                  maxWidth: '320px',
                  padding: '8px',
                  borderRadius: '16px',
                  background: dragOverEstado === col.value ? 'rgba(180,197,255,0.06)' : 'transparent',
                  border: dragOverEstado === col.value ? '1px dashed rgba(180,197,255,0.25)' : '1px solid transparent',
                }}
                onDragOver={e => { e.preventDefault(); setDragOverEstado(col.value); }}
                onDragLeave={() => setDragOverEstado(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverEstado(null);
                  if (!draggingTrabajoId) return;
                  const trabajo = trabajos?.find(t => t.id === draggingTrabajoId);
                  if (trabajo) void moveTrabajoToEstado(trabajo, col.value);
                  setDraggingTrabajoId(null);
                }}
              >

                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {col.label}
                    </span>
                    <span style={{ background: '#171f33', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.125rem', padding: '1px 8px', fontSize: '10px', color: '#94A3B8' }}>
                      {col.items.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-3 min-h-[200px]">
                  {col.items.map(trabajo => {
                    const prioridad = getPrioridad(trabajo.prioridad);
                    const estadoIdx = ESTADOS.findIndex(e => e.value === trabajo.estado);
                    const cliente = trabajo.pedidos?.clientes?.nombre;
                    const pedidoNum = trabajo.pedido_id ? `#${trabajo.pedido_id.slice(0, 8).toUpperCase()}` : null;
                    const isEntregado = trabajo.estado === 'entregado';
                    const isListo = trabajo.estado === 'listo';

                    return (
                      <div
                        key={trabajo.id}
                        className={`p-4 rounded-xl space-y-3 border-l-4 ${col.borderClass} transition-transform hover:scale-[1.01] ${isEntregado ? 'opacity-60' : ''}`}
                        style={{
                          background: 'rgba(30,41,59,0.7)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: `4px solid ${col.color}`,
                        }}
                        draggable={!isEntregado}
                        onDragStart={() => setDraggingTrabajoId(trabajo.id)}
                        onDragEnd={() => setDraggingTrabajoId(null)}
                      >
                        {/* Top row: priority + pedido # */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${prioridad.badgeClass}`}>
                            {prioridad.value === 'urgente' ? '🔴 Urgente' :
                             prioridad.value === 'alta' ? '⚡ Alta' :
                             prioridad.value === 'baja' ? 'Baja' : 'Normal'}
                          </span>
                          {pedidoNum && (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B' }}>
                              {pedidoNum}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className={`font-bold leading-tight ${isEntregado ? 'line-through text-[#64748B]' : 'text-[#b4c5ff]'}`}
                          style={{ fontFamily: 'Geist, sans-serif', fontSize: '15px' }}>
                          {trabajo.descripcion}
                        </h4>

                        {/* Details */}
                        <div className="space-y-1.5">
                          {cliente && (
                            <div className="flex items-center gap-1.5 text-[#94A3B8]">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                              <span style={{ fontSize: '13px' }}>{cliente}</span>
                            </div>
                          )}
                          {trabajo.metros_cuadrados && (
                            <div className="flex items-center gap-1.5 text-[#94A3B8]">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>square_foot</span>
                              <span style={{ fontSize: '13px' }}>{trabajo.metros_cuadrados} m²</span>
                            </div>
                          )}
                          {trabajo.fecha_estimada && (
                            <div className="flex items-center gap-1.5 text-[#94A3B8]">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>event</span>
                              <span style={{ fontSize: '13px' }}>
                                {new Date(trabajo.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom: machine + move + consumo buttons */}
                        <div className="pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center gap-1.5">
                            {trabajo.maquina_asignada ? (
                              <>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#ffb95f' }}>print</span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffb95f', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {trabajo.maquina_asignada}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>Sin máquina</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Registrar consumo — solo en estado "listo" */}
                            {isListo && (
                              <button
                                onClick={() => abrirConsumo(trabajo)}
                                title="Registrar Consumo y Entregar"
                                style={{
                                  width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                  borderRadius: '0.25rem', cursor: 'pointer', color: '#10B981',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)'; }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>inventory_2</span>
                              </button>
                            )}
                            {estadoIdx > 0 && (
                              <button
                                onClick={() => handleQuickMove(trabajo.id, 'prev')}
                                className="w-6 h-6 flex items-center justify-center rounded text-[#64748B] hover:text-[#b4c5ff] hover:bg-[#222a3d] transition-colors"
                                title={`← ${ESTADOS[estadoIdx - 1].label}`}
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {estadoIdx < ESTADOS.length - 1 && (
                              <button
                                onClick={() => handleQuickMove(trabajo.id, 'next')}
                                className="w-6 h-6 flex items-center justify-center rounded text-[#64748B] hover:text-[#b4c5ff] hover:bg-[#222a3d] transition-colors"
                                title={`${ESTADOS[estadoIdx + 1].label} →`}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(trabajo)}
                              className="w-6 h-6 flex items-center justify-center rounded text-[#64748B] hover:text-[#b4c5ff] hover:bg-[#222a3d] transition-colors"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {col.items.length === 0 && (
                    <div className="flex items-center justify-center h-24 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Sin trabajos</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── LISTA ─── */}
      {tab === 'lista' && (
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#64748B]">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>precision_manufacturing</span>
              <p>{search ? 'No se encontraron trabajos' : 'No hay trabajos registrados'}</p>
            </div>
          ) : (
            filtered.map(trabajo => {
              const estado = getEstado(trabajo.estado);
              const prioridad = getPrioridad(trabajo.prioridad);
              const cliente = trabajo.pedidos?.clientes?.nombre;
              return (
                <div
                  key={trabajo.id}
                  className="flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-[#222a3d]"
                  style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${estado.color}` }}
                >
                  {/* Estado dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${estado.dotClass}`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[#F8FAFC] truncate" style={{ fontSize: '14px' }}>
                        {trabajo.descripcion}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${prioridad.badgeClass}`}>
                        {prioridad.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3" style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {cliente && <span>{cliente}</span>}
                      {trabajo.maquina_asignada && (
                        <span className="flex items-center gap-1" style={{ color: '#ffb95f' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>print</span>
                          {trabajo.maquina_asignada}
                        </span>
                      )}
                      {trabajo.metros_cuadrados && <span>{trabajo.metros_cuadrados} m²</span>}
                      {trabajo.fecha_estimada && (
                        <span>{new Date(trabajo.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                      )}
                    </div>
                  </div>

                  {/* Estado badge + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded uppercase ${estado.badgeClass}`}>
                      {estado.label}
                    </span>
                    {trabajo.estado === 'listo' && (
                      <button
                        onClick={() => abrirConsumo(trabajo)}
                        title="Registrar Consumo"
                        style={{
                          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                          borderRadius: '0.25rem', cursor: 'pointer', color: '#10B981',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>inventory_2</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(trabajo)}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#64748B] hover:text-[#b4c5ff] hover:bg-[#222a3d] transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── MÁQUINAS ─── */}
      {tab === 'maquinas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(maquinas || []).length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-[#64748B]">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>print</span>
              <p>No hay máquinas configuradas</p>
            </div>
          ) : (
            (maquinas || []).map(maquina => {
              const activos = trabajos?.filter(t =>
                t.maquina_asignada === maquina.nombre && t.estado !== 'entregado'
              ) || [];
              const enProd = activos.filter(t => t.estado === 'en_proceso');
              const disponible = enProd.length === 0;

              return (
                <div
                  key={maquina.id}
                  className="rounded-xl p-5 space-y-4"
                  style={{
                    background: '#1E293B',
                    border: `1px solid ${disponible ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                    boxShadow: disponible ? '0 0 12px rgba(16,185,129,0.06)' : '0 0 12px rgba(59,130,246,0.08)',
                  }}
                >
                  {/* Machine header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: disponible ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: disponible ? '#10B981' : '#3B82F6' }}>
                          print
                        </span>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>
                          {maquina.nombre}
                        </p>
                        <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>
                          {maquina.tipo || 'Plotter'}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded uppercase"
                      style={{
                        background: disponible ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                        color: disponible ? '#10B981' : '#3B82F6',
                        border: `1px solid ${disponible ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      }}
                    >
                      {disponible ? 'Disponible' : 'En uso'}
                    </span>
                  </div>

                  {/* Job count */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p style={{ fontSize: '24px', fontFamily: 'Geist, sans-serif', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.01em' }}>
                        {activos.length}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748B' }}>trabajo{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
                    </div>
                    {enProd.length > 0 && (
                      <div>
                        <p style={{ fontSize: '24px', fontFamily: 'Geist, sans-serif', fontWeight: 700, color: '#3B82F6' }}>
                          {enProd.length}
                        </p>
                        <p style={{ fontSize: '11px', color: '#64748B' }}>en producción</p>
                      </div>
                    )}
                    {maquina.horas_uso != null && (
                      <div>
                        <p style={{ fontSize: '20px', fontFamily: 'Geist, sans-serif', fontWeight: 700, color: '#ffb95f' }}>
                          {maquina.horas_uso.toLocaleString()}
                        </p>
                        <p style={{ fontSize: '11px', color: '#64748B' }}>horas de uso</p>
                      </div>
                    )}
                  </div>

                  {/* Active jobs list */}
                  {activos.length > 0 && (
                    <div className="space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      {activos.slice(0, 3).map(t => {
                        const est = getEstado(t.estado);
                        return (
                          <div key={t.id} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${est.dotClass}`} />
                            <span className="truncate" style={{ fontSize: '12px', color: '#c3c6d7' }}>{t.descripcion}</span>
                            {t.metros_cuadrados && (
                              <span className="flex-shrink-0" style={{ fontSize: '11px', color: '#64748B' }}>{t.metros_cuadrados}m²</span>
                            )}
                          </div>
                        );
                      })}
                      {activos.length > 3 && (
                        <p style={{ fontSize: '11px', color: '#64748B' }}>+{activos.length - 3} más</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── FOOTER STATS ─── */}
      <div
        className="flex items-center justify-between px-6 py-4 rounded-xl mt-2"
        style={{ background: 'rgba(23,31,51,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-10">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              m² trabajados hoy
            </p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '22px', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.01em' }}>
              {m2Hoy.toFixed(1)}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entregados hoy
            </p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '22px', fontWeight: 700, color: '#10B981', letterSpacing: '-0.01em' }}>
              {entregadosHoy}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              En producción
            </p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '22px', fontWeight: 700, color: '#3B82F6', letterSpacing: '-0.01em' }}>
              {enProduccion}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <span style={{ fontSize: '12px', color: '#64748B' }}>Sistema activo</span>
        </div>
      </div>
    </div>

    {/* ═══ DRAWER: REGISTRAR CONSUMO ═══════════════════════════════════ */}

    {/* Overlay */}
    {consumoTrabajo && (
      <div
        onClick={cerrarConsumo}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11,17,32,0.75)', backdropFilter: 'blur(4px)', zIndex: 60 }}
      />
    )}

    {/* Drawer */}
    <aside style={{
      position: 'fixed', top: 0, right: 0, height: '100vh', width: '480px',
      backgroundColor: '#1E293B', borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 70, display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      transform: consumoTrabajo ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <span style={{
            fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10B981',
            backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px',
            borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem',
          }}>
            Registrar Consumo
          </span>
          <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '17px', fontWeight: 700, color: '#F8FAFC', margin: 0, lineHeight: 1.3 }}>
            {consumoTrabajo?.descripcion}
          </h3>
        {consumoTrabajo?.metros_cuadrados && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
            {consumoTrabajo.metros_cuadrados} m² · {consumoTrabajo.maquina_asignada || 'Sin máquina'}
          </p>
        )}
        {expectedConsumption.hasRecipe && (
          <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '0.375rem', background: 'rgba(180,197,255,0.08)', border: '1px solid rgba(180,197,255,0.18)', color: '#b4c5ff', fontSize: '12px', lineHeight: 1.5 }}>
            Se encontró una receta asociada al pedido. El consumo esperado se cargará como referencia.
          </div>
        )}
      </div>
        <button
          onClick={cerrarConsumo}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '22px', lineHeight: 1, padding: '2px', display: 'flex' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Consumo esperado */}
        {expectedConsumption.hasRecipe && (
          <div style={{ backgroundColor: '#131b2e', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '18px' }}>playlist_add_check</span>
                <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '14px' }}>Consumo esperado por receta</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                {expectedConsumption.totalMaterials} material{expectedConsumption.totalMaterials === 1 ? '' : 'es'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {expectedConsumption.materials.map((row: any) => (
                <div key={row.key || row.material_id} style={{ padding: '10px 12px', background: '#060e20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>{row.material_nombre}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{row.producto_nombre}</div>
                    </div>
                    <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: 700, color: '#b4c5ff', whiteSpace: 'nowrap' }}>
                      {row.consumo.toFixed(2)} {row.unidad}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#94A3B8' }}>
                    <span>{row.tipo_calculo === 'por_unidad' ? 'Por unidad' : 'Por m²'}</span>
                    <span>Disponible: {row.disponible.toFixed(2)} {row.unidad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* m² */}
        <div>
          <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>
            Metros cuadrados impresos
          </label>
          <input
            type="number" step="0.01" min="0"
            value={consumoForm.metros_cuadrados}
            onChange={e => setConsumoForm(f => ({ ...f, metros_cuadrados: e.target.value }))}
            style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Consumo de Tinta */}
        <div style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#e879f9', fontSize: '18px' }}>palette</span>
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '14px' }}>Consumo de Tinta CMYK</span>
          </div>
          <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '0.25rem', border: '1px solid rgba(180,197,255,0.14)', backgroundColor: 'rgba(180,197,255,0.05)', color: '#dae2fd', fontSize: '12px', lineHeight: 1.5 }}>
            {tintaActivaTrabajo ? (
              <>
                El plotter tiene asignada <strong>{tintaActivaTrabajo.marca || 'Sin marca'} · {tintaActivaTrabajo.nombre || 'Sin nombre'}</strong>.
                El descuento se hará contra esa tinta salvo que selecciones otra manualmente.
              </>
            ) : (
              <>
                Este trabajo no tiene una tinta activa asignada al plotter. Selecciona la marca/set manualmente para registrar el consumo.
              </>
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>
              Marca / set de tinta usado
            </label>
            <select
              value={consumoForm.tinta_id}
              onChange={e => setConsumoForm(f => ({ ...f, tinta_id: e.target.value }))}
              style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
            >
              <option value="">Sin tinta (omitir)</option>
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

          {(consumoForm.tinta_id || tintaActivaTrabajo) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {CMYK.map(canal => (
                <div key={canal.key}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: canal.color, display: 'inline-block', flexShrink: 0 }} />
                    {canal.label} (cc)
                  </label>
                  <input
                    type="number" step="0.1" min="0"
                    value={consumoForm[canal.key]}
                    onChange={e => setConsumoForm(f => ({ ...f, [canal.key]: e.target.value }))}
                    style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consumo de Material */}
        <div style={{ backgroundColor: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#b4c5ff', fontSize: '18px' }}>texture</span>
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, color: '#F8FAFC', fontSize: '14px' }}>Consumo de Material</span>
          </div>

          {expectedConsumption.singleMaterial ? (
            <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(180,197,255,0.08)', border: '1px solid rgba(180,197,255,0.18)', borderRadius: '0.375rem', fontSize: '12px', color: '#b4c5ff', lineHeight: 1.5 }}>
              Se preseleccionó <strong>{expectedConsumption.singleMaterial.material_nombre}</strong> con {expectedConsumption.singleMaterial.consumo.toFixed(2)} {expectedConsumption.singleMaterial.unidad} según la receta.
            </div>
          ) : expectedConsumption.hasRecipe ? (
            <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(180,197,255,0.05)', border: '1px solid rgba(180,197,255,0.14)', borderRadius: '0.375rem', fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
              La receta incluye varios materiales. Se descontarán automáticamente al entregar el trabajo.
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>
                Material usado
              </label>
              <select
                value={consumoForm.material_id}
                onChange={e => setConsumoForm(f => ({ ...f, material_id: e.target.value }))}
                style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
              >
                <option value="">Sin material (omitir)</option>
                {(materiales || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.tipo} — {m.largo_restante}m restantes</option>
                ))}
              </select>
            </div>
            {consumoForm.material_id && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>
                  Metros usados
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={consumoForm.metros_material}
                  onChange={e => setConsumoForm(f => ({ ...f, metros_material: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Horas de máquina */}
        {consumoTrabajo?.maquina_asignada && (
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '4px', color: '#ffb95f' }}>timer</span>
              Horas de máquina — {consumoTrabajo.maquina_asignada}
            </label>
            <input
              type="number" step="0.5" min="0"
              value={consumoForm.horas_maquina}
              onChange={e => setConsumoForm(f => ({ ...f, horas_maquina: e.target.value }))}
              placeholder="0"
              style={{ width: '100%', backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.08)', color: '#dae2fd', borderRadius: '0.25rem', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0 }}>
        <button
          onClick={() => handleRegistrarConsumo(false)}
          disabled={consumoLoading || consumoTrabajo?.estado === 'entregado'}
          style={{
            width: '100%', padding: '0.75rem', backgroundColor: '#10B981', border: 'none',
            borderRadius: '0.25rem', color: '#002a20', fontWeight: 700,
            fontFamily: 'Inter, sans-serif', fontSize: '14px', cursor: 'pointer',
            opacity: consumoLoading || consumoTrabajo?.estado === 'entregado' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>inventory_2</span>
          {consumoTrabajo?.estado === 'entregado' ? 'Ya entregado' : consumoLoading ? 'Registrando...' : 'Registrar Consumo y Entregar'}
        </button>
        <button
          onClick={() => handleRegistrarConsumo(true)}
          disabled={consumoLoading || consumoTrabajo?.estado === 'entregado' || !consumoRegistrado}
          style={{
            width: '100%', padding: '0.625rem', backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.25rem',
            color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '13px',
            cursor: 'pointer', opacity: consumoLoading || consumoTrabajo?.estado === 'entregado' || !consumoRegistrado ? 0.7 : 1,
          }}
        >
          {consumoTrabajo?.estado === 'entregado' ? 'Entregado' : !consumoRegistrado ? 'Registra el consumo primero' : 'Solo marcar como Entregado'}
        </button>
        <button
          onClick={cerrarConsumo}
          disabled={consumoLoading}
          style={{
            width: '100%', padding: '0.625rem', backgroundColor: 'transparent',
            border: 'none', color: '#64748B', fontFamily: 'Inter, sans-serif',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </footer>
    </aside>
    </>
  );
}
