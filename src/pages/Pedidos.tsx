import { useState } from "react";
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
  User,
  Package,
  Printer,
  Flag,
  Upload,
  Trash2,
  Settings,
  Droplets,
  DollarSign
} from "lucide-react";
import { 
  useClientes, 
  useProductos, 
  useMateriales,
  useTintas,
  useCreateCliente, 
  useCreatePedido,
  type Cliente 
} from '@/hooks/useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import FileUploadNextcloud from '../components/FileUploadNextcloud';
import { useEffect } from 'react';
import { useDolar } from '@/hooks/useDolar';

const Pedidos = () => {
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const { data: productos = [], isLoading: loadingProductos } = useProductos();
  const { data: materiales = [], isLoading: loadingMateriales } = useMateriales();
  const queryClient = useQueryClient();
  const { data: tintas = [], isLoading: loadingTintas } = useTintas();
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
    material_id?: string;
  }>>([]);
  const [consumoTinta, setConsumoTinta] = useState({
    magenta: "",
    cian: "",
    amarillo: "",
    negro: "",
    tipo_tinta_id: ""
  });
  const [formData, setFormData] = useState({
    maquina_usar: "",
    notas: "",
    prioridad: "media" as 'baja' | 'media' | 'alta' | 'urgente',
    archivo_trabajo_url: "",
    medio_pago: "" as 'Efectivo BS' | 'Efectivo $' | 'Pago Móvil' | '',
    referencia_pago: "",
    fecha_limite: ""
  });

  // Nuevo cliente form
  const [nuevoClienteData, setNuevoClienteData] = useState({
    nombre_completo: "",
    cedula_rif: "",
    telefono: "",
    email: "",
    direccion: ""
  });

  const maquinas = ["Roland RS640", "Mimaki TPC1000"];
