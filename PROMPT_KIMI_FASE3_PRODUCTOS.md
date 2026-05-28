# PROMPT PARA KIMI 2.5 — CRM v2 Fase 3: Catálogo de Productos

> **Tarea**: Reescribir `/home/claudeuser/crm-v2/src/pages/Productos.tsx` aplicando el diseño visual del prototipo Stitch, manteniendo toda la lógica CRUD existente.

---

## CONTEXTO

Mismo proyecto Blue CRM v2 en `/home/claudeuser/crm-v2/`. Acabas de completar la Fase 2 (Clientes). Ahora toca la Fase 3: página de Productos con diseño Stitch tipo "bento grid de cards".

### ⚠️ REGLA DE DEPLOY (igual que siempre)
- **NUNCA** tocar `/home/parabanes/web/crm.biombos.cl/`
- Deploy v2: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`

---

## TOKENS DE DISEÑO (mismos que Fase 2)

```
Fondo:           #0b1326
Cards:           #1E293B  (glass-card)
Hover borde:     rgba(180,197,255,0.3)
Contenedor:      #171f33
Borde sutil:     rgba(255,255,255,0.08)
Primario:        #b4c5ff
Botón acción:    #2563eb
Secundario:      #ffb95f
Terciario:       #4edea3
Alerta:          #EF4444
Texto blanco:    #F8FAFC
Texto muted:     #94A3B8
Status activo:   #10B981
```

Tipografía igual a Fase 2:
- Títulos/métricas: `'Geist, Inter, sans-serif'`
- Body: `'Inter, sans-serif'`
- Labels caps: `'JetBrains Mono, monospace'`, 11px, weight 700, letterSpacing 0.05em, uppercase

Iconos: Material Symbols únicamente — `<span className="material-symbols-outlined">nombre_icono</span>`

---

## ARCHIVO ACTUAL A REEMPLAZAR

```tsx
// src/pages/Productos.tsx — hooks y lógica a CONSERVAR:

const { data: productos, isLoading } = useProductos();
const createProducto = useCreateProducto();
const updateProducto = useUpdateProducto();

// Campos del form:
interface ProductoForm {
  nombre: string;
  precio_m2: string;       // se parsea a float al guardar
  tipo_cobro: 'm2' | 'unidad';
  descripcion: string;
}

// handleSubmit convierte precio_m2 a número:
const payload = {
  nombre: form.nombre,
  precio_m2: parseFloat(form.precio_m2),
  tipo_cobro: form.tipo_cobro,
  descripcion: form.descripcion,
};
// editingId ? updateProducto({ id, ...payload }) : createProducto(payload)

// Filtro:
const filteredProductos = productos?.filter(p =>
  p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
  p.descripcion?.toLowerCase().includes(search.toLowerCase())
) || [];
```

### Hooks (NO modificar useSupabase.ts):
- `useProductos()` → `{ id, nombre, precio_m2, tipo_cobro ('m2'|'unidad'), descripcion, activo }`
- `useCreateProducto()` → mutation
- `useUpdateProducto()` → mutation, recibe `{ id, nombre, precio_m2, tipo_cobro, descripcion }`

---

## DISEÑO OBJETIVO

### Layout:
```
[PageHeader "Catálogo de Productos" | botón "Nuevo Producto"]
[Búsqueda + Pills de filtro: Todos | Por m² | Por Unidad]
[4 mini stat cards]
[Grid de product cards (3 columnas)]
[Drawer lateral para crear/editar]
```

---

### 1. PageHeader
```tsx
import { PageHeader } from '@/components/ui/page-header';
<PageHeader
  title="Catálogo de Productos"
  description={`${filteredProductos.length} productos`}
  icon="inventory_2"
  actions={
    <button onClick={openNewDrawer} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 1rem', backgroundColor:'#2563eb', border:'none', borderRadius:'0.25rem', color:'#eeefff', fontWeight:700, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>
      <span className="material-symbols-outlined" style={{fontSize:'20px'}}>add</span>
      Nuevo Producto
    </button>
  }
