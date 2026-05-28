import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientes, usePedidos, useProductos, useDolar } from '@/hooks/useSupabase';
import { generarYSubirPedidoPDF, generarPedidoPDF } from '@/lib/generarPedidoPDF';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import clsx from 'clsx';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const estados = ['pendiente', 'procesando', 'completado'];

type PedidoNotas = {
  grupo_pedido_id?: string;
  items?: Array<{
    producto_id?: string;
    producto_nombre?: string;
    cantidad?: number;
    alto?: number;
    ancho?: number;
    material_id?: string | null;
    material_nombre?: string | null;
    tipo_cobro?: 'mt2' | 'unidad';
    metros_cuadrados?: number;
    precio_total?: number;
  }>;
  payment?: {
    medio_pago?: string;
    referencia_pago?: string;
    fecha_limite?: string;
    abono_moneda?: 'USD' | 'BS';
    abono_original?: number;
    abono_tasa_bs?: number;
  };
  maquina_usar?: string;
  notas_libres?: string;
  archivo_trabajo_url?: string;
  pdf_url?: string;
  pdf_tasa_cambio_bs?: number;
};

function parsePedidoNotas(notas?: string | null): PedidoNotas {
  if (!notas) return {};
  try {
    const parsed = JSON.parse(notas);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildPedidoNotas(notas: string | null | undefined, patch: Partial<PedidoNotas>) {
  const current = parsePedidoNotas(notas);
  return JSON.stringify({
    ...current,
    ...patch,
    payment: {
      ...(current.payment || {}),
      ...(patch.payment || {}),
    },
  });
}

function getPedidoGrupoKey(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.grupo_pedido_id || pedido.grupo_pedido_id || pedido.id;
}

function getPedidoPdfUrl(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.pdf_url || pedido.pdf_url || '';
}

function getPedidoFechaLimite(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.payment?.fecha_limite || pedido.fecha_limite || null;
}

function getPedidoMedioPago(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.payment?.medio_pago || pedido.medio_pago || pedido.metodo_pago || '';
}

function getPedidoReferenciaPago(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.payment?.referencia_pago || pedido.referencia_pago || '';
}

function getPedidoTipoPago(pedido: any) {
  const raw = String(pedido.tipo_pago || '').toLowerCase();
  return raw === 'abono' ? 'parcial' : raw;
}

function getPedidoAbono(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return Number(notas.payment?.abono_original ?? pedido.abono ?? 0);
}

function getPedidoAbonoMoneda(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return String(notas.payment?.abono_moneda || '').toUpperCase();
}

function formatTipoPagoLabel(tipoPago: string) {
  if (!tipoPago) return '-';
  if (tipoPago === 'parcial') return 'Con abono';
  return tipoPago.charAt(0).toUpperCase() + tipoPago.slice(1);
}

function getPedidoDiasCredito(pedido: any) {
  return Number(pedido.dias_credito || 0);
}

function getPedidoMachine(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  return notas.maquina_usar || pedido.maquina_usar || '';
}

function getPedidoTasaCambioPdf(pedido: any) {
  const notas = parsePedidoNotas(pedido.notas);
  const value = notas.pdf_tasa_cambio_bs;
  return Number(value || 0);
}

function getPdfRateValue(rate: number) {
  return rate > 0 ? rate : undefined;
}

// Agrupa pedidos por grupo_pedido_id; los que no tienen ID propio forman su propio grupo.
function agruparPedidos(pedidos: any[]): any[][] {
  const grupos: Record<string, any[]> = {};
  for (const p of pedidos) {
    const key = getPedidoGrupoKey(p);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(p);
  }
  // Ordenar cada grupo por created_at
  return Object.values(grupos).sort((a, b) => {
    const da = new Date(a[0].created_at).getTime();
    const db = new Date(b[0].created_at).getTime();
    return db - da;
  });
}

const PedidosPDF = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { data: clientes = [] } = useClientes();
  const { data: pedidos = [], refetch } = usePedidos();
  const { data: productos = [] } = useProductos();
  const { data: dolar } = useDolar();
  const [clienteId, setClienteId] = useState('todos');
  const [mes, setMes] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updatePedido = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('pedidos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  useEffect(() => {
    const interval = setInterval(() => refetch(), 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const pedidosFiltrados = pedidos.filter(p => {
    const clienteMatch = clienteId === 'todos' || p.cliente_id === clienteId;
    const estadoMatch = estado === 'todos' || p.estado === estado;
    const mesMatch = mes === 'todos' || (p.created_at && new Date(p.created_at).getMonth() === parseInt(mes));
    return clienteMatch && estadoMatch && mesMatch;
  });

  const grupos = agruparPedidos(pedidosFiltrados);

  const handleGenerarPDF = async (grupo: any[]) => {
    const firstPedido = grupo[0];
    const grupoKey = getPedidoGrupoKey(firstPedido);
    setGenerando(grupoKey);

    const cliente = clientes.find(c => c.id === firstPedido.cliente_id);

    const items = grupo.map(pedido => {
      const notas = parsePedidoNotas(pedido.notas);
      const firstItem = notas.items?.[0];
      let producto = null;
      if (firstItem?.producto_id) {
        producto = productos.find(p => p.id === firstItem.producto_id) || null;
      } else if (pedido.producto && typeof pedido.producto === 'object') {
        producto = pedido.producto;
      } else {
        const pid = typeof pedido.producto === 'string' ? pedido.producto : pedido.producto_id;
        producto = productos.find(p => p.id === pid) || null;
      }

      return {
        pedido: {
          ...pedido,
          grupo_pedido_id: getPedidoGrupoKey(pedido),
          fecha_limite: getPedidoFechaLimite(pedido),
          medio_pago: getPedidoMedioPago(pedido),
          referencia_pago: getPedidoReferenciaPago(pedido),
          producto_id: firstItem?.producto_id || pedido.producto_id,
          descripcion: pedido.descripcion || firstItem?.producto_nombre || pedido.descripcion,
          notas,
        },
        producto,
      };
    });

    // Generar blob local
    const pdfBlob = generarPedidoPDF({
      items,
      cliente,
      grupoPedidoId: getPedidoGrupoKey(firstPedido),
      tasaCambioBs: Number(dolar?.valor || 0) || null,
    });
    const blobUrl = URL.createObjectURL(pdfBlob);
    setBlobUrls(prev => ({ ...prev, [grupoKey]: blobUrl }));

    // Subir a MinIO
    let publicUrl = '';
    try {
      publicUrl = await generarYSubirPedidoPDF({
        items,
        cliente,
        grupoPedidoId: getPedidoGrupoKey(firstPedido),
        tasaCambioBs: Number(dolar?.valor || 0) || null,
      });

      // Guardar pdf_url en todos los pedidos del grupo
      for (const pedido of grupo) {
        try {
          await updatePedido.mutateAsync({
            id: pedido.id,
            updates: {
              pdf_url: publicUrl,
              notas: buildPedidoNotas(pedido.notas, {
                pdf_url: publicUrl,
                grupo_pedido_id: getPedidoGrupoKey(pedido),
                pdf_tasa_cambio_bs: getPdfRateValue(Number(dolar?.valor || 0)),
              }),
            },
          });
        } catch (err: any) {
          console.error('Error al actualizar pedido en Supabase:', err);
        }
      }
    } catch (e: any) {
      setGenerando(null);
      alert('Error al subir PDF a MinIO: ' + (e?.message || JSON.stringify(e)));
      return;
    }

    setGenerando(null);
  };

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 animate-fade-in'}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-gradient">Pedidos PDF</h1>
          <p className="text-muted-foreground">Gestión y descarga de PDFs de pedidos</p>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Cliente</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Mes</label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {meses.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.map(e => (
                  <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-white/8 bg-[#0b1120] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <CardHeader><CardTitle>Pedidos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[#131b2e]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Productos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((grupo, index) => {
                  const first = grupo[0];
                  const grupoKey = getPedidoGrupoKey(first);
                  const cliente = clientes.find(c => c.id === first.cliente_id);
                  const totalGrupo = grupo.reduce((s, p) => s + (p.precio_total || 0), 0);
                  const pdfUrl = getPedidoPdfUrl(first) || grupo.map(getPedidoPdfUrl).find(Boolean) || '';
                  const tipoPago = (getPedidoTipoPago(first) || '').toLowerCase();
                  const abono = getPedidoAbono(first);
                  const diasCredito = getPedidoDiasCredito(first);
                  const maquinaUsar = getPedidoMachine(first);
                  const tasaPdf = getPedidoTasaCambioPdf(first) || Number(dolar?.valor || 0) || 0;

                  const nombresProductos = grupo.map(pedido => {
                    const notas = parsePedidoNotas(pedido.notas);
                    const firstItem = notas.items?.[0];
                    if (firstItem?.producto_nombre) return firstItem.producto_nombre;
                    if (pedido.producto && typeof pedido.producto === 'object') return pedido.producto.nombre;
                    const pid = typeof pedido.producto === 'string' ? pedido.producto : pedido.producto_id;
                    return productos.find(p => p.id === pid)?.nombre || firstItem?.producto_id || '-';
                  });

                  const rowBg = index % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#101a30]';

                  return (
                    <tr
                      key={grupoKey}
                      className={clsx(
                        rowBg,
                        'border-b border-white/5 transition-colors hover:bg-[#18243d]'
                      )}
                    >
                      <td className="px-4 py-2.5 align-top">{cliente?.nombre_completo || '-'}</td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          {nombresProductos.map((n, i) => (
                            <span key={i} className="text-xs">{n}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top font-semibold">${totalGrupo.toFixed(2)}</td>
                      <td className="px-4 py-2.5 align-top">{first.created_at ? new Date(first.created_at).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>{getPedidoFechaLimite(first) ? new Date(getPedidoFechaLimite(first) as string).toLocaleDateString() : '-'}</span>
                          <span className="text-xs text-muted-foreground">
                            {maquinaUsar || 'No requiere máquina'}
                            {tasaPdf ? ` · Tasa ${tasaPdf.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                          first.prioridad === 'urgente' && 'bg-red-600 text-white',
                          first.prioridad === 'alta' && 'bg-orange-500 text-white',
                          first.prioridad === 'media' && 'bg-blue-500 text-white',
                          first.prioridad === 'baja' && 'bg-slate-700 text-slate-100',
                        )}>
                          {first.prioridad ? first.prioridad.charAt(0).toUpperCase() + first.prioridad.slice(1) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {tipoPago ? formatTipoPagoLabel(tipoPago) : (getPedidoMedioPago(first) || '-')}
                          </span>
                          {tipoPago === 'parcial' && (
                            <span className="text-xs text-muted-foreground">
                              Abono: {getPedidoAbonoMoneda(first) === 'BS' ? `Bs ${abono.toFixed(2)}` : `$${abono.toFixed(2)}`}
                            </span>
                          )}
                          {tipoPago === 'credito' && (
                            <span className="text-xs text-muted-foreground">Crédito: {diasCredito} días</span>
                          )}
                          {getPedidoMedioPago(first) === 'Pago Móvil' && getPedidoReferenciaPago(first) && (
                            <span className="text-xs text-muted-foreground">{getPedidoReferenciaPago(first)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        {pdfUrl ? (
                          <div className="flex flex-col gap-1">
                            <Button asChild size="sm" variant="outline" className="w-24 min-w-fit">
                              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Ver PDF</a>
                            </Button>
                            <Button size="sm" variant="ghost" className="w-24 min-w-fit text-xs"
                              onClick={() => handleGenerarPDF(grupo)} disabled={generando === grupoKey}>
                              Regenerar
                            </Button>
                          </div>
                        ) : blobUrls[grupoKey] ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={blobUrls[grupoKey]} download={`pedido-${grupoKey.slice(0, 8)}.pdf`}>Descargar PDF</a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary"
                            onClick={() => handleGenerarPDF(grupo)}
                            disabled={generando === grupoKey}>
                            {generando === grupoKey ? 'Generando...' : 'Generar PDF'}
                          </Button>
                        )}
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
  );
};

export default PedidosPDF;
