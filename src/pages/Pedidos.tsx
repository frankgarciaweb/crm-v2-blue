import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Calculator,
  CheckCircle,
  Plus,
  CalendarDays,
  User,
  Package,
  Printer,
  Flag,
  Upload,
  Trash2,
  Settings,
  DollarSign,
  FileText,
} from "lucide-react";
import { 
  useClientes, 
  useProductos, 
  useCreateCliente, 
  useCreatePedido,
  type Cliente,
  type Producto
} from '@/hooks/useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import FileUploadNextcloud from '../components/FileUploadNextcloud';
import PedidosPDF from './PedidosPDF';
import { useDolar } from '@/hooks/useDolar';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const initial = value ? parseISO(value) : new Date();
    return startOfMonth(initial);
  });
  const ref = useRef<HTMLDivElement>(null);
  const selectedDate = value ? parseISO(value) : null;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setMonth(startOfMonth(selectedDate));
    }
  }, [value]);

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center gap-2 rounded-[13px] border border-[rgba(180,197,255,0.16)] bg-[rgba(8,17,34,0.78)] px-3 text-left text-sm text-[#dae2fd] shadow-inner transition-colors hover:border-[rgba(180,197,255,0.28)] hover:bg-[rgba(10,20,40,0.86)]"
      >
        <CalendarDays className="h-4 w-4 text-primary/80" />
        <span className={value ? 'text-[#dae2fd]' : 'text-muted-foreground'}>
          {value
            ? format(parseISO(value), 'dd MMM yyyy')
            : 'Haz clic para elegir la fecha'}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[20rem] rounded-[18px] border border-[rgba(180,197,255,0.14)] bg-[#0b1428] p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(prev => subMonths(prev, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#dae2fd] transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="text-sm font-semibold text-[#f8fafc]">
              {format(month, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              onClick={() => setMonth(prev => addMonths(prev, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#dae2fd] transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {weekDays.map(day => <div key={day}>{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const isCurrentMonth = isSameMonth(day, month);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const disabled = day < minDate;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setOpen(false);
                  }}
                  className={[
                    'flex h-10 items-center justify-center rounded-[12px] border text-sm transition-colors',
                    selected
                      ? 'border-[rgba(180,197,255,0.45)] bg-[rgba(37,99,235,0.28)] text-[#f8fafc]'
                      : 'border-transparent bg-white/0 text-[#dae2fd] hover:bg-white/5',
                    isToday(day) ? 'ring-1 ring-[rgba(180,197,255,0.22)]' : '',
                    !isCurrentMonth ? 'opacity-35' : '',
                    disabled ? 'cursor-not-allowed opacity-20 hover:bg-transparent' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductoAutocomplete({
  productos,
  selectedId,
  onSelect,
}: {
  productos: Producto[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = productos.find(producto => producto.id === selectedId);

  useEffect(() => {
    if (selected) {
      setQuery(selected.nombre || '');
    } else if (!open) {
      setQuery('');
    }
  }, [open, selectedId, selected]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const productosFiltrados = normalizedQuery
    ? productos.filter(producto =>
        (producto.nombre || '').toLowerCase().includes(normalizedQuery) ||
        (producto.descripcion || '').toLowerCase().includes(normalizedQuery) ||
        (producto.tipo_cobro || '').toLowerCase().includes(normalizedQuery)
      )
    : productos;

  return (
    <div ref={ref} className="relative">
      <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          if (!nextQuery || (selected && nextQuery !== selected.nombre)) {
            onSelect('');
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar producto por nombre, descripcion o tipo..."
        className="pl-10"
      />

      {open && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-[14px] border border-white/10 bg-[#0b1428]/95 shadow-2xl backdrop-blur">
          {productosFiltrados.length > 0 ? (
            productosFiltrados.map(producto => (
              <button
                key={producto.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                onClick={() => {
                  onSelect(producto.id);
                  setQuery(producto.nombre || '');
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{producto.nombre}</span>
                  {producto.descripcion && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{producto.descripcion}</span>
                  )}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {producto.tipo_cobro === 'unidad'
                    ? `$${producto.precio_por_m2}/unidad`
                    : `$${producto.precio_por_m2}/m2`}
                </Badge>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Pedidos = () => {
  const TIPO_PAGO_ABONO = 'parcial';
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const { data: productos = [], isLoading: loadingProductos } = useProductos();
  const queryClient = useQueryClient();
  const { data: tasas } = useDolar();
  const createCliente = useCreateCliente();
  const createPedido = useCreatePedido();

  const [searchCliente, setSearchCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Array<{
    producto_id: string;
    cantidad: string;
    alto: string;
    ancho: string;
  }>>([]);
  const [formData, setFormData] = useState({
    maquina_usar: "",
    notas: "",
    prioridad: "media" as 'baja' | 'media' | 'alta' | 'urgente',
    archivo_trabajo_url: "",
    medio_pago: "" as 'Efectivo BS' | 'Efectivo $' | 'Pago Móvil' | '',
    referencia_pago: "",
    fecha_limite: "",
    tipo_pago: "contado" as 'contado' | 'parcial' | 'credito',
    abono: "",
    abono_moneda: 'USD' as 'USD' | 'BS',
    dias_credito: ""
  });

  // Nuevo cliente form
  const [nuevoClienteData, setNuevoClienteData] = useState({
    nombre_completo: "",
    cedula_rif: "",
    telefono: "",
    email: "",
    direccion: ""
  });

  const MAQUINA_NO_REQUERIDA = "No requiere máquina";
  const maquinas = [MAQUINA_NO_REQUERIDA, "Roland RS640", "Mimaki TPC1000"];
type PedidoNotaItem = {
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  alto?: number;
  ancho?: number;
  tipo_cobro: 'mt2' | 'unidad';
  metros_cuadrados: number;
  precio_total: number;
};

type PedidoNotasPayload = {
  grupo_pedido_id: string;
  items: PedidoNotaItem[];
  payment: {
    medio_pago: string;
    referencia_pago: string;
    fecha_limite: string;
    abono_moneda?: 'USD' | 'BS';
    abono_original?: number;
    abono_tasa_bs?: number;
  };
  maquina_usar: string;
  notas_libres: string;
  archivo_trabajo_url: string;
};

function buildPedidoNotas(payload: PedidoNotasPayload) {
  return JSON.stringify(payload);
}

  const prioridadConfig = {
    baja: { label: "Baja", color: "text-slate-600", bg: "bg-slate-100" },
    media: { label: "Media", color: "text-blue-600", bg: "bg-blue-100" },
    alta: { label: "Alta", color: "text-orange-600", bg: "bg-orange-100" },
    urgente: { label: "Urgente", color: "text-red-600", bg: "bg-red-100" }
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre_completo.toLowerCase().includes(searchCliente.toLowerCase()) ||
    cliente.cedula_rif.toLowerCase().includes(searchCliente.toLowerCase())
  );

  // Calcular total del pedido
  const calcularTotalPedido = () => {
    return productosSeleccionados.reduce((total, producto) => {
      const productoInfo = productos.find(p => p.id === producto.producto_id);
      if (!productoInfo || !producto.cantidad) return total;
      if (productoInfo.tipo_cobro === 'unidad') {
        return total + (parseInt(producto.cantidad) * productoInfo.precio_por_m2);
      }
      if (producto.alto && producto.ancho) {
        const metrosCuadrados = parseFloat(producto.alto) * parseFloat(producto.ancho) * parseInt(producto.cantidad);
        return total + (metrosCuadrados * productoInfo.precio_por_m2);
      }
      return total;
    }, 0);
  };

  const handleCrearCliente = async () => {
    if (!nuevoClienteData.nombre_completo || !nuevoClienteData.cedula_rif || !nuevoClienteData.telefono) {
      toast({
        title: "Error",
        description: "Complete los campos obligatorios (nombre, cédula/RIF, teléfono)",
        variant: "destructive"
      });
      return;
    }

    try {
      const clienteCreado = await createCliente.mutateAsync(nuevoClienteData);
      setClienteSeleccionado(clienteCreado);
      
      // Reset forms
      setNuevoClienteData({
        nombre_completo: "",
        cedula_rif: "",
        telefono: "",
        email: "",
        direccion: ""
      });
      setMostrarFormularioCliente(false);
      setSearchCliente("");
    } catch (error) {
      console.error('Error creating cliente:', error);
    }
  };

  const handleSubmitPedido = async () => {
    if (!clienteSeleccionado) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive"
      });
      return;
    }

    if (productosSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    if (formData.tipo_pago === TIPO_PAGO_ABONO && !formData.abono) {
      toast({
        title: "Error",
        description: "Ingrese el monto del abono",
        variant: "destructive"
      });
      return;
    }

    const tasaCambioActual = Number(tasas?.valor || 0);
    if (formData.tipo_pago === TIPO_PAGO_ABONO && formData.abono_moneda === 'BS' && !tasaCambioActual) {
      toast({
        title: "Error",
        description: "No se pudo obtener la tasa de cambio para convertir el abono en Bs",
        variant: "destructive"
      });
      return;
    }

    try {
      // ID compartido para agrupar todos los productos de este pedido
      const grupoPedidoId = crypto.randomUUID();

      // Crear pedidos por cada producto seleccionado
      for (const producto of productosSeleccionados) {
        if (!producto.producto_id || !producto.cantidad) {
          continue;
        }

        const productoInfo = productos.find(p => p.id === producto.producto_id);
        if (!productoInfo) continue;

        if (productoInfo.tipo_cobro !== 'unidad' && (!producto.alto || !producto.ancho)) {
          continue;
        }

        const cantidad = parseInt(producto.cantidad);
        let alto: number;
        let ancho: number;
        let metrosCuadrados: number;
        let precioTotal: number;

        if (productoInfo.tipo_cobro === 'unidad') {
          alto = 1;
          ancho = 1;
          metrosCuadrados = cantidad;
          precioTotal = cantidad * productoInfo.precio_por_m2;
        } else {
          alto = parseFloat(producto.alto);
          ancho = parseFloat(producto.ancho);
          metrosCuadrados = alto * ancho * cantidad;
          precioTotal = metrosCuadrados * productoInfo.precio_por_m2;
        }

        const maquinaAsignada = formData.maquina_usar === MAQUINA_NO_REQUERIDA ? '' : formData.maquina_usar;
        const abonoOriginal = parseFloat(formData.abono) || 0;
        const abonoUsd = formData.tipo_pago === TIPO_PAGO_ABONO
          ? (formData.abono_moneda === 'BS'
              ? (abonoOriginal / tasaCambioActual)
              : abonoOriginal)
          : 0;
        const pedidoNotas = buildPedidoNotas({
          grupo_pedido_id: grupoPedidoId,
          items: [{
            producto_id: producto.producto_id,
            producto_nombre: productoInfo.nombre,
            cantidad,
            alto,
            ancho,
            tipo_cobro: productoInfo.tipo_cobro,
            metros_cuadrados: metrosCuadrados,
            precio_total: precioTotal,
          }],
          payment: {
            medio_pago: formData.medio_pago || '',
            referencia_pago: formData.referencia_pago || '',
            fecha_limite: formData.fecha_limite || '',
            abono_moneda: formData.tipo_pago === TIPO_PAGO_ABONO ? formData.abono_moneda : undefined,
            abono_original: formData.tipo_pago === TIPO_PAGO_ABONO ? abonoOriginal : undefined,
            abono_tasa_bs: formData.tipo_pago === TIPO_PAGO_ABONO && formData.abono_moneda === 'BS' ? tasaCambioActual : undefined,
          },
          maquina_usar: formData.maquina_usar,
          notas_libres: formData.notas,
          archivo_trabajo_url: formData.archivo_trabajo_url,
        });

        // Crear el pedido
        const pedidoData = {
          cliente_id: clienteSeleccionado.id,
          producto_id: producto.producto_id,
          alto,
          ancho,
          metros_cuadrados: metrosCuadrados,
          maquina_usar: formData.maquina_usar,
          precio_total: precioTotal,
          notas: pedidoNotas,
          prioridad: formData.prioridad,
          estado: 'pendiente' as const,
          metodo_pago: formData.medio_pago || undefined,
          referencia_pago: formData.referencia_pago || undefined,
          fecha_limite: formData.fecha_limite || undefined,
          tipo_pago: formData.tipo_pago,
          abono: formData.tipo_pago === TIPO_PAGO_ABONO ? abonoUsd : 0,
          dias_credito: formData.tipo_pago === 'credito' ? parseInt(formData.dias_credito) || 0 : 0,
          url_diseno: formData.archivo_trabajo_url || undefined,
        };

        try {
          const pedidoCreado = await createPedido.mutateAsync(pedidoData);

          // Crear trabajo automáticamente al crear el pedido
          const { error: errorTrabajo } = await supabase
            .from('trabajos')
            .insert([{
              pedido_id: pedidoCreado.id,
              descripcion: `${productoInfo.nombre} - ${clienteSeleccionado.nombre_completo}`,
              metros_cuadrados: metrosCuadrados,
              material_tipo: '',
              maquina_asignada: maquinaAsignada,
              prioridad: formData.prioridad,
              estado: 'pendiente',
            }]);

          if (errorTrabajo) {
            console.error('Error al crear trabajo:', errorTrabajo);
          }

          queryClient.invalidateQueries({ queryKey: ['trabajos'] });
        } catch (error) {
          console.error('Error al crear pedido:', error);
          toast({
            title: "Error",
            description: `Error al crear pedido para ${productoInfo.nombre}`,
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Pedidos creados",
        description: `Se crearon ${productosSeleccionados.length} pedidos correctamente`,
      });

      // Reset form
      setFormData({
        maquina_usar: "",
        notas: "",
        prioridad: "media",
        archivo_trabajo_url: "",
        medio_pago: "",
        referencia_pago: "",
        fecha_limite: "",
        tipo_pago: "contado",
        abono: "",
        abono_moneda: 'USD',
        dias_credito: ""
      });
      setProductosSeleccionados([]);
      setClienteSeleccionado(null);
      setSearchCliente("");
    } catch (error) {
      console.error('Error creating pedido:', error);
      toast({
        title: "Error",
        description: "Error al crear el pedido",
        variant: "destructive"
      });
    }
  };

  const [modalCargaAbierto, setModalCargaAbierto] = useState(false);
  const [urlRecienSubida, setUrlRecienSubida] = useState<string | null>(null);
  const [vistaPedidos, setVistaPedidos] = useState<'crear' | 'pedidos'>('crear');

  useEffect(() => {
    if (urlRecienSubida) {
      setFormData(prev => ({ ...prev, archivo_trabajo_url: urlRecienSubida }));
      setModalCargaAbierto(false);
      setUrlRecienSubida(null);
    }
  }, [urlRecienSubida]);

  if (vistaPedidos === 'pedidos') {
    return (
      <div className="pedidos-premium space-y-7 animate-fade-in rounded-[22px] p-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#f8fafc]">Pedidos</h1>
            <p className="text-muted-foreground">Revisa, genera y descarga los comprobantes de pedido desde aquí mismo.</p>
          </div>
          <div className="inline-flex rounded-[16px] border border-[rgba(180,197,255,0.16)] bg-[rgba(8,17,34,0.76)] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVistaPedidos('crear')}
              className="h-10 gap-2 rounded-[12px] px-4 text-sm font-semibold text-[#dae2fd] hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              Crear pedido
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-2 rounded-[12px] px-4 text-sm font-semibold"
            >
              <FileText className="h-4 w-4" />
              Pedidos
            </Button>
          </div>
        </div>

        <PedidosPDF embedded />
      </div>
    );
  }

  if (loadingClientes || loadingProductos) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="mt-1 text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="pedidos-premium space-y-7 animate-fade-in rounded-[22px] p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-[#f8fafc]">Crear Nuevo Pedido</h1>
          <p className="text-muted-foreground">
            Interfaz tipo punto de venta para registrar pedidos de impresión
          </p>
        </div>
        <div className="inline-flex rounded-[16px] border border-[rgba(180,197,255,0.16)] bg-[rgba(8,17,34,0.76)] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
          <Button
            type="button"
            variant="secondary"
            className="h-10 gap-2 rounded-[12px] px-4 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Crear pedido
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setVistaPedidos('pedidos')}
            className="h-10 gap-2 rounded-[12px] px-4 text-sm font-semibold text-[#dae2fd] hover:bg-white/5"
          >
            <FileText className="h-4 w-4" />
            Pedidos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Panel Principal - Formulario del Pedido */}
        <div className="lg:col-span-2 space-y-7">
          {/* Selección de Cliente */}
          <Card className="card-hover pedidos-card">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <User className="w-5 h-5 text-primary" />
                Seleccionar Cliente
              </CardTitle>
              <CardDescription>
                Busque el cliente por nombre o cédula/RIF
              </CardDescription>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-5">
              {!mostrarFormularioCliente ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar cliente por nombre o cédula..."
                      value={searchCliente}
                      onChange={(e) => setSearchCliente(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {clienteSeleccionado ? (
                    <div className="pedidos-selected-client p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-primary">{clienteSeleccionado.nombre_completo}</h3>
                          <p className="text-sm text-muted-foreground">{clienteSeleccionado.cedula_rif}</p>
                          <p className="text-sm text-muted-foreground">{clienteSeleccionado.telefono}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setClienteSeleccionado(null);
                            setSearchCliente("");
                          }}
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  ) : searchCliente && (
                    <div className="space-y-2">
                      {clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map(cliente => (
                          <div
                            key={cliente.id}
                            className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setClienteSeleccionado(cliente);
                              setSearchCliente("");
                            }}
                          >
                            <div className="font-medium">{cliente.nombre_completo}</div>
                            <div className="text-sm text-muted-foreground">{cliente.cedula_rif} • {cliente.telefono}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-muted-foreground">No se encontró el cliente</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMostrarFormularioCliente(true)}
                            className="text-primary border-primary hover:bg-primary/10"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Cliente Nuevo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                
                <div className="pedidos-field-panel space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Crear Nuevo Cliente</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setMostrarFormularioCliente(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre Completo *</Label>
                      <Input
                        value={nuevoClienteData.nombre_completo}
                        onChange={(e) => setNuevoClienteData(prev => ({ ...prev, nombre_completo: e.target.value }))}
                        placeholder="Nombre completo"
                      />
                    </div>
                    
                    <div>
                      <Label>Cédula/RIF *</Label>
                      <Input
                        value={nuevoClienteData.cedula_rif}
                        onChange={(e) => setNuevoClienteData(prev => ({ ...prev, cedula_rif: e.target.value }))}
                        placeholder="V-12345678 / J-12345678"
                      />
                    </div>
                    
                    <div>
                      <Label>Teléfono *</Label>
                      <Input
                        value={nuevoClienteData.telefono}
                        onChange={(e) => setNuevoClienteData(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+58 412-1234567"
                      />
                    </div>
                    
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={nuevoClienteData.email}
                        onChange={(e) => setNuevoClienteData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="cliente@email.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={nuevoClienteData.direccion}
                      onChange={(e) => setNuevoClienteData(prev => ({ ...prev, direccion: e.target.value }))}
                      placeholder="Dirección completa"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCrearCliente}
                    disabled={createCliente.isPending}
                    className="w-full blue-gradient text-white"
                  >
                    {createCliente.isPending ? "Creando..." : "Crear Cliente"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalles del Pedido */}
          <Card className="card-hover pedidos-card">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Package className="w-5 h-5 text-primary" />
                Productos del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-5">
              {/* Lista de productos seleccionados */}
              {productosSeleccionados.map((producto, index) => {
                const productoInfo = productos.find(p => p.id === producto.producto_id);
                return (
                  <div key={index} className="pedidos-product-row p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{productoInfo?.nombre || 'Producto'}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setProductosSeleccionados(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {/* Selector de Producto */}
                    <div className="mb-3">
                      <Label>Producto *</Label>
                      <ProductoAutocomplete
                        productos={productos}
                        selectedId={producto.producto_id}
                        onSelect={(value) => {
                          const newProductos = [...productosSeleccionados];
                          newProductos[index].producto_id = value;
                          setProductosSeleccionados(newProductos);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={producto.cantidad}
                          onChange={(e) => {
                            const newProductos = [...productosSeleccionados];
                            newProductos[index].cantidad = e.target.value;
                            setProductosSeleccionados(newProductos);
                          }}
                        />
                      </div>
                      {/* Mostrar alto y ancho solo si el producto es por mt2 */}
                      {productoInfo?.tipo_cobro !== 'unidad' && (
                        <>
                          <div>
                            <Label>Alto (m)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={producto.alto}
                              onChange={(e) => {
                                const newProductos = [...productosSeleccionados];
                                newProductos[index].alto = e.target.value;
                                setProductosSeleccionados(newProductos);
                              }}
                            />
                          </div>
                          <div>
                            <Label>Ancho (m)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={producto.ancho}
                              onChange={(e) => {
                                const newProductos = [...productosSeleccionados];
                                newProductos[index].ancho = e.target.value;
                                setProductosSeleccionados(newProductos);
                              }}
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <Label>{productoInfo?.tipo_cobro === 'unidad' ? 'Total Unidades' : 'Total m²'}</Label>
                        <div className="pedidos-field-panel px-3 py-2 text-sm font-semibold text-primary">
                          {productoInfo?.tipo_cobro === 'unidad'
                            ? (parseInt(producto.cantidad) || 0)
                            : (producto.cantidad && producto.alto && producto.ancho 
                                ? (parseFloat(producto.alto) * parseFloat(producto.ancho) * parseInt(producto.cantidad)).toFixed(2)
                                : '0.00')
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Botón para agregar producto */}
              <Button
                variant="outline"
                onClick={() => setProductosSeleccionados(prev => [...prev, {
                  producto_id: "",
                  cantidad: "1",
                  alto: "",
                  ancho: "",
                }])}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </CardContent>
          </Card>

          {/* Configuración del Pedido */}
          <Card className="card-hover pedidos-card">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Settings className="w-5 h-5 text-primary" />
                Configuración del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prioridad">Prioridad *</Label>
                  <Select value={formData.prioridad} onValueChange={value => setFormData(prev => ({ ...prev, prioridad: value as any }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha_limite">Fecha de Entrega</Label>
                  <DatePicker
                    value={formData.fecha_limite}
                    onChange={(value) => setFormData(prev => ({ ...prev, fecha_limite: value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maquina_usar">Produccion</Label>
                  <Select value={formData.maquina_usar} onValueChange={(value) => setFormData(prev => ({ ...prev, maquina_usar: value }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar maquina o fisico" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas.map(maquina => (
                        <SelectItem key={maquina} value={maquina}>
                          <div className="flex items-center gap-2">
                            {maquina === MAQUINA_NO_REQUERIDA ? (
                              <Package className="w-4 h-4" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                            {maquina}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas del Pedido</Label>
                <Textarea
                  id="notas"
                  placeholder="Instrucciones especiales, acabados, etc."
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="mb-4 flex items-end gap-2">
                <div style={{ flex: 1 }}>
                  <Label htmlFor="archivo_trabajo_url">URL pública del archivo</Label>
                  <Input
                    id="archivo_trabajo_url"
                    type="url"
                    placeholder="Pega aquí la URL pública generada o usa el botón de carga"
                    value={formData.archivo_trabajo_url}
                    onChange={e => setFormData(prev => ({ ...prev, archivo_trabajo_url: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => setModalCargaAbierto(true)} style={{ height: 38 }}>
                  <Upload className="w-4 h-4 mr-1" /> Cargar diseño
                </Button>
              </div>
              {modalCargaAbierto && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.45)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ background: '#1d2734', borderRadius: 10, padding: 32, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #0008', position: 'relative' }}>
                    <button onClick={() => setModalCargaAbierto(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>&times;</button>
                    <FileUploadNextcloud folder="pedidos/disenos" onUploadSuccess={url => setUrlRecienSubida(url.publicUrl)} />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Pago del Pedido */}
          <Card className="card-hover pedidos-card">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <DollarSign className="w-5 h-5 text-primary" />
                Pago del Pedido
              </CardTitle>
              <CardDescription>
                Forma de pago, abonos y credito del cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-5">
              {/* Medio de Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medio_pago" className="flex items-center gap-1 text-xs">
                    <DollarSign className="w-4 h-4 text-primary" /> Medio de Pago *
                  </Label>
                  <Select 
                    value={formData.medio_pago} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, medio_pago: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo BS">Efectivo BS</SelectItem>
                      <SelectItem value="Efectivo $">Efectivo $</SelectItem>
                      <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.medio_pago === "Pago Móvil" && (
                  <div className="space-y-2">
                    <Label htmlFor="referencia_pago">Referencia de Pago *</Label>
                    <Input
                      id="referencia_pago"
                      placeholder="Número de referencia"
                      value={formData.referencia_pago}
                      onChange={(e) => setFormData(prev => ({ ...prev, referencia_pago: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_pago">Condicion de pago</Label>
                  <Select
                    value={formData.tipo_pago}
                    onValueChange={(value: any) => setFormData(prev => ({
                      ...prev,
                      tipo_pago: value,
                      abono: value === TIPO_PAGO_ABONO ? prev.abono : '',
                      abono_moneda: value === TIPO_PAGO_ABONO ? prev.abono_moneda : 'USD',
                      dias_credito: value === 'credito' ? prev.dias_credito : '',
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar condicion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Contado</SelectItem>
                      <SelectItem value={TIPO_PAGO_ABONO}>Con abono</SelectItem>
                      <SelectItem value="credito">Credito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_pago === TIPO_PAGO_ABONO && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="abono">Monto abonado</Label>
                      <Input
                        id="abono"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.abono}
                        onChange={(e) => setFormData(prev => ({ ...prev, abono: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="abono_moneda">Moneda del abono</Label>
                      <Select
                        value={formData.abono_moneda}
                        onValueChange={(value: 'USD' | 'BS') => setFormData(prev => ({ ...prev, abono_moneda: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="BS">Bs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {formData.tipo_pago === 'credito' && (
                  <div className="space-y-2">
                    <Label htmlFor="dias_credito">Dias de credito</Label>
                    <Input
                      id="dias_credito"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej: 15"
                      value={formData.dias_credito}
                      onChange={(e) => setFormData(prev => ({ ...prev, dias_credito: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

              
          </div>

        {/* Panel Lateral - Resumen y Cálculos */}
        <div className="space-y-7">
          {/* Calculadora de Precio */}
          <Card className="card-hover pedidos-card pedidos-summary-card sticky top-20">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Calculator className="w-5 h-5 text-primary" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-5">
              {productosSeleccionados.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Productos:</span>
                    <span className="text-sm font-medium">{productosSeleccionados.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Prioridad:</span>
                    <span className="px-2 py-1 rounded bg-orange-600 text-white text-xs font-semibold flex items-center gap-1">
                      <Flag className="w-3 h-3 mr-1" />
                      {prioridadConfig[formData.prioridad].label}
                    </span>
                  </div>
                  
                  {formData.archivo_trabajo_url && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Archivo:</span>
                      <span className="px-2 py-1 rounded bg-green-700 text-white text-xs font-semibold flex items-center gap-1">
                        <Upload className="w-3 h-3 mr-1" /> Subido
                      </span>
                    </div>
                  )}
                  
                  {formData.medio_pago && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pago:</span>
                      <span className="px-2 py-1 rounded bg-blue-700 text-white text-xs font-semibold flex items-center gap-1">
                        {formData.medio_pago}
                        {formData.medio_pago === "Pago Móvil" && formData.referencia_pago && (
                          <span className="ml-1 text-xs">({formData.referencia_pago})</span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total USD:</span>
                      <span className="text-lg font-bold text-primary">
                        ${calcularTotalPedido().toFixed(2)}
                      </span>
                    </div>
                    {tasas && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Bs:</span>
                        <span className="text-base font-semibold text-amber-500">
                          {(calcularTotalPedido() * tasas.valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Agregue productos para ver el precio</p>
                </div>
              )}

              <Button
                onClick={handleSubmitPedido}
                disabled={
                  !clienteSeleccionado || 
                  productosSeleccionados.length === 0 || 
                  !formData.medio_pago ||
                  (formData.medio_pago === "Pago Móvil" && !formData.referencia_pago) ||
                  (formData.tipo_pago === TIPO_PAGO_ABONO && !formData.abono) ||
                  (formData.tipo_pago === TIPO_PAGO_ABONO && formData.abono_moneda === 'BS' && !Number(tasas?.valor || 0)) ||
                  (formData.tipo_pago === 'credito' && !formData.dias_credito) ||
                  createPedido.isPending
                }
                className="w-full blue-gradient text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {createPedido.isPending ? "Creando..." : "Confirmar Pedido"}
              </Button>
            </CardContent>
          </Card>

          {/* Estado del Sistema */}
          <Card className="card-hover pedidos-card">
            <CardHeader className="pedidos-card-header">
              <CardTitle className="text-sm">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="pedidos-card-content space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Roland RS640:</span>
                <Badge variant="default">Disponible</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mimaki TPC1000:</span>
                <Badge variant="secondary">En uso</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Productos:</span>
                <Badge variant="outline">{productos.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Pedidos;