type PedidoNotaItem = {
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  alto?: number;
  ancho?: number;
  material_id?: string | null;
  material_nombre?: string | null;
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

  const validarStock = () => {
    // Validar stock de materiales
    const materialesInsuficientes = [];
    
    // Validar stock de tintas si se especificó consumo
    if (consumoTinta.tipo_tinta_id) {
      const tintaSeleccionada = tintas.find(t => t.id === consumoTinta.tipo_tinta_id);
      if (tintaSeleccionada) {
        const magentaNecesaria = parseFloat(consumoTinta.magenta) || 0;
        const cianNecesaria = parseFloat(consumoTinta.cian) || 0;
        const amarilloNecesaria = parseFloat(consumoTinta.amarillo) || 0;
        const negroNecesaria = parseFloat(consumoTinta.negro) || 0;

        if (tintaSeleccionada.magenta_cantidad < magentaNecesaria) {
          materialesInsuficientes.push(`MAGENTA (disponible: ${tintaSeleccionada.magenta_cantidad}cc, necesario: ${magentaNecesaria}cc)`);
        }
        if (tintaSeleccionada.cian_cantidad < cianNecesaria) {
          materialesInsuficientes.push(`CIAN (disponible: ${tintaSeleccionada.cian_cantidad}cc, necesario: ${cianNecesaria}cc)`);
        }
        if (tintaSeleccionada.amarillo_cantidad < amarilloNecesaria) {
          materialesInsuficientes.push(`AMARILLO (disponible: ${tintaSeleccionada.amarillo_cantidad}cc, necesario: ${amarilloNecesaria}cc)`);
        }
        if (tintaSeleccionada.negro_cantidad < negroNecesaria) {
          materialesInsuficientes.push(`NEGRO (disponible: ${tintaSeleccionada.negro_cantidad}cc, necesario: ${negroNecesaria}cc)`);
        }
      }
    }

    return {
      valido: materialesInsuficientes.length === 0,
      materialesInsuficientes
    };
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

    // Validar stock antes de proceder
    const validacionStock = validarStock();
    if (!validacionStock.valido) {
      toast({
        title: "Stock Insuficiente",
        description: `Los siguientes materiales no tienen stock suficiente: ${validacionStock.materialesInsuficientes.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Descontar tinta automáticamente si se especificó consumo
      if (consumoTinta.tipo_tinta_id && (consumoTinta.magenta || consumoTinta.cian || consumoTinta.amarillo || consumoTinta.negro)) {
        const tintaSeleccionada = tintas.find(t => t.id === consumoTinta.tipo_tinta_id);
        
        if (tintaSeleccionada) {
          // Calcular nuevos valores de tinta
          const nuevaMagenta = tintaSeleccionada.magenta_cantidad - (parseFloat(consumoTinta.magenta) || 0);
          const nuevaCian = tintaSeleccionada.cian_cantidad - (parseFloat(consumoTinta.cian) || 0);
          const nuevaAmarillo = tintaSeleccionada.amarillo_cantidad - (parseFloat(consumoTinta.amarillo) || 0);
          const nuevaNegro = tintaSeleccionada.negro_cantidad - (parseFloat(consumoTinta.negro) || 0);

          // Verificar stock mínimo
          const alertasStock = [];
          if (nuevaMagenta < tintaSeleccionada.magenta_minimo) alertasStock.push("MAGENTA");
          if (nuevaCian < tintaSeleccionada.cian_minimo) alertasStock.push("CIAN");
          if (nuevaAmarillo < tintaSeleccionada.amarillo_minimo) alertasStock.push("AMARILLO");
          if (nuevaNegro < tintaSeleccionada.negro_minimo) alertasStock.push("NEGRO");

          // Actualizar tinta en la base de datos
          const { error: errorTinta } = await supabase
            .from('tintas')
            .update({
              magenta_cantidad: nuevaMagenta,
              cian_cantidad: nuevaCian,
              amarillo_cantidad: nuevaAmarillo,
              negro_cantidad: nuevaNegro
            })
            .eq('id', tintaSeleccionada.id);

          if (errorTinta) {
            console.error('Error al actualizar tinta:', errorTinta);
            toast({
              title: "Error",
              description: "Error al actualizar el inventario de tinta",
              variant: "destructive"
            });
            return;
          }

          // Forzar recarga del inventario
          queryClient.invalidateQueries({ queryKey: ['materiales'] });
          queryClient.invalidateQueries({ queryKey: ['tintas'] });

          // Mostrar alertas de stock bajo
          if (alertasStock.length > 0) {
            toast({
              title: "⚠️ Stock Bajo",
              description: `Los siguientes colores están bajo el stock mínimo: ${alertasStock.join(', ')}`,
              variant: "destructive"
            });
          }

          toast({
            title: "Tinta actualizada",
            description: `Se descontaron ${consumoTinta.magenta || 0}cc MAGENTA, ${consumoTinta.cian || 0}cc CIAN, ${consumoTinta.amarillo || 0}cc AMARILLO, ${consumoTinta.negro || 0}cc NEGRO`,
          });
        }
      }
      
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

        const materialInfo = producto.material_id ? materiales.find(m => m.id === producto.material_id) : null;
        const pedidoNotas = buildPedidoNotas({
          grupo_pedido_id: grupoPedidoId,
          items: [{
            producto_id: producto.producto_id,
            producto_nombre: productoInfo.nombre,
            cantidad,
            alto,
            ancho,
            material_id: producto.material_id || null,
            material_nombre: materialInfo?.tipo || null,
            tipo_cobro: productoInfo.tipo_cobro,
            metros_cuadrados: metrosCuadrados,
            precio_total: precioTotal,
          }],
          payment: {
            medio_pago: formData.medio_pago || '',
            referencia_pago: formData.referencia_pago || '',
            fecha_limite: formData.fecha_limite || '',
          },
          maquina_usar: formData.maquina_usar,
          notas_libres: formData.notas,
          archivo_trabajo_url: formData.archivo_trabajo_url,
        });

        // Crear el pedido
        const pedidoData = {
          cliente_id: clienteSeleccionado.id,
          descripcion: `${productoInfo.nombre} - ${clienteSeleccionado.nombre_completo}`,
          precio_total: precioTotal,
          notas: pedidoNotas,
          prioridad: formData.prioridad,
          estado: 'pendiente' as const,
          metodo_pago: formData.medio_pago || undefined,
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
              material_tipo: materialInfo?.tipo || '',
              maquina_asignada: formData.maquina_usar,
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
        fecha_limite: ""
      });
      setProductosSeleccionados([]);
      setConsumoTinta({
        magenta: "",
        cian: "",
        amarillo: "",
        negro: "",
        tipo_tinta_id: ""
      });
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

  useEffect(() => {
    if (urlRecienSubida) {
      setFormData(prev => ({ ...prev, archivo_trabajo_url: urlRecienSubida }));
      setModalCargaAbierto(false);
      setUrlRecienSubida(null);
    }
  }, [urlRecienSubida]);

  if (loadingClientes || loadingProductos || loadingMateriales || loadingTintas) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Crear Nuevo Pedido</h1>
          <p className="text-muted-foreground">
            Interfaz tipo punto de venta para registrar pedidos de impresión
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Principal - Formulario del Pedido */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selección de Cliente */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <User className="w-5 h-5 text-primary" />
                Seleccionar Cliente
              </CardTitle>
              <CardDescription>
                Busque el cliente por nombre o cédula/RIF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
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
                
                <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
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
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Package className="w-5 h-5 text-primary" />
                Productos del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de productos seleccionados */}
              {productosSeleccionados.map((producto, index) => {
                const productoInfo = productos.find(p => p.id === producto.producto_id);
                return (
                  <div key={index} className="p-4 border rounded-lg">
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
                      <Select
                        value={producto.producto_id}
                        onValueChange={(value) => {
                          const newProductos = [...productosSeleccionados];
                          newProductos[index].producto_id = value;
                          setProductosSeleccionados(newProductos);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map(productoItem => (
                            <SelectItem key={productoItem.id} value={productoItem.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{productoItem.nombre}</span>
                                <Badge variant="outline" className="ml-2">
                                  {productoItem.tipo_cobro === 'unidad' ? `$${productoItem.precio_por_m2}/unidad` : `$${productoItem.precio_por_m2}/m²`}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Selector de Material */}
                    <div className="mb-3">
                      <Label>Material (Opcional - para descuento automático)</Label>
                      <Select
                        value={producto.material_id || "none"}
                        onValueChange={(value) => {
                          const newProductos = [...productosSeleccionados];
                          newProductos[index].material_id = value === "none" ? undefined : value;
                          setProductosSeleccionados(newProductos);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin material específico</SelectItem>
                          {materiales
                            .filter(material => material.stock > 0)
                            .map(material => (
                              <SelectItem key={material.id} value={material.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{material.tipo} ({material.ancho}m)</span>
                                  <Badge variant="outline" className="ml-2">
                                    {material.stock.toFixed(2)}m² disponible
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                        <div className="p-2 bg-muted rounded">
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
                  material_id: undefined
                }])}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </CardContent>
          </Card>

          {/* Consumo de Tinta */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Droplets className="w-5 h-5 text-primary" />
                Consumo de Tinta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-1 items-end">
                {/* Magenta */}
                <div className="flex flex-col items-start flex-1 min-w-0 md:w-auto">
                  <Label className="text-xs mb-1">MAGENTA (CC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-28 h-8 text-xs px-1"
                    value={consumoTinta.magenta}
                    onChange={(e) => setConsumoTinta(prev => ({ ...prev, magenta: e.target.value }))}
                  />
                </div>
                {/* Cian */}
                <div className="flex flex-col items-start flex-1 min-w-0 md:w-auto">
                  <Label className="text-xs mb-1">CIAN (CC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-28 h-8 text-xs px-1"
                    value={consumoTinta.cian}
                    onChange={(e) => setConsumoTinta(prev => ({ ...prev, cian: e.target.value }))}
                  />
                </div>
                {/* Amarillo */}
                <div className="flex flex-col items-start flex-1 min-w-0 md:w-auto">
                  <Label className="text-xs mb-1">AMARILLO (CC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-28 h-8 text-xs px-1"
                    value={consumoTinta.amarillo}
                    onChange={(e) => setConsumoTinta(prev => ({ ...prev, amarillo: e.target.value }))}
                  />
                </div>
                {/* Negro */}
                <div className="flex flex-col items-start flex-1 min-w-0 md:w-auto">
                  <Label className="text-xs mb-1">NEGRO (CC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-28 h-8 text-xs px-1"
                    value={consumoTinta.negro}
                    onChange={(e) => setConsumoTinta(prev => ({ ...prev, negro: e.target.value }))}
                  />
                </div>
                {/* Select de tinta a descontar */}
                <div className="flex flex-col items-start flex-[1.5] min-w-[140px] md:min-w-[200px]">
                  <Label className="text-xs mb-1">Tinta a descontar</Label>
                  <Select
                    value={consumoTinta.tipo_tinta_id}
                    onValueChange={(value) => setConsumoTinta(prev => ({ ...prev, tipo_tinta_id: value }))}
                  >
                    <SelectTrigger className="h-8 text-xs px-1 w-full">
                      <SelectValue placeholder="Tinta" />
                    </SelectTrigger>
                    <SelectContent>
                      {tintas.map(tinta => (
                        <SelectItem key={tinta.id} value={tinta.id} className="text-xs">
                          {tinta.nombre} ({tinta.maquina})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración del Pedido */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Settings className="w-5 h-5 text-primary" />
                Configuración del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Input
                    type="date"
                    id="fecha_limite"
                    value={formData.fecha_limite}
                    onChange={e => setFormData(prev => ({ ...prev, fecha_limite: e.target.value }))}
                    className="w-full h-10"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="maquina_usar">Máquina a Usar</Label>
                  <Select value={formData.maquina_usar} onValueChange={(value) => setFormData(prev => ({ ...prev, maquina_usar: value }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas.map(maquina => (
                        <SelectItem key={maquina} value={maquina}>
                          <div className="flex items-center gap-2">
                            <Printer className="w-4 h-4" />
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
                  <Label htmlFor="archivo_trabajo_url">URL pública del archivo (Nextcloud)</Label>
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
                    <FileUploadNextcloud onUploadSuccess={url => setUrlRecienSubida(url.publicUrl)} />
                  </div>
                </div>
              )}

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
            </CardContent>
          </Card>

              
          </div>

        {/* Panel Lateral - Resumen y Cálculos */}
        <div className="space-y-6">
          {/* Calculadora de Precio */}
          <Card className="card-hover sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <Calculator className="w-5 h-5 text-primary" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  
                  <div className="border-t border-border pt-3 space-y-1">
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
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
