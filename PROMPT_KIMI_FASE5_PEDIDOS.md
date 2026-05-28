# PROMPT PARA KIMI 2.5 — CRM v2 Fase 5: Pedidos

> **Tarea**: Rediseñar visualmente `/home/claudeuser/crm-v2/src/pages/Pedidos.tsx` con el sistema de diseño Stitch (industrial/dark). El archivo tiene 1291 líneas y lógica crítica de negocio que NO puedes romper. Lee TODO este prompt antes de escribir una sola línea.

---

## REGLA DE DEPLOY
- Build: `cd /home/claudeuser/crm-v2 && npm run build`
- Deploy solo a: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`
- **Nunca tocar** `/home/parabanes/web/crm.biombos.cl/`

---

## TOKENS DE DISEÑO (mismos que todas las fases)

```
Fondo app:      #0b1326    Surface card:  #1E293B    Contenedor: #171f33
Surface high:   #222a3d    Surface deep:  #0B1120    Header tabla: #060e20
Borde sutil:    rgba(255,255,255,0.08)               Hover fila: rgba(34,42,61,0.5)
Primario:       #b4c5ff    Botón acción:  #2563eb    Texto on-primary: #002a78
Secundario:     #ffb95f    Terciario:     #4edea3    Alerta:  #EF4444
Texto:          #F8FAFC    Muted:         #94A3B8    Outline: #8d90a0
Status ready:   #10B981    Status prod:   #3B82F6    Status pending: #64748B
```

Tipografía:
- Geist → métricas grandes (font-family: 'Geist', sans-serif)
- Inter → body y tablas
- JetBrains Mono → caps labels de encabezados (11px, weight 700, uppercase, letterSpacing 0.05em)

Iconos: SOLO `<span className="material-symbols-outlined">nombre_icono</span>`. Cero lucide-react.
BorderRadius: default 0.125rem, lg 0.25rem, xl 0.5rem.

---

## IMPORTS A CONSERVAR EXACTAMENTE

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePedidos, useCreatePedido, useUpdatePedido, useDeletePedido, useClientes, useProductos, useCreateTrabajo, useMaquinas, useTrabajos, useTintas, useDolar, useCreateCliente } from '@/hooks/useSupabase';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
```

**ELIMINAR completamente estos imports:**
- `Card, CardContent` de `@/components/ui/card`
- `Button` de `@/components/ui/button`
- `Input` de `@/components/ui/input`
- `Label` de `@/components/ui/label`
- `Badge` de `@/components/ui/badge`
- Todo lo de `lucide-react`

---

## INTERFACES Y CONSTANTES — CONSERVAR ÍNTEGRAS

Copia sin cambiar:

```tsx
interface LineItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  tipo_cobro: 'm2' | 'unidad';
  cantidad: number;
  ancho: number;
  alto: number;
  precio_unitario: number;
  subtotal: number;
}

interface PedidoForm {
  cliente_id: string;
  descripcion: string;
  precio_total: string;
  metodo_pago: string;
  fecha_limite: string;
  estado: string;
  prioridad: string;
  notas: string;
  url_diseno: string;
  referencia_pago: string;
  items: LineItem[];
}

const emptyForm: PedidoForm = {
  cliente_id: '',
  descripcion: '',
  precio_total: '',
  metodo_pago: 'Efectivo BS',
  fecha_limite: '',
  estado: 'pendiente',
  prioridad: 'normal',
  notas: '',
  url_diseno: '',
  referencia_pago: '',
  items: [],
};

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const METODOS_PAGO = ['Efectivo BS', 'Efectivo $', 'Pago Móvil', 'Transferencia', 'Otro'];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

function newItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
```

---

## SUB-COMPONENTE: ClientAutocomplete — CONSERVAR ÍNTEGRO

Copia la función `ClientAutocomplete` exactamente como está en el archivo original. Solo cambia:
- Reemplaza el `<User className=...>` (lucide) por `<span className="material-symbols-outlined" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'18px',color:'#94A3B8'}}>person</span>`
- Reemplaza `<ChevronDown className=...>` por `<span className="material-symbols-outlined" style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'18px',color:'#94A3B8'}}>expand_more</span>`
- Reemplaza el `<Input>` del shadcn por un `<input>` nativo con este estilo inline: `style={{width:'100%',background:'#060e20',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.25rem',padding:'8px 12px 8px 36px',color:'#F8FAFC',fontSize:'14px',outline:'none'}}` y añade `onFocus` que cambia el border a `1px solid #b4c5ff`.
- El dropdown de resultados: fondo `#1E293B`, borde `rgba(255,255,255,0.08)`, cada item con `hover: background #222a3d`.
- Conserva TODA la lógica de filtrado, useRef, useEffect con click-outside.

