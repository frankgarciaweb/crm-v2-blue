# PROMPT PARA KIMI 2.5 — CRM v2 Fase 2: Página de Clientes

> **Tarea**: Reescribir `/home/claudeuser/crm-v2/src/pages/Clientes.tsx` aplicando el diseño visual del prototipo Stitch, manteniendo toda la lógica CRUD existente.

---

## CONTEXTO DEL PROYECTO

Estás trabajando en un CRM React llamado **Blue CRM v2** ubicado en `/home/claudeuser/crm-v2/`.

- Stack: React 19 + TypeScript + Vite + Tailwind v4
- Los colores y tokens ya están definidos como variables CSS en `src/index.css`
- Hay componentes de Design System en `src/components/ui/`
- El proyecto ya compila y corre. **No cambies ningún archivo salvo `Clientes.tsx`**

### ⚠️ REGLA CRÍTICA DE DEPLOY
- **NUNCA** tocar `/home/parabanes/web/crm.biombos.cl/` — eso es producción del CRM v1
- El v2 se despliega **SOLO** a `/home/claudeuser/crm-v2-deploy/`
- Comando de deploy del v2: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`

---

## TOKENS DE DISEÑO (ya en index.css — usar estos valores exactos)

```
Fondo página:        #0b1326
Tarjetas/paneles:    #1E293B
Fondo contenedor:    #171f33
Fondo hover filas:   #222a3d
Fondo más oscuro:    #060e20
Borde sutil:         rgba(255,255,255,0.08)
Primario (azul):     #b4c5ff
Primario botones:    #2563eb
Secundario (ámbar):  #ffb95f
Terciario (verde):   #4edea3
Alerta (rojo):       #EF4444
Texto blanco:        #F8FAFC
Texto secundario:    #94A3B8
Texto muted:         #8d90a0
Status activo:       #10B981
Status producción:   #3B82F6
```

### Tipografía Stitch:
- **Títulos / métricas**: `fontFamily: 'Geist, Inter, sans-serif'`
- **Body / tablas**: `fontFamily: 'Inter, sans-serif'`
- **Headers de tabla (CAPS)**: `fontFamily: 'JetBrains Mono, monospace'`, fontSize: 11px, fontWeight: 700, letterSpacing: 0.05em, textTransform: uppercase

### Border radius industrial:
- Cards/paneles: `borderRadius: '0.25rem'`
- Badges inline: `borderRadius: '0.125rem'`

### Iconos: Material Symbols (NO lucide-react)
```tsx
<span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#b4c5ff' }}>
  person_add
</span>
```
Los iconos ya están disponibles (la fuente está cargada en index.html).

---

## COMPONENTES DISPONIBLES EN src/components/ui/

- `PageHeader` — usa para el encabezado de la página
  ```tsx
  import { PageHeader } from '@/components/ui/page-header';
  <PageHeader title="Clientes" description="Gestión de clientes" icon="group" actions={<Button>...</Button>} />
  ```
- `LoadingSpinner` — ya usado en el archivo actual
- `Button`, `Input`, `Label`, `Badge` — igual que antes

**No uses**: `Card`, `CardContent`, `CardHeader`, `CardTitle` (son del diseño viejo)

---

## ARCHIVO ACTUAL: src/pages/Clientes.tsx

```tsx
import { useState } from 'react';
import { useClientes, useCreateCliente, useUpdateCliente } from '@/hooks/useSupabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Users, Plus, Search, Edit, Phone, Mail, MapPin
} from 'lucide-react';

interface ClienteForm {
  nombre_completo: string;
  telefono: string;
  cedula_rif: string;
  email: string;
  direccion: string;
}

const emptyForm: ClienteForm = {
  nombre_completo: '',
  telefono: '',
  cedula_rif: '',
  email: '',
  direccion: '',
};

export default function Clientes() {
  const { data: clientes, isLoading } = useClientes();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);

  const filteredClientes = clientes?.filter(c =>
    c.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
    c.cedula_rif?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search)
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_completo || !form.cedula_rif) {
      alert('Nombre y Cédula/RIF son obligatorios');
      return;
    }
    if (editingId) {
      await updateCliente.mutateAsync({ id: editingId, updates: form });
    } else {
      await createCliente.mutateAsync(form as unknown as Record<string, unknown>);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cliente: any) => {
    setForm({
      nombre_completo: cliente.nombre_completo || '',
      telefono: cliente.telefono || '',
      cedula_rif: cliente.cedula_rif || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
    });
    setEditingId(cliente.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ... resto del componente ... */}
    </div>
  );
}
```

### Hooks disponibles (NO modificar useSupabase.ts):
- `useClientes()` → retorna array de clientes con campos: `id, nombre_completo, telefono, cedula_rif, email, direccion, activo`
- `useCreateCliente()` → mutation para crear
- `useUpdateCliente()` → mutation para actualizar, recibe `{ id, updates }`

---

## DISEÑO OBJETIVO (basado en prototipo Stitch)

### Layout general:
```
[PageHeader: "Clientes" | botón "Registrar Cliente"]
[Barra de búsqueda]
[4 StatCards: Total, Activos, Con Email, Con Teléfono]
[Tabla de clientes con drawer lateral]
```

### 1. Page Header
Usar `PageHeader` con:
- title: "Clientes"
- description: `"${filteredClientes.length} registros"`  
- icon: "group"
- actions: botón "Registrar Cliente" con ícono `person_add`

### 2. Búsqueda
Input con ícono `search` de Material Symbols a la izquierda. Placeholder: "Buscar por nombre, cédula o teléfono..."

### 3. Stats Bar — 4 mini-cards
Calcular con datos reales de `clientes`:
- **Total Clientes** — `clientes?.length || 0` — ícono `group`, color primario
- **Activos** — `clientes?.filter(c => c.activo !== false).length || 0` — ícono `check_circle`, color tertiary (#4edea3)
- **Con Email** — `clientes?.filter(c => c.email).length || 0` — ícono `email`, color primario
- **Con Teléfono** — `clientes?.filter(c => c.telefono).length || 0` — ícono `phone`, color secundario (#ffb95f)

Estilo de cada mini-card:
```tsx
<div style={{
  backgroundColor: '#1E293B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.25rem',
  padding: '1rem',
}}>
  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
    LABEL
  </p>
  <p style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: COLOR }}>
    VALOR
  </p>
