import { useState } from 'react';
import { usePedidos, useTrabajos, useClientes, useProductos, useMateriales, useTintas } from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Periodo = 'semana' | 'mes' | 'trimestre' | 'todo';

const tokens = {
  background: '#0b1326',
  card: '#1E293B',
  primary: '#b4c5ff',
  cta: '#2563eb',
  amber: '#ffb95f',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
  textSecondary: '#94A3B8',
  border: 'rgba(255,255,255,0.08)',
  surface: '#171f33',
  surfaceHigh: '#222a3d',
  inputBg: '#060e20',
  white: '#F8FAFC',
  slate: '#64748B',
};

export default function Reportes() {
  const { data: pedidos, isLoading: loadingPedidos } = usePedidos();
  const { data: trabajos, isLoading: loadingTrabajos } = useTrabajos();
  const { data: clientes, isLoading: loadingClientes } = useClientes();
  const { data: _productos } = useProductos();
  const { data: materiales } = useMateriales();
  const { data: tintas } = useTintas();

  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const isLoading = loadingPedidos || loadingTrabajos || loadingClientes;

  // Filtrar por período
  const getFechaInicio = () => {
    const now = new Date();
    switch (periodo) {
      case 'semana':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'mes':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'trimestre':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1);
      default:
        return new Date(2020, 0, 1);
    }
  };

  const fechaInicio = getFechaInicio();
  const pedidosPeriodo = pedidos?.filter(p => new Date(p.created_at) >= fechaInicio) || [];
  const trabajosPeriodo = trabajos?.filter(t => new Date(t.created_at) >= fechaInicio) || [];

  // Métricas de pedidos
  const totalPedidos = pedidosPeriodo.length;
  const pedidosCompletados = pedidosPeriodo.filter(p => p.estado === 'completado').length;
  const tasaCompletado = totalPedidos > 0 ? Math.round((pedidosCompletados / totalPedidos) * 100) : 0;
  const ingresosTotales = pedidosPeriodo.filter(p => p.estado !== 'cancelado')
    .reduce((sum, p) => sum + (p.precio_total || 0), 0);
  const ticketPromedio = totalPedidos > 0 ? Math.round(ingresosTotales / totalPedidos) : 0;

  // Métricas de trabajos
  const totalTrabajos = trabajosPeriodo.length;
  const trabajosCompletados = trabajosPeriodo.filter(t => t.estado === 'entregado').length;
  const trabajosEnProceso = trabajosPeriodo.filter(t => t.estado === 'en_proceso').length;
  const trabajosPendientes = trabajosPeriodo.filter(t => t.estado === 'pendiente').length;

  // Top clientes por facturación
  const clientesFacturacion = pedidosPeriodo
    .filter(p => p.estado !== 'cancelado' && p.cliente_id)
    .reduce((acc: any[], p: any) => {
      const existing = acc.find((a: any) => a.id === p.cliente_id);
      if (existing) {
        existing.total += p.precio_total || 0;
        existing.cantidad += 1;
      } else {
        acc.push({
          id: p.cliente_id,
          nombre: p.clientes?.nombre || 'Sin nombre',
          total: p.precio_total || 0,
          cantidad: 1,
        });
      }
      return acc;
    }, [] as { id: string; nombre: string; total: number; cantidad: number }[])
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5);

  // Productos más vendidos (por frecuencia en descripciones)
  const productosFrecuentes = pedidosPeriodo
    .filter(p => p.estado !== 'cancelado')
    .reduce((acc: any[], p: any) => {
      const desc = p.descripcion || 'Sin descripción';
      const existing = acc.find((a: any) => a.nombre === desc);
      if (existing) {
        existing.cantidad += 1;
        existing.total += p.precio_total || 0;
      } else {
        acc.push({ nombre: desc, cantidad: 1, total: p.precio_total || 0 });
      }
      return acc;
    }, [] as { nombre: string; cantidad: number; total: number }[])
    .sort((a: any, b: any) => b.cantidad - a.cantidad)
    .slice(0, 5);

  // Estado de inventario
  const materialesBajoStock = materiales?.filter(m => m.stock <= 5 || m.largo_restante <= 10).length || 0;
  const tintasBajoStock = tintas?.filter(t => {
    return (t.magenta_cantidad || 0) < (t.magenta_minimo || 0) ||
           (t.cian_cantidad || 0) < (t.cian_minimo || 0) ||
           (t.amarillo_cantidad || 0) < (t.amarillo_minimo || 0) ||
           (t.negro_cantidad || 0) < (t.negro_minimo || 0);
  }).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ background: tokens.background }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" style={{ background: tokens.background }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', color: tokens.slate, letterSpacing: '0.08em' }}>
            Reportes / Análisis
          </p>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontSize: 30, fontWeight: 700, color: tokens.primary, lineHeight: 1.1 }}>
            Reportes
          </h1>
        </div>
        <div className="flex gap-2">
          {(['semana', 'mes', 'trimestre', 'todo'] as Periodo[]).map(p => {
            const active = periodo === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '6px 14px',
                  borderRadius: '0.25rem',
                  border: `1px solid ${active ? tokens.cta : tokens.border}`,
                  background: active ? tokens.cta : 'transparent',
                  color: active ? '#fff' : tokens.textSecondary,
                }}
              >
                {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : p === 'trimestre' ? 'Trimestre' : 'Todo'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: 'shopping_cart',
            value: totalPedidos.toLocaleString(),
            label: 'Pedidos',
            sub: `${tasaCompletado}% completados`,
            color: tokens.primary,
          },
          {
            icon: 'payments',
            value: `$${ingresosTotales.toLocaleString()}`,
            label: 'Ingresos',
            sub: `Ticket: $${ticketPromedio.toLocaleString()}`,
            color: tokens.green,
          },
          {
            icon: 'build',
            value: totalTrabajos.toLocaleString(),
            label: 'Trabajos',
            sub: `${trabajosEnProceso} en proceso`,
            color: tokens.amber,
          },
          {
            icon: 'group',
            value: (clientes?.length || 0).toLocaleString(),
            label: 'Clientes',
            sub: 'Total registrados',
            color: tokens.blue,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5"
            style={{
              background: tokens.card,
              border: `1px solid ${tokens.border}`,
              borderRadius: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: kpi.color, fontSize: 22 }}>{kpi.icon}</span>
            <div style={{ fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 700, color: kpi.color, marginTop: 8 }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', color: tokens.textSecondary, letterSpacing: '0.08em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 11, color: tokens.slate, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6" style={{ background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '0.5rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: tokens.primary, fontSize: 20 }}>group</span>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: tokens.white }}>Top Clientes por Facturación</h2>
          </div>
          {clientesFacturacion.length === 0 ? (
            <p className="py-8 text-center" style={{ color: tokens.slate }}>Sin datos en este período</p>
          ) : (
            <div className="space-y-4">
              {clientesFacturacion.map((cliente: any, idx: number) => {
                const maxTotal = clientesFacturacion[0]?.total || 1;
                const porcentaje = Math.round((cliente.total / maxTotal) * 100);
                return (
                  <div key={cliente.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate" style={{ color: tokens.white }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: tokens.slate, marginRight: 8 }}>#{idx + 1}</span>
                        {cliente.nombre}
                      </div>
                      <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: tokens.primary }}>${cliente.total.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'rgba(180,197,255,0.1)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: tokens.primary }} />
                    </div>
                    <div style={{ color: tokens.slate, fontSize: 11 }}>{cliente.cantidad} pedido(s)</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6" style={{ background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '0.5rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: tokens.amber, fontSize: 20 }}>bar_chart</span>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: tokens.white }}>Trabajos Más Frecuentes</h2>
          </div>
          {productosFrecuentes.length === 0 ? (
            <p className="py-8 text-center" style={{ color: tokens.slate }}>Sin datos en este período</p>
          ) : (
            <div className="space-y-4">
              {productosFrecuentes.map((prod: any, idx: number) => {
                const maxCant = productosFrecuentes[0]?.cantidad || 1;
                const porcentaje = Math.round((prod.cantidad / maxCant) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate" style={{ color: tokens.white }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: tokens.slate, marginRight: 8 }}>#{idx + 1}</span>
                        {prod.nombre}
                      </div>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          borderRadius: '0.25rem',
                          padding: '2px 8px',
                          background: 'rgba(255,185,95,0.15)',
                          color: tokens.amber,
                          border: '1px solid rgba(255,185,95,0.3)',
                        }}
                      >
                        {prod.cantidad}x
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255,185,95,0.1)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: tokens.amber }} />
                    </div>
                    <div style={{ color: tokens.slate, fontSize: 11 }}>${prod.total.toLocaleString()} facturado</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-6" style={{ background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '0.5rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ color: tokens.primary, fontSize: 20 }}>precision_manufacturing</span>
          <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: tokens.white }}>Estado de Producción</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pendientes', count: trabajosPendientes, dotColor: tokens.amber, valueColor: tokens.amber },
            { label: 'En Proceso', count: trabajosEnProceso, dotColor: tokens.blue, valueColor: tokens.blue },
            { label: 'Completados', count: trabajosCompletados, dotColor: tokens.green, valueColor: tokens.green },
            { label: 'Total', count: totalTrabajos, dotColor: tokens.textSecondary, valueColor: tokens.white },
          ].map(item => (
            <div key={item.label} className="text-center p-4" style={{ background: '#131b2e', borderRadius: '0.25rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', margin: '0 auto 8px', background: item.dotColor }} />
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 700, color: item.valueColor }}>{item.count}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', color: tokens.textSecondary, letterSpacing: '0.08em' }}>{item.label}</div>
            </div>
          ))}
        </div>
        {totalTrabajos > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
              {trabajosPendientes > 0 && <div title={`Pendientes: ${trabajosPendientes}`} style={{ width: `${(trabajosPendientes / totalTrabajos) * 100}%`, background: tokens.amber }} />}
              {trabajosEnProceso > 0 && <div title={`En proceso: ${trabajosEnProceso}`} style={{ width: `${(trabajosEnProceso / totalTrabajos) * 100}%`, background: tokens.blue }} />}
              {trabajosCompletados > 0 && <div title={`Completados: ${trabajosCompletados}`} style={{ width: `${(trabajosCompletados / totalTrabajos) * 100}%`, background: tokens.green }} />}
            </div>
          </div>
        )}
      </div>

      {(materialesBajoStock > 0 || tintasBajoStock > 0) && (
        <div className="p-5" style={{ background: 'rgba(255,185,95,0.05)', border: '1px solid rgba(255,185,95,0.2)', borderRadius: '0.5rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ color: tokens.amber, fontSize: 20 }}>warning</span>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, color: tokens.amber }}>Alertas de Inventario</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {materialesBajoStock > 0 && (
              <div className="p-4" style={{ background: '#131b2e', borderRadius: '0.25rem' }}>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 700, color: tokens.amber }}>{materialesBajoStock}</div>
                <div style={{ color: tokens.textSecondary, fontSize: 13 }}>Materiales con stock bajo</div>
              </div>
            )}
            {tintasBajoStock > 0 && (
              <div className="p-4" style={{ background: '#131b2e', borderRadius: '0.25rem' }}>
                <div style={{ fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 700, color: tokens.amber }}>{tintasBajoStock}</div>
                <div style={{ color: tokens.textSecondary, fontSize: 13 }}>Tintas por debajo del mínimo</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