---

## SUB-COMPONENTE: ProductAutocomplete — CONSERVAR ÍNTEGRO

Igual que ClientAutocomplete:
- Reemplaza `<Package className=...>` por `<span className="material-symbols-outlined">inventory_2</span>` (con posicionamiento absoluto igual).
- Reemplaza `<Input>` shadcn por `<input>` nativo con mismo estilo.
- Conserva toda la lógica de filtrado.

---

## SUB-COMPONENTE: LineItemRow — CONSERVAR ÍNTEGRO

Conserva toda la lógica. Solo cambia los elementos visuales:
- El badge `{isM2 ? 'm²' : 'unidad'}` → `<span style={{padding:'2px 6px',borderRadius:'0.125rem',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',border:'1px solid rgba(255,255,255,0.08)',color:'#94A3B8'}}>{isM2 ? 'M²' : 'UNIDAD'}</span>`
- El botón eliminar (Trash2) → `<span className="material-symbols-outlined" style={{cursor:'pointer',color:'#EF4444',fontSize:'18px'}} onClick={onRemove}>delete</span>`
- Los `<Input>` shadcn → `<input type="number">` nativos con estilo: `style={{width:'100%',background:'#060e20',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.25rem',padding:'6px 8px',color:'#F8FAFC',fontSize:'13px',outline:'none'}}`
- Los `<Label>` → `<span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:'4px'}}>`
- El div de Subtotal: fondo `#060e20`, borde `rgba(255,255,255,0.08)`, texto `#b4c5ff` en Geist 13px bold.

---

## FUNCIÓN: generarPDF — CONSERVAR ÍNTEGRA

Copia la función `generarPDF` exactamente como está. No tocar.

---

## LÓGICA DEL COMPONENTE PRINCIPAL — CONSERVAR ÍNTEGRA

En el componente `Pedidos()`, conserva sin cambios:
- Todos los hooks: `usePedidos`, `useClientes`, `useProductos`, `useMaquinas`, `useTrabajos`, `useTintas`, `useDolar`, `useCreatePedido`, `useUpdatePedido`, `useDeletePedido`, `useCreateTrabajo`, `useCreateCliente`, `useQueryClient`
- Todo el estado: `search`, `filterEstado`, `showForm`, `editingId`, `form`, `consumoTinta`, `mostrarFormCliente`, `nuevoClienteData`
- `filteredPedidos` con su lógica de filtro
- `getClienteNombre(pedido)` — conservar exactamente
- `getEstadoBadge(estado)` — conservar exactamente
- `addLineItem`, `updateLineItem`, `removeLineItem`, `calcTotal` — conservar exactamente
- `buildDescripcion(items)` — conservar exactamente
- `parseItemsFromPedido(pedido)` — conservar exactamente
- `getNotasText(pedido)` — conservar exactamente
- `handleSubmit` — conservar exactamente (lógica de crear/editar, auto-crear trabajo, descontar tinta)
- `handleEdit` — conservar exactamente
- `handleDelete` — conservar exactamente
- `handleCancel` — conservar exactamente
- `handleCrearCliente` — conservar exactamente
- `handleQuickStatusChange` — conservar exactamente

Variables calculadas (conservar):
```tsx
const stats = {
  total: pedidos?.length || 0,
  pendientes: pedidos?.filter((p) => p.estado === 'pendiente').length || 0,
  enProceso: pedidos?.filter((p) => p.estado === 'en_proceso').length || 0,
  completados: pedidos?.filter((p) => p.estado === 'completado').length || 0,
  totalFacturado: pedidos?.filter((p) => p.estado !== 'cancelado').reduce((sum, p) => sum + (p.precio_total || 0), 0) || 0,
};
const formTotal = calcTotal(form.items);
const formItemCount = form.items.length;
```

---

## RENDER — NUEVA ESTRUCTURA STITCH

El return debe tener esta estructura:

```tsx
return (
  <>
    <div style={{padding:'24px',display:'flex',flexDirection:'column',gap:'24px'}}>

      {/* 1. PageHeader */}
      <PageHeader
        title="Pedidos"
        description="Gestión de pedidos y órdenes de trabajo"
        icon="description"
        actions={
          <button onClick={() => setShowForm(true)}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#2563eb',border:'none',borderRadius:'0.25rem',color:'#F8FAFC',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>
            Nuevo Pedido
          </button>
        }
      />

      {/* 2. Stat cards — 5 tarjetas */}
      {/* 3. Barra de búsqueda + filtros */}
      {/* 4. Tabla de pedidos */}

    </div>

    {/* 5. Drawer crear/editar (fuera del div principal) */}
  </>
);
```

---

## SECCIÓN 2 — STAT CARDS (5 tarjetas en grid)

```tsx
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'16px'}}>

  {/* Total */}
  <div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',padding:'20px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
      <span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace'}}>TOTAL PEDIDOS</span>
      <span className="material-symbols-outlined" style={{color:'#b4c5ff',fontSize:'20px'}}>description</span>
    </div>
    <div style={{fontFamily:'Geist, sans-serif',fontSize:'28px',fontWeight:'700',color:'#b4c5ff',letterSpacing:'-0.01em'}}>{stats.total}</div>
  </div>

  {/* Pendientes */}
  <div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',padding:'20px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
      <span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace'}}>PENDIENTES</span>
      <span className="material-symbols-outlined" style={{color:'#ffb95f',fontSize:'20px'}}>schedule</span>
    </div>
    <div style={{fontFamily:'Geist, sans-serif',fontSize:'28px',fontWeight:'700',color: stats.pendientes > 0 ? '#ffb95f' : '#F8FAFC',letterSpacing:'-0.01em'}}>{stats.pendientes}</div>
  </div>

  {/* En proceso */}
  <div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',padding:'20px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
      <span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace'}}>EN PROCESO</span>
      <span className="material-symbols-outlined" style={{color:'#3B82F6',fontSize:'20px'}}>precision_manufacturing</span>
    </div>
    <div style={{fontFamily:'Geist, sans-serif',fontSize:'28px',fontWeight:'700',color:'#3B82F6',letterSpacing:'-0.01em'}}>{stats.enProceso}</div>
  </div>

  {/* Completados */}
  <div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',padding:'20px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
      <span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace'}}>COMPLETADOS</span>
      <span className="material-symbols-outlined" style={{color:'#10B981',fontSize:'20px'}}>check_circle</span>
    </div>
    <div style={{fontFamily:'Geist, sans-serif',fontSize:'28px',fontWeight:'700',color:'#10B981',letterSpacing:'-0.01em'}}>{stats.completados}</div>
  </div>

  {/* Total facturado — análisis financiero */}
  <div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',padding:'20px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
      <span style={{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',color:'#94A3B8',fontFamily:'JetBrains Mono, monospace'}}>FACTURADO</span>
      <span className="material-symbols-outlined" style={{color:'#4edea3',fontSize:'20px'}}>payments</span>
    </div>
    <div style={{fontFamily:'Geist, sans-serif',fontSize:'22px',fontWeight:'700',color:'#4edea3',letterSpacing:'-0.01em'}}>${stats.totalFacturado.toLocaleString('es-CL',{maximumFractionDigits:0})}</div>
    {dolar?.valor && (
      <div style={{fontSize:'11px',color:'#ffb95f',marginTop:'4px'}}>
        {(stats.totalFacturado * dolar.valor).toLocaleString('es-VE',{maximumFractionDigits:0})} Bs
      </div>
    )}
  </div>

</div>
```

---

## SECCIÓN 3 — BARRA DE BÚSQUEDA + FILTRO PILLS