/>
```

---

### 2. Búsqueda + Pills de filtro

Estado adicional necesario:
```tsx
const [filterTipo, setFilterTipo] = useState<'todos' | 'm2' | 'unidad'>('todos');
```

Aplicar filtro en `filteredProductos`:
```tsx
const filteredProductos = productos?.filter(p => {
  const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(search.toLowerCase());
  const matchTipo = filterTipo === 'todos' || p.tipo_cobro === filterTipo;
  return matchSearch && matchTipo;
}) || [];
```

Barra de búsqueda (igual a Clientes):
```tsx
<div className="relative">
  <span className="material-symbols-outlined" style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', fontSize:'18px', color:'#94A3B8' }}>search</span>
  <Input className="pl-10" placeholder="Buscar por nombre o descripción..." value={search} onChange={e => setSearch(e.target.value)} />
</div>
```

Pills de filtro (debajo de la búsqueda):
```tsx
<div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
  {(['todos','m2','unidad'] as const).map(tipo => (
    <button key={tipo} onClick={() => setFilterTipo(tipo)}
      style={{
        padding:'0.375rem 1rem', borderRadius:'999px',
        backgroundColor: filterTipo === tipo ? '#b4c5ff' : '#171f33',
        color: filterTipo === tipo ? '#002a78' : '#94A3B8',
        border: filterTipo === tipo ? 'none' : '1px solid rgba(255,255,255,0.08)',
        fontWeight: filterTipo === tipo ? 700 : 500,
        fontFamily:'Inter,sans-serif', fontSize:'13px', cursor:'pointer',
      }}>
      {tipo === 'todos' ? 'Todos' : tipo === 'm2' ? 'Por m²' : 'Por Unidad'}
    </button>
  ))}
</div>
```

---

### 3. Stats Bar (4 mini-cards)

```tsx
const totalProductos    = productos?.length || 0;
const productosPorM2    = productos?.filter(p => p.tipo_cobro === 'm2').length || 0;
const productosPorUnidad = productos?.filter(p => p.tipo_cobro === 'unidad').length || 0;
const precioPromedio    = productos && productos.length > 0
  ? (productos.reduce((s,p) => s + (p.precio_m2 || 0), 0) / productos.length).toFixed(2)
  : '0.00';
```

Estilo de cada stat card (mismo de Fase 2):
```tsx
// backgroundColor:'#1E293B', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'0.25rem', padding:'1rem'
// label: JetBrains Mono 11px caps color #94A3B8
// valor: Geist 24px bold, color según acento
```

Cards:
- **Total** → valor: `totalProductos`, ícono: `inventory_2`, color: `#b4c5ff`
- **Por m²** → valor: `productosPorM2`, ícono: `straighten`, color: `#b4c5ff`
- **Por Unidad** → valor: `productosPorUnidad`, ícono: `deployed_code`, color: `#4edea3`
- **Precio Promedio** → valor: `$${precioPromedio}`, ícono: `payments`, color: `#ffb95f`

Grid: `display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem'`

---

### 4. Grid de Product Cards (diseño Stitch adaptado)

El Stitch muestra cards con imagen + specs. Nosotros no tenemos imágenes, así que usamos un **header de color con icono grande**.

Grid: `display:'grid', gridTemplateColumns:'repeat(1,1fr)', gap:'1.5rem'`  
Con responsive via clases: `className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"`

#### Estructura de cada product card:

```tsx
{filteredProductos.map(producto => {
  const esM2 = producto.tipo_cobro === 'm2';
  const accentColor = esM2 ? '#b4c5ff' : '#4edea3';
  const headerBg = esM2 ? 'rgba(37,99,235,0.15)' : 'rgba(0,125,85,0.15)';

  return (
    <div key={producto.id}
      style={{
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.25rem',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(180,197,255,0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Header de color con ícono */}
      <div style={{
        height: '7rem',
        backgroundColor: headerBg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ícono grande decorativo de fondo */}
        <span className="material-symbols-outlined" style={{
          position: 'absolute', right: '-1rem', bottom: '-1rem',
          fontSize: '7rem', color: accentColor, opacity: 0.08,
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {esM2 ? 'straighten' : 'deployed_code'}
        </span>
        {/* Badge tipo cobro */}
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: `${accentColor}22`,
          color: accentColor,
          border: `1px solid ${accentColor}44`,
          borderRadius: '0.125rem',
          fontSize: '10px', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {esM2 ? 'Por m²' : 'Por Unidad'}
        </span>
        {/* Botón editar */}
        <button onClick={() => openDrawer(producto)}
          style={{
            padding: '0.375rem', backgroundColor: `${accentColor}18`,
            border: `1px solid ${accentColor}33`,
            borderRadius: '0.25rem', cursor: 'pointer', color: accentColor,
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${accentColor}33`)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${accentColor}18`)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Nombre + Precio */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{
            fontFamily: 'Geist, Inter, sans-serif', fontSize: '16px',
            fontWeight: 600, color: '#F8FAFC', margin: 0, flex: 1, paddingRight: '0.5rem',
          }}>
            {producto.nombre}
          </h3>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'Geist, Inter, sans-serif', fontSize: '22px',
              fontWeight: 700, letterSpacing: '-0.01em', color: accentColor,
            }}>
              ${producto.precio_m2?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              {esM2 ? 'por m²' : 'por unidad'}
            </div>
          </div>
        </div>

        {/* Descripción */}
        {producto.descripcion && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#94A3B8',
            margin: '0 0 1rem 0', lineHeight: '1.5',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {producto.descripcion}
          </p>
        )}

        {/* Spec row: tipo cobro */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '1rem', marginTop: 'auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {esM2 ? 'straighten' : 'deployed_code'}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Cobro:</span>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
            {esM2 ? 'Metro Cuadrado' : 'Por Unidad'}
          </span>
        </div>
      </div>
    </div>
  );
})}
```