</div>
```

### 4. Tabla de Clientes (Stitch style)
Tabla full-width dentro de un contenedor con `backgroundColor: '#1E293B'`, borde sutil, borderRadius 0.25rem.

**Columnas**: CLIENTE (avatar + nombre + email) | CÉDULA/RIF | TELÉFONO | DIRECCIÓN | ESTADO | ACCIONES

**Header de tabla** (fondo `#060e20`, borde inferior sutil):
```tsx
<th style={{
  padding: '1rem 1.5rem',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#8d90a0',
  textAlign: 'left',
}}>CLIENTE</th>
```

**Fila de tabla** (hover fondo `#222a3d`):
```tsx
<tr
  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#222a3d'}
  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
  onClick={() => openDrawer(cliente)}
>
```

**Columna CLIENTE** — avatar con iniciales:
```tsx
// Generar iniciales y color del avatar
function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
const AVATAR_COLORS = ['#2563eb', '#007d55', '#653e00', '#0053db', '#93000a'];
function getAvatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

// En el JSX:
<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
  <div style={{
    width: '2rem', height: '2rem', borderRadius: '0.25rem',
    backgroundColor: `${getAvatarColor(cliente.id)}33`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#b4c5ff', fontWeight: 700, fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
  }}>
    {getInitials(cliente.nombre_completo || '?')}
  </div>
  <div>
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
      {cliente.nombre_completo}
    </p>
    {cliente.email && (
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8', margin: 0 }}>
        {cliente.email}
      </p>
    )}
  </div>
</div>
```

**Columna ESTADO** — badge activo/inactivo:
```tsx
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
  fontSize: '11px', fontWeight: 700,
  color: cliente.activo !== false ? '#10B981' : '#EF4444',
}}>
  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cliente.activo !== false ? '#10B981' : '#EF4444' }} />
  {cliente.activo !== false ? 'ACTIVO' : 'INACTIVO'}
</span>
```

**Columna ACCIONES** — ícono Material Symbols:
```tsx
<button
  onClick={e => { e.stopPropagation(); openDrawer(cliente); }}
  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
  onMouseEnter={e => (e.currentTarget.style.color = '#b4c5ff')}
  onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
>
  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
</button>
```

**Estado vacío** (si no hay clientes):
```tsx
<tr>
  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
    <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '0.5rem' }}>group</span>
    {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
  </td>
</tr>
```

### 5. Drawer lateral (panel deslizable desde la derecha)
El drawer reemplaza el formulario inline Card del diseño anterior.

**Estado necesario** (agregar al componente):
```tsx
const [drawerCliente, setDrawerCliente] = useState<any | null>(null);

function openDrawer(cliente: any) {
  setForm({
    nombre_completo: cliente.nombre_completo || '',
    telefono: cliente.telefono || '',
    cedula_rif: cliente.cedula_rif || '',
    email: cliente.email || '',
    direccion: cliente.direccion || '',
  });
  setEditingId(cliente.id);
  setDrawerCliente(cliente);
}

function closeDrawer() {
  setDrawerCliente(null);
  setEditingId(null);
  setForm(emptyForm);
}

function openNewForm() {
  setForm(emptyForm);
  setEditingId(null);
  setDrawerCliente({ id: '__new__', nombre_completo: 'Nuevo Cliente' }); // sentinel para abrir drawer vacío
}
```