```tsx
<div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>

  {/* Input búsqueda */}
  <div style={{position:'relative',flex:1,minWidth:'240px'}}>
    <span className="material-symbols-outlined" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'18px',color:'#94A3B8'}}>search</span>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar por descripción, cliente o ID..."
      style={{width:'100%',background:'#060e20',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.25rem',padding:'8px 12px 8px 40px',color:'#F8FAFC',fontSize:'13px',outline:'none',boxSizing:'border-box'}}
    />
  </div>

  {/* Pills de estado */}
  <div style={{display:'flex',gap:'4px',background:'#131b2e',padding:'4px',borderRadius:'0.25rem',border:'1px solid rgba(255,255,255,0.08)'}}>
    {[{value:'todos',label:'Todos'}, ...ESTADOS].map(e => (
      <button key={e.value} onClick={() => setFilterEstado(e.value)}
        style={{padding:'4px 12px',borderRadius:'0.125rem',fontSize:'12px',fontWeight:'700',border:'none',cursor:'pointer',
          background: filterEstado === e.value ? '#2563eb' : 'transparent',
          color: filterEstado === e.value ? '#F8FAFC' : '#94A3B8',
          transition:'all 0.15s'
        }}>
        {e.label || e.value}
      </button>
    ))}
  </div>

</div>
```

---

## SECCIÓN 4 — TABLA DE PEDIDOS (estilo industrial Stitch)

Reemplaza las `<Card>` individuales por una tabla full-width:

```tsx
<div style={{background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.5rem',overflow:'hidden'}}>
  <table style={{width:'100%',borderCollapse:'collapse'}}>
    <thead>
      <tr style={{background:'#060e20'}}>
        <th style={thStyle}>PEDIDO</th>
        <th style={thStyle}>CLIENTE</th>
        <th style={thStyle}>DESCRIPCIÓN</th>
        <th style={thStyle}>ESTADO</th>
        <th style={thStyle}>PRIORIDAD</th>
        <th style={thStyle}>TOTAL</th>
        <th style={thStyle}>FECHA</th>
        <th style={{...thStyle,textAlign:'right'}}>ACCIONES</th>
      </tr>
    </thead>
    <tbody>
      {filteredPedidos.map((pedido) => {
        const items = parseItemsFromPedido(pedido);
        return (
          <tr key={pedido.id}
            style={{borderBottom:'1px solid rgba(255,255,255,0.08)',transition:'background 0.15s'}}
            onMouseEnter={e => (e.currentTarget.style.background = '#222a3d')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

            {/* PEDIDO — ID + items count */}
            <td style={tdStyle}>
              <div style={{fontWeight:'700',color:'#F8FAFC',fontSize:'13px',fontFamily:'JetBrains Mono, monospace'}}>
                #{pedido.id?.slice(0,8).toUpperCase()}
              </div>
              {items.length > 0 && (
                <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px'}}>{items.length} ítem{items.length>1?'s':''}</div>
              )}
            </td>

            {/* CLIENTE */}
            <td style={tdStyle}>
              <span style={{color:'#F8FAFC',fontSize:'13px'}}>{getClienteNombre(pedido)}</span>
            </td>

            {/* DESCRIPCIÓN */}
            <td style={tdStyle}>
              <span style={{color:'#94A3B8',fontSize:'13px',maxWidth:'200px',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {pedido.descripcion || '—'}
              </span>
            </td>

            {/* ESTADO */}
            <td style={tdStyle}>
              {/* Badge de estado */}
              {(() => {
                const colores: Record<string,{bg:string,text:string,border:string}> = {
                  pendiente:  {bg:'rgba(100,116,139,0.15)',text:'#64748B',border:'rgba(100,116,139,0.3)'},
                  en_proceso: {bg:'rgba(59,130,246,0.15)',text:'#3B82F6',border:'rgba(59,130,246,0.3)'},
                  completado: {bg:'rgba(16,185,129,0.15)',text:'#10B981',border:'rgba(16,185,129,0.3)'},
                  cancelado:  {bg:'rgba(239,68,68,0.15)', text:'#EF4444',border:'rgba(239,68,68,0.3)'},
                };
                const c = colores[pedido.estado] || colores.pendiente;
                const labels: Record<string,string> = {pendiente:'Pendiente',en_proceso:'En Proceso',completado:'Completado',cancelado:'Cancelado'};
                return (
                  <span style={{padding:'2px 8px',borderRadius:'0.125rem',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.05em',background:c.bg,color:c.text,border:`1px solid ${c.border}`}}>
                    {labels[pedido.estado] || pedido.estado}
                  </span>
                );
              })()}
            </td>

            {/* PRIORIDAD */}
            <td style={tdStyle}>
              {(() => {
                const pColores: Record<string,string> = {baja:'#64748B',normal:'#94A3B8',alta:'#ffb95f',urgente:'#EF4444'};
                const c = pColores[pedido.prioridad] || '#94A3B8';
                return (
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:c,flexShrink:0}}/>
                    <span style={{color:c,fontSize:'12px',fontWeight:'600',textTransform:'capitalize'}}>{pedido.prioridad || 'normal'}</span>
                  </div>
                );
              })()}
            </td>

            {/* TOTAL */}
            <td style={tdStyle}>
              <div style={{fontFamily:'Geist, sans-serif',fontSize:'15px',fontWeight:'700',color:'#b4c5ff'}}>
                ${pedido.precio_total?.toLocaleString('es-CL',{maximumFractionDigits:0}) || '0'}
              </div>
              {dolar?.valor && pedido.precio_total && (
                <div style={{fontSize:'10px',color:'#ffb95f',marginTop:'2px'}}>
                  {(pedido.precio_total * dolar.valor).toLocaleString('es-VE',{maximumFractionDigits:0})} Bs
                </div>
              )}
            </td>

            {/* FECHA */}
            <td style={tdStyle}>
              <span style={{color:'#94A3B8',fontSize:'12px',fontFamily:'Inter, sans-serif'}}>
                {new Date(pedido.created_at).toLocaleDateString('es-CL')}
              </span>
              {pedido.fecha_limite && (
                <div style={{fontSize:'10px',color:'#ffb95f',marginTop:'2px'}}>
                  Entrega: {new Date(pedido.fecha_limite).toLocaleDateString('es-CL')}
                </div>
              )}
            </td>

            {/* ACCIONES */}
            <td style={{...tdStyle,textAlign:'right'}}>
              <div style={{display:'flex',justifyContent:'flex-end',gap:'4px',alignItems:'center'}}>
                {/* Cambio rápido de estado */}
                {pedido.estado === 'pendiente' && (
                  <button onClick={() => handleQuickStatusChange(pedido.id, 'en_proceso')}
                    style={{padding:'3px 8px',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'0.125rem',color:'#3B82F6',fontSize:'10px',fontWeight:'700',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    INICIAR
                  </button>
                )}
                {pedido.estado === 'en_proceso' && (
                  <button onClick={() => handleQuickStatusChange(pedido.id, 'completado')}
                    style={{padding:'3px 8px',background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'0.125rem',color:'#10B981',fontSize:'10px',fontWeight:'700',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    COMPLETAR
                  </button>
                )}
                {/* PDF */}
                <button onClick={() => generarPDF(pedido, items, getClienteNombre)} title="Descargar PDF"
                  style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#94A3B8',borderRadius:'0.125rem',transition:'color 0.15s'}}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color='#b4c5ff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color='#94A3B8')}>
                  <span className="material-symbols-outlined" style={{fontSize:'18px'}}>picture_as_pdf</span>
                </button>
                {/* Editar */}
                <button onClick={() => handleEdit(pedido)}
                  style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#94A3B8',borderRadius:'0.125rem',transition:'color 0.15s'}}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color='#b4c5ff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color='#94A3B8')}>
                  <span className="material-symbols-outlined" style={{fontSize:'18px'}}>edit</span>
                </button>
                {/* Eliminar */}
                <button onClick={() => handleDelete(pedido.id)}
                  style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#94A3B8',borderRadius:'0.125rem',transition:'color 0.15s'}}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color='#EF4444')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color='#94A3B8')}>
                  <span className="material-symbols-outlined" style={{fontSize:'18px'}}>delete</span>
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>

  {/* Empty state */}
  {filteredPedidos.length === 0 && (
    <div style={{textAlign:'center',padding:'64px 24px'}}>
      <span className="material-symbols-outlined" style={{fontSize:'48px',color:'#2d3449',display:'block',marginBottom:'12px'}}>shopping_cart</span>
      <p style={{color:'#94A3B8',fontSize:'14px'}}>
        {search || filterEstado !== 'todos' ? 'No se encontraron pedidos con esos filtros' : 'No hay pedidos registrados'}
      </p>
      {!search && filterEstado === 'todos' && (
        <button onClick={() => setShowForm(true)} style={{marginTop:'16px',padding:'8px 16px',background:'#2563eb',border:'none',borderRadius:'0.25rem',color:'#F8FAFC',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
          Crear primer pedido
        </button>
      )}
    </div>
  )}
</div>
```