#### Estado vacío:
```tsx
{filteredProductos.length === 0 && (
  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 0', color: '#94A3B8' }}>
    <span className="material-symbols-outlined" style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}>inventory_2</span>
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
      {search ? 'No se encontraron productos' : 'No hay productos registrados'}
    </p>
  </div>
)}
```

---

### 5. Drawer lateral (igual patrón que Clientes)

Estado:
```tsx
const [drawerProducto, setDrawerProducto] = useState<any | null>(null);

function openDrawer(producto: any) {
  setForm({ nombre: producto.nombre || '', precio_m2: producto.precio_m2?.toString() || '', tipo_cobro: producto.tipo_cobro || 'm2', descripcion: producto.descripcion || '' });
  setEditingId(producto.id);
  setDrawerProducto(producto);
}
function openNewDrawer() {
  setForm(emptyForm);
  setEditingId(null);
  setDrawerProducto({ id: '__new__', nombre: 'Nuevo Producto' });
}
function closeDrawer() {
  setDrawerProducto(null);
  setEditingId(null);
  setForm(emptyForm);
}
```

Estructura del drawer (mismos estilos que Fase 2, adaptado):

```tsx
{/* Overlay */}
{drawerProducto && (
  <div onClick={closeDrawer} style={{ position:'fixed', inset:0, backgroundColor:'rgba(11,17,32,0.7)', backdropFilter:'blur(4px)', zIndex:60 }} />
)}

{/* Drawer */}
<aside style={{
  position:'fixed', top:0, right:0, height:'100vh', width:'440px',
  backgroundColor:'#1E293B', borderLeft:'1px solid rgba(255,255,255,0.08)',
  zIndex:70, display:'flex', flexDirection:'column',
  boxShadow:'-8px 0 32px rgba(0,0,0,0.4)',
  transform: drawerProducto ? 'translateX(0)' : 'translateX(100%)',
  transition:'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
}}>
  {/* Header */}
  <header style={{ padding:'1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
    <div>
      <span style={{ fontSize:'10px', fontFamily:'JetBrains Mono,monospace', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#b4c5ff', backgroundColor:'rgba(180,197,255,0.1)', padding:'2px 8px', borderRadius:'0.125rem', display:'inline-block', marginBottom:'0.5rem' }}>
        {editingId && editingId !== '__new__' ? 'Editar Producto' : 'Nuevo Producto'}
      </span>
      <h3 style={{ fontFamily:'Geist,Inter,sans-serif', fontSize:'20px', fontWeight:600, color:'#F8FAFC', margin:0 }}>
        {drawerProducto?.nombre || 'Nuevo Producto'}
      </h3>
    </div>
    <button onClick={closeDrawer} className="material-symbols-outlined"
      style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', fontSize:'24px', width:'2.5rem', height:'2.5rem', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
    >close</button>
  </header>

  {/* Form Body */}
  <div style={{ flex:1, overflowY:'auto', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
    {/* Nombre */}
    <div>
      <label style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#94A3B8', marginBottom:'0.5rem' }}>Nombre *</label>
      <Input value={form.nombre} onChange={e => setForm({...form, nombre:e.target.value})} placeholder="Nombre del producto" required />
    </div>
    {/* Precio + Tipo Cobro en grid */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
      <div>
        <label style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#94A3B8', marginBottom:'0.5rem' }}>Precio *</label>
        <Input type="number" step="0.01" min="0" value={form.precio_m2} onChange={e => setForm({...form, precio_m2:e.target.value})} placeholder="0.00" required />
      </div>
      <div>
        <label style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#94A3B8', marginBottom:'0.5rem' }}>Tipo de Cobro</label>
        <select value={form.tipo_cobro} onChange={e => setForm({...form, tipo_cobro: e.target.value as 'm2'|'unidad'})}
          style={{ width:'100%', padding:'0.5rem 0.75rem', backgroundColor:'#171f33', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'0.25rem', color:'#F8FAFC', fontFamily:'Inter,sans-serif', fontSize:'14px', outline:'none', height:'2.5rem' }}>
          <option value="m2">Por m²</option>
          <option value="unidad">Por Unidad</option>
        </select>
      </div>
    </div>
    {/* Descripción */}
    <div>
      <label style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#94A3B8', marginBottom:'0.5rem' }}>Descripción</label>
      <Input value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} placeholder="Descripción del producto" />
    </div>
  </div>

  {/* Footer */}
  <footer style={{ padding:'1.5rem', borderTop:'1px solid rgba(255,255,255,0.08)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
    <button type="button" onClick={closeDrawer}
      style={{ padding:'0.75rem', backgroundColor:'#2d3449', border:'none', borderRadius:'0.25rem', color:'#F8FAFC', fontWeight:700, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>
      Cancelar
    </button>
    <button type="button" onClick={handleSubmit as any}
      disabled={createProducto.isPending || updateProducto.isPending}
      style={{ padding:'0.75rem', backgroundColor:'#2563eb', border:'none', borderRadius:'0.25rem', color:'#eeefff', fontWeight:700, fontFamily:'Inter,sans-serif', cursor:'pointer', opacity:(createProducto.isPending||updateProducto.isPending)?0.7:1 }}>
      {(createProducto.isPending||updateProducto.isPending) ? 'Guardando...' : 'Guardar'}
    </button>
  </footer>
</aside>
```

