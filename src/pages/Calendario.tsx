import { useState } from 'react';
import { usePedidos, useTrabajos } from '@/hooks/useSupabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle as _CheckCircle,
  ShoppingCart
} from 'lucide-react';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Calendario() {
  const { data: pedidos, isLoading: loadingPedidos } = usePedidos();
  const { data: _trabajos, isLoading: loadingTrabajos } = useTrabajos();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const isLoading = loadingPedidos || loadingTrabajos;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Primer día del mes y cuántos días tiene
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lunes = 0

  // Pedidos con fecha límite
  const pedidosConFecha = pedidos?.filter(p => p.fecha_limite) || [];

  // Eventos por día
  const getEventosDelDia = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const pedidosDia = pedidosConFecha.filter(p => {
      const fechaLimite = p.fecha_limite?.split('T')[0];
      return fechaLimite === dateStr;
    });

    return pedidosDia;
  };

  // Día seleccionado
  const eventosSeleccionado = selectedDate 
    ? getEventosDelDia(selectedDate.getDate())
    : [];

  // Navegar meses
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Verificar si es hoy
  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Verificar si tiene eventos

  // Próximos eventos (próximos 7 días)
  const proximosEventos = pedidosConFecha
    .filter(p => {
      const fecha = new Date(p.fecha_limite!);
      const hoy = new Date();
      const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
      return fecha >= hoy && fecha <= en7dias;
    })
    .sort((a, b) => new Date(a.fecha_limite!).getTime() - new Date(b.fecha_limite!).getTime());

  // Pedidos vencidos
  const pedidosVencidos = pedidosConFecha.filter(p => {
    const fecha = new Date(p.fecha_limite!);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy && p.estado !== 'completado' && p.estado !== 'cancelado';
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">
          Calendario
        </h1>
        <p className="text-[var(--color-muted-foreground)]">
          Fechas límite de pedidos y entregas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {MESES[month]} {year}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA.map(dia => (
                  <div key={dia} className="text-center text-xs font-medium text-[var(--color-muted-foreground)] py-2">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {/* Espacios vacíos antes del primer día */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Días del mes */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const eventos = getEventosDelDia(day);
                  const today = isToday(day);
                  const selected = selectedDate?.getDate() === day && 
                                   selectedDate?.getMonth() === month && 
                                   selectedDate?.getFullYear() === year;
                  const tieneEventos = eventos.length > 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(year, month, day))}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative
                        ${selected 
                          ? 'bg-[var(--color-primary)] text-white font-bold' 
                          : today 
                            ? 'bg-[var(--color-primary)]/10 font-bold ring-2 ring-[var(--color-primary)]/30'
                            : 'hover:bg-[var(--color-muted)]'
                        }
                      `}
                    >
                      {day}
                      {tieneEventos && (
                        <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                          selected ? 'bg-white' : 'bg-[var(--color-primary)]'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Día seleccionado */}
          {selectedDate && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-[var(--color-primary)]" />
                  {selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventosSeleccionado.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
                    Sin eventos para este día
                  </p>
                ) : (
                  <div className="space-y-2">
                    {eventosSeleccionado.map((pedido: any) => (
                      <div key={pedido.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)]">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="h-4 w-4 text-[var(--color-primary)]" />
                          <div>
                            <p className="font-medium text-sm">{pedido.descripcion || `Pedido #${pedido.id?.slice(0, 8)}`}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {pedido.clientes?.nombre || 'Sin cliente'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          pedido.estado === 'completado' ? 'success' :
                          pedido.estado === 'pendiente' ? 'warning' :
                          'default'
                        }>
                          {pedido.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Vencidos */}
          {pedidosVencidos.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Vencidos ({pedidosVencidos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pedidosVencidos.slice(0, 5).map(pedido => (
                  <div key={pedido.id} className="p-2 rounded bg-[var(--color-background)] text-sm">
                    <p className="font-medium truncate">{pedido.descripcion}</p>
                    <p className="text-xs text-red-400">
                      Venció: {new Date(pedido.fecha_limite!).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Próximos 7 días */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                Próximos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximosEventos.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
                  Sin entregas próximas
                </p>
              ) : (
                <div className="space-y-2">
                  {proximosEventos.map(pedido => {
                    const fecha = new Date(pedido.fecha_limite!);
                    const hoy = new Date();
                    const diasRestantes = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={pedido.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-muted)] text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{pedido.descripcion}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {fecha.toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <Badge variant={diasRestantes <= 1 ? 'destructive' : diasRestantes <= 3 ? 'warning' : 'outline'}>
                          {diasRestantes === 0 ? 'Hoy' : diasRestantes === 1 ? 'Mañana' : `${diasRestantes}d`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen del mes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-5 w-5 text-[var(--color-primary)]" />
                Resumen del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">Total entregas</span>
                  <span className="font-bold">{pedidosConFecha.filter(p => {
                    const f = new Date(p.fecha_limite!);
                    return f.getMonth() === month && f.getFullYear() === year;
                  }).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">Completados</span>
                  <span className="font-bold text-emerald-400">{pedidosConFecha.filter(p => {
                    const f = new Date(p.fecha_limite!);
                    return f.getMonth() === month && f.getFullYear() === year && p.estado === 'completado';
                  }).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">Pendientes</span>
                  <span className="font-bold text-amber-400">{pedidosConFecha.filter(p => {
                    const f = new Date(p.fecha_limite!);
                    return f.getMonth() === month && f.getFullYear() === year && p.estado === 'pendiente';
                  }).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