Define estas constantes de estilo fuera del return:
```tsx
const thStyle: React.CSSProperties = {
  padding: '12px 20px',
  fontSize: '10px',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#94A3B8',
  fontFamily: 'JetBrains Mono, monospace',
  whiteSpace: 'nowrap' as const,
  textAlign: 'left' as const,
};

const tdStyle: React.CSSProperties = {
  padding: '14px 20px',
  verticalAlign: 'middle',
};
```

---

## SECCIÓN 5 — DRAWER POS (create/edit) — 640px ANCHO

El drawer es ancho porque el formulario POS tiene mucho contenido. Estructura:

```tsx
{/* Overlay */}
{showForm && (
  <div
    onClick={handleCancel}
    style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:40}}
  />
)}

{/* Drawer */}
<div style={{
  position:'fixed',top:0,right:0,height:'100vh',
  width: showForm ? '640px' : '0',
  background:'#0b1326',
  borderLeft:'1px solid rgba(255,255,255,0.08)',
  zIndex:50,
  transition:'width 0.3s ease',
  overflow:'hidden',
  display:'flex',flexDirection:'column',
}}>
  {showForm && (
    <>
      {/* Header del drawer */}
      <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <h2 style={{fontFamily:'Geist, sans-serif',fontSize:'18px',fontWeight:'700',color:'#F8FAFC',margin:0}}>
            {editingId ? 'Editar Pedido' : 'Nuevo Pedido'}
          </h2>
          <p style={{fontSize:'12px',color:'#94A3B8',marginTop:'2px'}}>Interfaz punto de venta — registrar pedido de impresión</p>
        </div>
        <button onClick={handleCancel}
          style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#94A3B8'}}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color='#F8FAFC')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color='#94A3B8')}>
          <span className="material-symbols-outlined" style={{fontSize:'22px'}}>close</span>
        </button>
      </div>

      {/* Cuerpo con 2 columnas: form principal (izq) + sidebar resumen (der) */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* Columna principal — scrollable */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'20px'}}>

          {/* CLIENTE */}
          <div>
            <label style={labelStyle}>CLIENTE *</label>
            <ClientAutocomplete clientes={clientes||[]} selectedId={form.cliente_id}
              onSelect={(id) => setForm({...form, cliente_id: id})} />
            {!mostrarFormCliente ? (
              <button type="button" onClick={() => setMostrarFormCliente(true)}
                style={{marginTop:'6px',fontSize:'12px',color:'#b4c5ff',background:'transparent',border:'none',cursor:'pointer',padding:0}}>
                + Crear cliente nuevo
              </button>
            ) : (
              <div style={{marginTop:'8px',padding:'12px',border:'1px solid rgba(180,197,255,0.2)',borderRadius:'0.25rem',background:'rgba(180,197,255,0.05)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <span style={labelStyle}>NUEVO CLIENTE</span>
                  <button type="button" onClick={() => setMostrarFormCliente(false)}
                    style={{color:'#94A3B8',background:'transparent',border:'none',cursor:'pointer',fontSize:'16px'}}>✕</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[
                    {key:'nombre_completo',placeholder:'Nombre completo',label:'NOMBRE *'},
                    {key:'cedula_rif',placeholder:'V-12345678',label:'CÉDULA/RIF *'},
                    {key:'telefono',placeholder:'+58 412-...',label:'TELÉFONO *'},
                    {key:'email',placeholder:'opcional',label:'EMAIL'},
                  ].map(({key,placeholder,label}) => (
                    <div key={key}>
                      <span style={labelStyle}>{label}</span>
                      <input placeholder={placeholder} value={(nuevoClienteData as any)[key]}
                        onChange={e => setNuevoClienteData(p => ({...p, [key]: e.target.value}))}
                        style={inputStyle} />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleCrearCliente} disabled={createCliente.isPending}
                  style={{marginTop:'8px',width:'100%',padding:'8px',background:'#2563eb',border:'none',borderRadius:'0.25rem',color:'#F8FAFC',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>
                  {createCliente.isPending ? 'Creando...' : 'Crear cliente'}
                </button>
              </div>
            )}
          </div>

          {/* PRODUCTOS */}
          <div>
            <label style={labelStyle}>PRODUCTOS</label>
            <ProductAutocomplete productos={productos||[]} onSelect={addLineItem} />
            {form.items.length > 0 && (
              <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'8px'}}>
                {form.items.map((item, idx) => (
                  <LineItemRow key={item.id} item={item} index={idx}
                    onUpdate={(field, value) => updateLineItem(item.id, field, value)}
                    onRemove={() => removeLineItem(item.id)} />
                ))}
              </div>
            )}
          </div>

          {/* CONSUMO DE TINTA — solo al crear */}
          {!editingId && (
            <div style={{padding:'14px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.25rem'}}>
              <label style={labelStyle}>CONSUMO DE TINTA (opcional)</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginTop:'8px'}}>
                {[
                  {key:'magenta',label:'MAGENTA (cc)',color:'#e879f9'},
                  {key:'cian',label:'CIAN (cc)',color:'#22d3ee'},
                  {key:'amarillo',label:'AMARILLO (cc)',color:'#fde047'},
                  {key:'negro',label:'NEGRO (cc)',color:'#94A3B8'},
                ].map(({key,label,color}) => (
                  <div key={key}>
                    <span style={{...labelStyle,color}}>{label}</span>
                    <input type="number" step="0.01" min="0" placeholder="0"
                      value={(consumoTinta as any)[key]}
                      onChange={e => setConsumoTinta(p => ({...p, [key]: e.target.value}))}
                      style={inputStyle} />
                  </div>
                ))}
                <div>
                  <span style={labelStyle}>TINTA</span>
                  <select value={consumoTinta.tipo_tinta_id}
                    onChange={e => setConsumoTinta(p => ({...p, tipo_tinta_id: e.target.value}))}
                    style={{...inputStyle,appearance:'none'} as React.CSSProperties}>
                    <option value="">Seleccionar</option>
                    {tintas?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN DEL PEDIDO */}
          <div style={{padding:'14px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'0.25rem',display:'flex',flexDirection:'column',gap:'12px'}}>
            <label style={labelStyle}>CONFIGURACIÓN DEL PEDIDO</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
              <div>
                <span style={labelStyle}>PRIORIDAD</span>
                <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} style={{...inputStyle,appearance:'none'} as React.CSSProperties}>
                  {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle}>FECHA ENTREGA</span>
                <input type="date" value={form.fecha_limite} onChange={e => setForm({...form, fecha_limite: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>MÁQUINA</span>
                <select value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} style={{...inputStyle,appearance:'none'} as React.CSSProperties}>
                  <option value="">Seleccionar</option>
                  {maquinas?.map((m: any) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
            {editingId && (
              <div>
                <span style={labelStyle}>ESTADO</span>
                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={{...inputStyle,appearance:'none'} as React.CSSProperties}>
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <span style={labelStyle}>NOTAS DEL PEDIDO</span>
              <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                placeholder="Instrucciones especiales, acabados, etc." rows={3}
                style={{...inputStyle,resize:'none',height:'auto'} as React.CSSProperties} />
            </div>
            <div>
              <span style={labelStyle}>URL ARCHIVO (NEXTCLOUD)</span>
              <div style={{position:'relative'}}>
                <span className="material-symbols-outlined" style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',color:'#94A3B8'}}>link</span>
                <input value={form.url_diseno} onChange={e => setForm({...form, url_diseno: e.target.value})}
                  placeholder="URL pública del archivo" style={{...inputStyle,paddingLeft:'32px'}} />
              </div>
            </div>
            <div>
              <span style={labelStyle}>MÉTODO DE PAGO</span>
              <select value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})} style={{...inputStyle,appearance:'none'} as React.CSSProperties}>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {form.metodo_pago === 'Pago Móvil' && (
                <div style={{marginTop:'8px'}}>
                  <span style={labelStyle}>REFERENCIA DE PAGO</span>
                  <input value={form.referencia_pago} onChange={e => setForm({...form, referencia_pago: e.target.value})}
                    placeholder="Número de referencia" style={inputStyle} />
                </div>
              )}
            </div>
            <div>
              <span style={labelStyle}>PRECIO TOTAL (OVERRIDE)</span>
              <div style={{position:'relative'}}>
                <span className="material-symbols-outlined" style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',color:'#94A3B8'}}>attach_money</span>
                <input type="number" step="0.01" min="0" value={form.precio_total}
                  onChange={e => setForm({...form, precio_total: e.target.value})}
                  placeholder="Auto-calculado" style={{...inputStyle,paddingLeft:'32px'}} />
              </div>
              <p style={{fontSize:'11px',color:'#94A3B8',marginTop:'4px'}}>
                {formItemCount > 0 ? `Calculado: $${formTotal.toLocaleString('es-CL')} — deje vacío para usar automático` : 'Deje vacío si usa productos'}
              </p>
            </div>
          </div>

        </div>

        {/* Sidebar derecho — resumen + confirmar */}
        <div style={{width:'200px',flexShrink:0,borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflowY:'auto'}}>

          {/* Resumen */}
          <div style={{padding:'16px',flex:1}}>
            <span style={labelStyle}>RESUMEN DEL PEDIDO</span>
            {formItemCount === 0 ? (
              <div style={{textAlign:'center',padding:'24px 0',color:'#94A3B8'}}>
                <span className="material-symbols-outlined" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:0.4}}>shopping_cart</span>
                <p style={{fontSize:'12px'}}>Agrega productos</p>
              </div>
            ) : (
              <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'6px'}}>
                {form.items.map(item => (
                  <div key={item.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span style={{color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{item.producto_nombre}</span>
                    <span style={{color:'#F8FAFC',fontWeight:'600'}}>${item.subtotal.toLocaleString('es-CL')}</span>
                  </div>
                ))}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'8px',marginTop:'4px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',fontWeight:'700'}}>
                    <span>USD</span>
                    <span style={{color:'#b4c5ff',fontFamily:'Geist, sans-serif'}}>${formTotal.toLocaleString('es-CL')}</span>
                  </div>
                  {dolar?.valor && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',fontWeight:'600',color:'#ffb95f',marginTop:'4px'}}>
                      <span>Bs</span>
                      <span>{(formTotal * dolar.valor).toLocaleString('es-VE',{maximumFractionDigits:0})}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Máquinas */}
          <div style={{padding:'16px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            <span style={labelStyle}>MÁQUINAS</span>
            <div style={{marginTop:'8px',display:'flex',flexDirection:'column',gap:'6px'}}>
              {maquinas?.map((m: any) => {
                const activa = trabajos?.some(t => t.maquina_asignada === m.nombre && t.estado !== 'entregado');
                return (
                  <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'12px'}}>
                    <span style={{color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{m.nombre}</span>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background: activa ? '#ffb95f' : '#10B981',flexShrink:0}} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón confirmar */}
          <div style={{padding:'16px',borderTop:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
            <button onClick={handleSubmit}
              disabled={createPedido.isPending || updatePedido.isPending}
              style={{width:'100%',padding:'10px',background:'#2563eb',border:'none',borderRadius:'0.25rem',color:'#F8FAFC',fontSize:'13px',fontWeight:'700',cursor:'pointer',opacity: (createPedido.isPending || updatePedido.isPending) ? 0.6 : 1}}>
              {createPedido.isPending || updatePedido.isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>

      </div>
    </>
  )}
</div>
```

