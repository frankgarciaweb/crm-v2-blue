import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePedidos,
  useTrabajos,
  useTintas,
  useMateriales,
  useProductos,
  useMaquinas,
} from '@/hooks/useSupabase';
import { useDolar } from '@/hooks/useDolar';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Search,
  Plus,
  ArrowRight,
  Calculator,
  Bell,
  TriangleAlert,
  Package,
  Wrench,
  Clock3,
  Sparkles,
  Box,
  Layers3,
  ReceiptText,
  UserRoundSearch,
  LayoutDashboard,
} from 'lucide-react';

const MARGEN_SEGURIDAD = 0.07;

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'Produccion',
  completado: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#64748B',
  en_proceso: '#3B82F6',
  completado: '#10B981',
  entregado: '#10B981',
  cancelado: '#EF4444',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: '#EF4444',
  alta: '#ffb95f',
  normal: '#3B82F6',
  baja: '#8d90a0',
};

function formatMoney(value: number) {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getPedidoDescripcion(pedido: any) {
  const notas = typeof pedido?.notas === 'string' ? (() => {
    try {
      return JSON.parse(pedido.notas);
    } catch {
      return {};
    }
  })() : (pedido?.notas || {});
  return pedido?.descripcion || notas?.items?.[0]?.producto_nombre || pedido?.producto?.nombre || '—';
}

function getPedidoPrioridad(pedido: any) {
  return (pedido?.prioridad || 'normal').toLowerCase();
}

function getTipoCobro(producto: any) {
  return String(producto?.tipo_cobro || '').toLowerCase();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: pedidos, isLoading: loadingPedidos } = usePedidos();
  const { data: trabajos, isLoading: loadingTrabajos } = useTrabajos();
  const { data: tintas, isLoading: loadingTintas } = useTintas();
  const { data: materiales, isLoading: loadingMateriales } = useMateriales();
  const { data: productos = [] } = useProductos();
  const { data: maquinas = [] } = useMaquinas();
  const { data: dolar } = useDolar();

  const [globalSearch, setGlobalSearch] = useState('');
  const [labelMode, setLabelMode] = useState<'cantidad' | 'metros'>('cantidad');
  const [labelAncho, setLabelAncho] = useState('');
  const [labelAlto, setLabelAlto] = useState('');
  const [labelCantidad, setLabelCantidad] = useState('');
  const [labelMetros, setLabelMetros] = useState('');
  const [labelResult, setLabelResult] = useState<number | null>(null);

  const [priceProductId, setPriceProductId] = useState('');
  const [priceSearch, setPriceSearch] = useState('');
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [priceAncho, setPriceAncho] = useState('');
  const [priceAlto, setPriceAlto] = useState('');
  const [priceCantidad, setPriceCantidad] = useState('1');
  const [, setPriceResult] = useState<number | null>(null);

  if (loadingPedidos || loadingTrabajos || loadingTintas || loadingMateriales) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const pedidosActivos = pedidos?.filter(p => p.estado === 'en_proceso' || p.estado === 'pendiente').length || 0;
  const pedidosHoy = pedidos?.filter(p => new Date(p.created_at) >= inicioDia).length || 0;
  const trabajosUrgentes = trabajos?.filter(t => t.prioridad === 'urgente' && t.estado !== 'entregado').length || 0;
  const bajaMateriales = materiales?.filter(m => m.largo_restante && m.largo_original && (m.largo_restante / m.largo_original) < 0.5) || [];
  const bajaTintas = tintas?.filter(t =>
    (t.magenta_cantidad || 0) < (t.magenta_minimo || 0) ||
    (t.cian_cantidad || 0) < (t.cian_minimo || 0) ||
    (t.amarillo_cantidad || 0) < (t.amarillo_minimo || 0) ||
    (t.negro_cantidad || 0) < (t.negro_minimo || 0)
  ) || [];
  const totalStockBajo = bajaMateriales.length + bajaTintas.length;

  const pedidosRecientes = [...(pedidos || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 7);

  const urgentJobs = [...(trabajos || [])]
    .filter(t => t.prioridad === 'urgente' && t.estado !== 'entregado')
    .slice(0, 5);

  const visiblePriceProducts = (productos || []).filter((p: any) => {
    const q = priceSearch.trim().toLowerCase();
    const tipo = getTipoCobro(p);
    const matchesQuery = !q
      ? true
      : (p.nombre || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        tipo.includes(q);
    return matchesQuery && (tipo === 'mt2' || tipo === 'm2' || tipo === 'unidad');
  });

  const selectedPriceProduct = (productos || []).find((p: any) => p.id === priceProductId);
  const selectedPriceType = getTipoCobro(selectedPriceProduct);
  const selectedPriceUnit = Number(selectedPriceProduct?.precio_m2 || selectedPriceProduct?.precio_por_m2 || 0);
  const selectedPriceCount = Number(priceCantidad || 1);
  const selectedPriceWidth = Number(priceAncho || 0);
  const selectedPriceHeight = Number(priceAlto || 0);
  const selectedPriceArea = selectedPriceWidth > 0 && selectedPriceHeight > 0
    ? (selectedPriceWidth / 100) * (selectedPriceHeight / 100) * selectedPriceCount
    : 0;
  const selectedPriceTotal = (() => {
    const product = selectedPriceProduct as any;
    if (!product) return 0;

    const tipo = getTipoCobro(product);
    const cantidad = Number(priceCantidad || 1);
    const price = Number(product.precio_m2 || product.precio_por_m2 || 0);
    if (!price || cantidad <= 0) return 0;

    if (tipo === 'unidad') {
      return Math.round(cantidad * price * 100) / 100;
    }

    const anchoCm = Number(priceAncho);
    const altoCm = Number(priceAlto);
    if (!anchoCm || !altoCm || anchoCm <= 0 || altoCm <= 0) return 0;

    const anchoM = anchoCm / 100;
    const altoM = altoCm / 100;
    return Math.round(cantidad * anchoM * altoM * price * 100) / 100;
  })();

  function runLabelCalculator() {
    const anchoCm = Number(labelAncho);
    const altoCm = Number(labelAlto);
    if (!anchoCm || !altoCm || anchoCm <= 0 || altoCm <= 0) return;

    const anchoM = anchoCm / 100;
    const altoM = altoCm / 100;

    if (labelMode === 'cantidad') {
      const cantidad = Number(labelCantidad);
      if (!cantidad || cantidad <= 0) return;
      setLabelResult(Math.round(cantidad * anchoM * altoM * (1 + MARGEN_SEGURIDAD) * 100) / 100);
      return;
    }

    const metros = Number(labelMetros);
    if (!metros || metros <= 0) return;
    setLabelResult(Math.floor(metros / (anchoM * altoM * (1 + MARGEN_SEGURIDAD))));
  }

  function runPriceCalculator() {
    const product = selectedPriceProduct as any;
    if (!product) return;
    const tipo = getTipoCobro(product);
    const cantidad = Number(priceCantidad || 1);
    const price = Number(product.precio_m2 || product.precio_por_m2 || 0);
    if (!price || cantidad <= 0) return;

    if (tipo === 'unidad') {
      setPriceResult(Math.round(cantidad * price * 100) / 100);
      return;
    }

    const anchoCm = Number(priceAncho);
    const altoCm = Number(priceAlto);
    if (!anchoCm || !altoCm || anchoCm <= 0 || altoCm <= 0) return;
    const anchoM = anchoCm / 100;
    const altoM = altoCm / 100;
    setPriceResult(Math.round(cantidad * anchoM * altoM * price * 100) / 100);
  }

  function goFromSearch() {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes('pedido')) return navigate('/pedidos');
    if (q.includes('cotiza')) return navigate('/cotizaciones');
    if (q.includes('cliente')) return navigate('/clientes');
    if (q.includes('producto')) return navigate('/productos');
    if (q.includes('invent')) return navigate('/inventario');
    if (q.includes('trabaj')) return navigate('/trabajos');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section
        className="overflow-hidden rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(12,18,31,0.98),rgba(9,13,22,0.95))] shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
      >
        <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between xl:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(180,197,255,0.12)] bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b4c5ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Print quotation workstation
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">
              Cotiza rapido. Responde al cliente en segundos.
            </h1>
            <p className="max-w-2xl text-sm text-[#94A3B8]">
              Calculadora de precio al frente, etiquetas siempre visibles y una vista operativa para produccion, stock y pedidos.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[620px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') goFromSearch();
                }}
                placeholder="Buscar clientes, pedidos, productos..."
                className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] pl-10 text-[#dae2fd] placeholder:text-[#64748B]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[rgba(255,255,255,0.08)] bg-white/5 px-2 py-1 text-[10px] font-semibold text-[#94A3B8]">
                Enter
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/pedidos')} className="gap-2 rounded-[14px] px-4">
                <Plus className="h-4 w-4" />
                Nuevo Pedido
              </Button>
              <Button onClick={() => navigate('/cotizaciones')} variant="outline" className="gap-2 rounded-[14px] px-4">
                <Calculator className="h-4 w-4" />
                Nueva Cotizacion
              </Button>
              <Button onClick={() => navigate('/clientes')} variant="ghost" className="gap-2 rounded-[14px] px-4">
                <UserRoundSearch className="h-4 w-4" />
                Buscar Cliente
              </Button>

              {dolar?.valor ? (
                <div className="ml-auto flex items-center gap-2 rounded-[14px] border border-[rgba(180,197,255,0.10)] bg-white/5 px-3 py-2 text-sm text-[#dae2fd]">
                  <LayoutDashboard className="h-4 w-4 text-[#b4c5ff]" />
                  <span className="text-[#94A3B8]">Tasa BCV</span>
                  <span className="font-semibold text-[#b4c5ff]">
                    {Number(dolar.valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Pedidos activos"
          value={String(pedidosActivos)}
          icon="receipt_long"
          accent="primary"
        />
        <StatCard
          label="Pedidos hoy"
          value={String(pedidosHoy)}
          icon="today"
          accent="production"
        />
        <StatCard
          label="Trabajos urgentes"
          value={String(trabajosUrgentes)}
          icon="priority_high"
          accent={trabajosUrgentes > 0 ? 'alert' : 'secondary'}
        />
        <StatCard
          label="Stock critico"
          value={String(totalStockBajo)}
          icon="warning"
          accent={totalStockBajo > 0 ? 'secondary' : 'primary'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <Card className="overflow-hidden rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#b4c5ff]" />
                  Calculadora de Precio
                </CardTitle>
                <CardDescription>Calcula el precio rapido segun producto, medidas y cantidad.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    value={priceSearch}
                    onChange={e => {
                      const next = e.target.value;
                      setPriceSearch(next);
                      setPriceDropdownOpen(true);
                      if (!next) {
                        setPriceProductId('');
                        setPriceResult(null);
                      }
                    }}
                    onFocus={() => setPriceDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPriceDropdownOpen(false), 150)}
                    placeholder="Buscar producto por nombre o descripcion"
                    className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] pl-10 text-[#dae2fd] placeholder:text-[#64748B]"
                  />
                  {priceDropdownOpen && (
                    <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-[16px] border border-[rgba(180,197,255,0.12)] bg-[#0b1428] shadow-[0_20px_50px_rgba(0,0,0,0.34)]">
                      {visiblePriceProducts.length > 0 ? (
                        visiblePriceProducts.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors last:border-b-0"
                            onMouseDown={() => {
                              setPriceProductId(p.id);
                              setPriceSearch(p.nombre || '');
                              setPriceDropdownOpen(false);
                              setPriceResult(null);
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(180,197,255,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[#f8fafc]">{p.nombre}</span>
                              <span className="block truncate text-xs text-[#94A3B8]">{p.descripcion || 'Sin descripcion'}</span>
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {getTipoCobro(p) === 'unidad' ? '$/unidad' : '$/m²'}
                            </Badge>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-[#94A3B8]">Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>

                {priceProductId && selectedPriceProduct && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {selectedPriceType === 'unidad' ? (
                      <div className="md:col-span-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Cantidad</label>
                          <Input
                            type="number"
                            min="1"
                            value={priceCantidad}
                            onChange={e => setPriceCantidad(e.target.value)}
                            className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={runPriceCalculator} className="h-11 w-full gap-2 rounded-[14px]">
                            <Calculator className="h-4 w-4" />
                            Calcular
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Ancho (cm)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={priceAncho}
                            onChange={e => setPriceAncho(e.target.value)}
                            className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Alto (cm)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={priceAlto}
                            onChange={e => setPriceAlto(e.target.value)}
                            className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Cantidad</label>
                          <Input
                            type="number"
                            min="1"
                            value={priceCantidad}
                            onChange={e => setPriceCantidad(e.target.value)}
                            className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Button onClick={runPriceCalculator} className="h-11 w-full gap-2 rounded-[14px]">
                            <Calculator className="h-4 w-4" />
                            Calcular
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[20px] border border-[rgba(16,185,129,0.16)] bg-[linear-gradient(180deg,rgba(8,21,31,0.98),rgba(8,16,28,0.95))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#4edea3]" />
                  Resultado en vivo
                </CardTitle>
                <CardDescription>Valor inmediato para responder al cliente sin cambiar de pantalla.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[18px] border border-[rgba(16,185,129,0.18)] bg-[rgba(6,18,28,0.92)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Total estimado</p>
                  <div className="mt-2 text-4xl font-semibold tracking-tight text-[#4edea3]">
                    ${formatMoney(selectedPriceTotal)}
                  </div>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    {selectedPriceProduct ? selectedPriceProduct.nombre : 'Selecciona un producto para calcular'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-white/5 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Costo unitario</p>
                    <p className="mt-1 text-lg font-semibold text-[#f8fafc]">${formatMoney(selectedPriceUnit)}</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-white/5 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Tipo</p>
                    <p className="mt-1 text-lg font-semibold text-[#f8fafc]">
                      {selectedPriceType === 'unidad' ? 'Unidad' : 'M2'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-white/5 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Area</p>
                    <p className="mt-1 text-lg font-semibold text-[#f8fafc]">
                      {selectedPriceType === 'unidad' ? `${selectedPriceCount} unid.` : `${formatMoney(selectedPriceArea)} m²`}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-white/5 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Cantidad</p>
                    <p className="mt-1 text-lg font-semibold text-[#f8fafc]">{selectedPriceCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-[#b4c5ff]" />
                  Calculadora de Etiquetas
                </CardTitle>
                <CardDescription>Calcula cuantas etiquetas caben por m² o cuanto material necesitas.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={labelMode === 'cantidad' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setLabelMode('cantidad');
                    setLabelResult(null);
                  }}
                >
                  Por cantidad
                </Button>
                <Button
                  variant={labelMode === 'metros' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setLabelMode('metros');
                    setLabelResult(null);
                  }}
                >
                  Por m²
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Ancho (cm)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={labelAncho}
                    onChange={e => setLabelAncho(e.target.value)}
                    className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Alto (cm)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={labelAlto}
                    onChange={e => setLabelAlto(e.target.value)}
                    className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                  />
                </div>
                {labelMode === 'cantidad' ? (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Cantidad etiquetas</label>
                    <Input
                      type="number"
                      min="1"
                      value={labelCantidad}
                      onChange={e => setLabelCantidad(e.target.value)}
                      className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Metros cuadrados</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={labelMetros}
                      onChange={e => setLabelMetros(e.target.value)}
                      className="h-11 border-[rgba(180,197,255,0.10)] bg-[rgba(9,14,26,0.85)] text-[#dae2fd]"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#94A3B8]">
                  Usa esta herramienta para responder rapido cuantas piezas entran o cuanto material necesitas.
                </p>
                <Button onClick={runLabelCalculator} className="gap-2 rounded-[14px]">
                  <Calculator className="h-4 w-4" />
                  Calcular etiquetas
                </Button>
              </div>

              {labelResult !== null && (
                <div className="grid grid-cols-1 gap-4 rounded-[18px] border border-[rgba(180,197,255,0.14)] bg-[rgba(9,14,26,0.86)] p-4 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                      {labelMode === 'cantidad' ? 'Metros cuadrados necesarios' : 'Etiquetas posibles'}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-[#b4c5ff]">
                      {labelResult}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Ancho x Alto</p>
                    <p className="mt-2 text-lg font-semibold text-[#f8fafc]">
                      {labelAncho || '0'} cm x {labelAlto || '0'} cm
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Margen de seguridad</p>
                    <p className="mt-2 text-lg font-semibold text-[#4edea3]">
                      {(MARGEN_SEGURIDAD * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-[#b4c5ff]" />
                  Pedidos recientes
                </CardTitle>
                <CardDescription>Tabla compacta para revisar lo ultimo que entro al sistema.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/pedidos')} className="gap-2">
                Ver pedidos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-[#0c1424]">
                      {['Cliente', 'Descripcion', 'Estado', 'Prioridad', 'Total', 'Fecha'].map((head) => (
                        <th
                          key={head}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94A3B8]"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosRecientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">
                          No hay pedidos registrados
                        </td>
                      </tr>
                    ) : pedidosRecientes.map((pedido: any, index: number) => {
                      const estado = pedido.estado || 'pendiente';
                      const prioridad = getPedidoPrioridad(pedido);
                      const estadoColor = ESTADO_COLOR[estado] || '#64748B';
                      const prioColor = PRIORIDAD_COLOR[prioridad] || '#3B82F6';
                      return (
                        <tr
                          key={pedido.id}
                          className="border-b border-white/5 transition-colors"
                          style={{ backgroundColor: index % 2 === 0 ? '#0f172a' : '#101a30' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#16233b')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0f172a' : '#101a30')}
                        >
                          <td className="px-4 py-3 text-[#b4c5ff]">#{String(pedido.id || '').slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-3 text-[#dae2fd]">{getPedidoDescripcion(pedido)}</td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: `${estadoColor}1a`,
                                color: estadoColor,
                                border: `1px solid ${estadoColor}33`,
                              }}
                            >
                              {ESTADO_LABEL[estado] || estado}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: prioColor }} />
                              <span className="capitalize text-[#dae2fd]">{prioridad}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#f8fafc]">
                            ${formatMoney(Number(pedido.precio_total || 0))}
                          </td>
                          <td className="px-4 py-3 text-[#94A3B8]">
                            {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-VE') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-[20px] border border-[rgba(255,185,95,0.14)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#ffb95f]" />
                Trabajos urgentes
              </CardTitle>
              <CardDescription>Lo que necesita respuesta inmediata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentJobs.length === 0 ? (
                <div className="rounded-[16px] border border-white/5 bg-white/5 px-3 py-4 text-sm text-[#94A3B8]">
                  No hay trabajos urgentes pendientes.
                </div>
              ) : urgentJobs.map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-[16px] border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f8fafc]">{t.descripcion || 'Sin descripcion'}</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">{t.maquina_asignada || 'Sin maquina asignada'}</p>
                    </div>
                    <Badge variant="destructive">{t.prioridad || 'urgente'}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border border-[rgba(16,185,129,0.14)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#4edea3]" />
                Estado de maquinas
              </CardTitle>
              <CardDescription>Visibilidad rapida del flujo de produccion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {maquinas.length === 0 ? (
                <div className="rounded-[16px] border border-white/5 bg-white/5 px-3 py-4 text-sm text-[#94A3B8]">
                  No hay maquinas registradas.
                </div>
              ) : maquinas.slice(0, 4).map((maquina: any) => {
                const activos = (trabajos || []).filter(
                  t => t.maquina_asignada === maquina.nombre && ['pendiente', 'en_proceso'].includes(t.estado)
                ).length;
                const occupied = activos > 0;
                return (
                  <div key={maquina.id} className="flex items-center justify-between rounded-[16px] border border-white/5 bg-white/5 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${occupied ? 'animate-pulse' : ''}`} style={{ backgroundColor: occupied ? '#3B82F6' : '#10B981' }} />
                      <span className="text-sm text-[#f8fafc]">{maquina.nombre}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#94A3B8]">
                      {occupied ? `${activos} activo${activos > 1 ? 's' : ''}` : 'Libre'}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border border-[rgba(255,185,95,0.14)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-[#ffb95f]" />
                Stock critico
              </CardTitle>
              <CardDescription>Materiales y tintas por debajo del minimo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {totalStockBajo === 0 ? (
                <div className="rounded-[16px] border border-white/5 bg-white/5 px-3 py-4 text-sm text-[#94A3B8]">
                  Todo el stock esta en niveles normales.
                </div>
              ) : (
                <>
                  {bajaTintas.slice(0, 2).map((tinta: any) => {
                    const colores = [
                      { label: 'Magenta', cant: tinta.magenta_cantidad || 0, min: tinta.magenta_minimo || 1 },
                      { label: 'Cian', cant: tinta.cian_cantidad || 0, min: tinta.cian_minimo || 1 },
                      { label: 'Amarillo', cant: tinta.amarillo_cantidad || 0, min: tinta.amarillo_minimo || 1 },
                      { label: 'Negro', cant: tinta.negro_cantidad || 0, min: tinta.negro_minimo || 1 },
                    ].filter(c => c.cant < c.min);
                    return colores.map((c) => {
                      const pct = Math.min(100, Math.round((c.cant / c.min) * 100));
                      return (
                        <div key={`${tinta.id}-${c.label}`} className="space-y-2 rounded-[14px] border border-white/5 bg-white/5 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#f8fafc]">Tinta {c.label}</span>
                            <span className="font-semibold text-[#ffb95f]">{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#171f33]">
                            <div className="h-full bg-[#ffb95f]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })}
                  {bajaMateriales.slice(0, 3).map((m: any) => {
                    const pct = Math.round((m.largo_restante / m.largo_original) * 100);
                    const color = pct < 20 ? '#ffb95f' : '#b4c5ff';
                    return (
                      <div key={m.id} className="space-y-2 rounded-[14px] border border-white/5 bg-white/5 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#f8fafc]">{m.tipo} {m.ancho}cm</span>
                          <span className="font-semibold" style={{ color }}>{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#171f33]">
                          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-[#b4c5ff]" />
                Accesos rapidos
              </CardTitle>
              <CardDescription>Salta directo a la tarea que mas usas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Clientes', icon: <UserRoundSearch className="h-4 w-4" />, path: '/clientes' },
                  { label: 'Productos', icon: <Package className="h-4 w-4" />, path: '/productos' },
                  { label: 'Inventario', icon: <Box className="h-4 w-4" />, path: '/inventario' },
                  { label: 'Pedidos', icon: <ReceiptText className="h-4 w-4" />, path: '/pedidos' },
                  { label: 'Cotizaciones', icon: <Calculator className="h-4 w-4" />, path: '/cotizaciones' },
                  { label: 'Trabajos', icon: <Clock3 className="h-4 w-4" />, path: '/trabajos' },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-white/5 bg-white/5 px-3 py-4 text-[#dae2fd] transition-colors hover:border-[rgba(180,197,255,0.18)] hover:bg-white/8"
                  >
                    <span className="text-[#b4c5ff]">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