---

## ESTRUCTURA DEL RETURN

```tsx
return (
  <>
    <div className="space-y-6 animate-fade-in">
      {/* 1. PageHeader */}
      {/* 2. Búsqueda */}
      {/* 3. Pills de filtro */}
      {/* 4. Stats bar (4 cards) */}
      {/* 5. Grid de producto cards */}
    </div>

    {/* 6. Overlay */}
    {/* 7. Drawer */}
  </>
);
```

---

## IMPORTS NECESARIOS

```tsx
import { useState } from 'react';
import { useProductos, useCreateProducto, useUpdateProducto } from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
```

**Eliminar**: `Card, CardContent, CardHeader, CardTitle, Label, Badge`, todos de `lucide-react`, `Button` (usar botones con style inline como en los ejemplos de arriba)

---

## handleSubmit adaptado al drawer

Como el submit ya no es un `<form onSubmit>`, usa esto:

```tsx
const handleSubmit = async () => {
  if (!form.nombre || !form.precio_m2) {
    alert('Nombre y Precio son obligatorios');
    return;
  }
  const payload = {
    nombre: form.nombre,
    precio_m2: parseFloat(form.precio_m2),
    tipo_cobro: form.tipo_cobro,
    descripcion: form.descripcion,
  };
  if (editingId && editingId !== '__new__') {
    await updateProducto.mutateAsync({ id: editingId, ...payload });
  } else {
    await createProducto.mutateAsync(payload);
  }
  closeDrawer();
};
```

---

## PASOS A EJECUTAR

1. **Leer** el archivo actual: `Read /home/claudeuser/crm-v2/src/pages/Productos.tsx`
2. **Reescribir** con el nuevo diseño
3. **Build**: `cd /home/claudeuser/crm-v2 && npm run build`
4. **Deploy al v2**: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`
5. **Reportar** resultado del build

---

## LO QUE NO DEBES HACER

- ❌ No modificar ningún otro archivo
- ❌ No tocar `crm.biombos.cl` (producción)
- ❌ No usar `lucide-react`
- ❌ No usar componentes `Card` de shadcn
- ❌ No agregar campos nuevos al formulario
- ❌ No cambiar el patrón de mutation (`updateProducto.mutateAsync`)