**Estructura del Drawer** (fuera del div principal, después del return):
```tsx
{/* Overlay */}
{drawerCliente && (
  <div
    onClick={closeDrawer}
    style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(11,17,32,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 60,
    }}
  />
)}

{/* Drawer */}
<aside style={{
  position: 'fixed', top: 0, right: 0,
  height: '100vh', width: '480px',
  backgroundColor: '#1E293B',
  borderLeft: '1px solid rgba(255,255,255,0.08)',
  zIndex: 70,
  display: 'flex', flexDirection: 'column',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
  transform: drawerCliente ? 'translateX(0)' : 'translateX(100%)',
  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
}}>
  {/* Header */}
  <header style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div>
      <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b4c5ff', backgroundColor: 'rgba(180,197,255,0.1)', padding: '2px 8px', borderRadius: '0.125rem', display: 'inline-block', marginBottom: '0.5rem' }}>
        {editingId && editingId !== '__new__' ? 'Editar Cliente' : 'Nuevo Cliente'}
      </span>
      <h3 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
        {drawerCliente?.nombre_completo || 'Nuevo Cliente'}
      </h3>
    </div>
    <button onClick={closeDrawer} className="material-symbols-outlined"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '24px', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3449')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
    >close</button>
  </header>

  {/* Form */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Campo: Nombre Completo */}
      <div>
        <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
          Nombre Completo *
        </label>
        <Input value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} placeholder="Nombre completo" required />
      </div>
      {/* Campo: Cédula/RIF */}
      <div>
        <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
          Cédula / RIF *
        </label>
        <Input value={form.cedula_rif} onChange={e => setForm({ ...form, cedula_rif: e.target.value })} placeholder="V-12345678" required />
      </div>
      {/* Teléfono + Email en grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Teléfono</label>
          <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+58 412..." />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Email</label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
        </div>
      </div>
      {/* Dirección */}
      <div>
        <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Dirección</label>
        <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección completa" />
      </div>
    </form>
  </div>

  {/* Footer con botones */}
  <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
    <button type="button" onClick={closeDrawer}
      style={{ padding: '0.75rem', backgroundColor: '#2d3449', border: 'none', borderRadius: '0.25rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
      Cancelar
    </button>
    <button type="button" onClick={handleSubmit as any}
      disabled={createCliente.isPending || updateCliente.isPending}
      style={{ padding: '0.75rem', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.25rem', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: (createCliente.isPending || updateCliente.isPending) ? 0.7 : 1 }}>
      {(createCliente.isPending || updateCliente.isPending) ? 'Guardando...' : 'Guardar'}
    </button>
  </footer>
</aside>
```

---

## ESTRUCTURA FINAL DEL COMPONENTE

El componente debe retornar:
```tsx
return (
  <>
    <div className="space-y-6 animate-fade-in">
      {/* 1. PageHeader */}
      {/* 2. Búsqueda */}
      {/* 3. Stats Bar (4 cards) */}
      {/* 4. Tabla */}
    </div>

    {/* 5. Overlay */}
    {/* 6. Drawer */}
  </>
);
```

**Importante**: el drawer y el overlay deben estar fuera del `div.space-y-6` principal, para que el posicionamiento `fixed` funcione correctamente.

---

## IMPORTS NECESARIOS

```tsx
import { useState } from 'react';
import { useClientes, useCreateCliente, useUpdateCliente } from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
```

**Quitar imports**: `Card, CardContent, CardHeader, CardTitle`, todos los de `lucide-react`, `Label`, `Badge`

---

## PASOS A EJECUTAR

1. **Leer** el archivo actual completo: `Read /home/claudeuser/crm-v2/src/pages/Clientes.tsx`
2. **Reescribir** `Clientes.tsx` con el nuevo diseño (usando este prompt como guía)
3. **Compilar**: `cd /home/claudeuser/crm-v2 && npm run build`
   - Si hay error de TypeScript: corregirlo y recompilar
4. **Deploy al v2**: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`
5. **Reportar**: confirmar que el build fue exitoso e indicar qué cambió

---

## LO QUE NO DEBES HACER

- ❌ No modificar ningún otro archivo
- ❌ No instalar dependencias
- ❌ No cambiar `useSupabase.ts`
- ❌ No tocar `/home/parabanes/web/crm.biombos.cl/` (producción v1)
- ❌ No usar `lucide-react` — solo Material Symbols
- ❌ No usar componentes `Card` de shadcn — usar divs con style inline
- ❌ No agregar campos nuevos al formulario ni cambiar la lógica de submit

---

## RESULTADO ESPERADO

La página de Clientes debe verse similar a este wireframe:

```
┌─ Clientes ──────────────────────────── [Registrar Cliente] ─┐
│ Buscar por nombre, cédula o teléfono...                      │
├──────────┬──────────┬──────────┬──────────────────────────── │
│ 42       │ 40       │ 35       │ 38                          │
│ TOTAL    │ ACTIVOS  │ CON EMAIL│ CON TELÉFONO                │
├──────────┴──────────┴──────────┴──────────────────────────── │
│ CLIENTE          │ CÉDULA   │ TELÉFONO  │ ESTADO  │ ACCIÓN  │
├──────────────────┼──────────┼───────────┼─────────┼─────────│
│ [JG] Juan García │ V-123... │ 0412-...  │ ● ACTIVO│  edit   │
│ [MP] María Pérez │ V-456... │ —         │ ● ACTIVO│  edit   │
└──────────────────────────────────────────────────────────────┘

Al hacer clic en una fila → se abre drawer desde la derecha con el formulario de edición
```