---

## ESTILOS HELPER — definir antes del return

```tsx
const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94A3B8',
  fontFamily: 'JetBrains Mono, monospace',
  display: 'block',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#060e20',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.25rem',
  padding: '8px 10px',
  color: '#F8FAFC',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};
```

---

## LOADING STATE

```tsx
if (isLoading) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
      <LoadingSpinner size="lg" />
    </div>
  );
}
```

---

## PROHIBICIONES ABSOLUTAS

1. NO usar `Card`, `CardContent`, `Button`, `Badge`, `Input`, `Label` de shadcn/ui
2. NO usar ningún icono de lucide-react
3. NO cambiar ninguna función lógica (`handleSubmit`, `handleEdit`, `handleDelete`, `calcTotal`, etc.)
4. NO cambiar los hooks ni sus llamadas
5. NO cambiar `generarPDF`
6. NO omitir el `consumoTinta` (consumo de tinta al crear pedido)
7. NO cambiar `parseItemsFromPedido` ni `getNotasText`
8. El drawer tiene translateX, NO `display:none` — así la transición funciona

---

## VERIFICACIÓN FINAL

Después del build, verifica:
```bash
cd /home/claudeuser/crm-v2 && npm run build 2>&1 | tail -20
cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/
```

Si hay errores de TypeScript de `appearance:'none'` en select, usa cast: `style={{...inputStyle, appearance:'none'} as React.CSSProperties}`.
