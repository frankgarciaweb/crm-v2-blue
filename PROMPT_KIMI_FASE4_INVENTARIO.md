# PROMPT PARA KIMI 2.5 — CRM v2 Fase 4: Inventario

> **Tarea**: Reescribir `/home/claudeuser/crm-v2/src/pages/Inventario.tsx` con diseño Stitch. Es el más complejo hasta ahora: 2 tabs (Materiales + Tintas), tabla con barras de progreso, 3 formularios (crear/editar material, reabastecer material, reabastecer tinta), todos como drawers laterales.

---

## REGLA DE DEPLOY
- Solo a: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`
- Nunca tocar `/home/parabanes/web/crm.biombos.cl/`

---

## TOKENS (mismos siempre)

```
Fondo:        #0b1326    Cards: #1E293B    Contenedor: #171f33
Borde sutil:  rgba(255,255,255,0.08)       Hover fila: #222a3d
Header tabla: #060e20
Primario:     #b4c5ff    Botón acción: #2563eb
Secundario:   #ffb95f    Terciario: #4edea3    Alerta: #EF4444
Texto:        #F8FAFC    Muted: #94A3B8    Outline: #8d90a0
Status ok:    #10B981    Status warn: #ffb95f   Status error: #EF4444
```

Tipografía: Geist (métricas), Inter (body), JetBrains Mono (caps labels 11px).
Iconos: solo `<span className="material-symbols-outlined">`.

---

## LÓGICA A CONSERVAR (NO cambiar)

```tsx
// Hooks — no tocar useSupabase.ts
const { data: materiales } = useMateriales();
const { data: tintas }     = useTintas();
const createMaterial  = useCreateMaterial();
const updateMaterial  = useUpdateMaterial();
const updateTinta     = useUpdateTinta();

// Tab state
const [activeTab, setActiveTab] = useState<'materiales' | 'tintas'>('materiales');

// Material form
const [materialForm, setMaterialForm] = useState({
  tipo:'', ancho:'', largo_original:'', largo_restante:'', stock:'', precio_metro:''
});
async function handleSaveMaterial() {
  const data = {
    tipo: materialForm.tipo,
    ancho: Number(materialForm.ancho),
    largo_original: Number(materialForm.largo_original),
    largo_restante: Number(materialForm.largo_restante),
    stock: Number(materialForm.stock),
    precio_metro: Number(materialForm.precio_metro),
  };
  if (editingMaterial) {
    await updateMaterial.mutateAsync({ id: editingMaterial.id, ...data });
  } else {
    await createMaterial.mutateAsync(data);
  }
  closeMaterialDrawer();
}

// Reabastecer material
async function handleReabastecerMaterial() {
  if (!reabastecerMaterialId || !metrosAgregar) return;
  const material = materiales?.find((m:any) => m.id === reabastecerMaterialId);
  if (!material) return;
  await updateMaterial.mutateAsync({
    id: reabastecerMaterialId,
    largo_restante: Number(material.largo_restante) + Number(metrosAgregar),
    stock: Number(material.stock) + 1,
  });
  setReabastecerMaterialId(null);
  setMetrosAgregar('');
}

// Reabastecer tinta
async function handleReabastecerTinta() {
  if (!reabastecerTintaId) return;
  const tinta = tintas?.find((t:any) => t.id === reabastecerTintaId);
  if (!tinta) return;
  await updateTinta.mutateAsync({
    id: reabastecerTintaId,
    magenta_cantidad:  Number(tinta.magenta_cantidad)  + Number(tintaAgregar.magenta  || 0),
    cian_cantidad:     Number(tinta.cian_cantidad)     + Number(tintaAgregar.cian     || 0),
    amarillo_cantidad: Number(tinta.amarillo_cantidad) + Number(tintaAgregar.amarillo || 0),
    negro_cantidad:    Number(tinta.negro_cantidad)    + Number(tintaAgregar.negro    || 0),
  });
  setReabastecerTintaId(null);
  setTintaAgregar({ magenta:'', cian:'', amarillo:'', negro:'' });
}

// Tintas: schema real CMYK (una fila = un set de tintas)
// campos: magenta_cantidad, cian_cantidad, amarillo_cantidad, negro_cantidad
//         magenta_minimo,   cian_minimo,   amarillo_minimo,   negro_minimo
```

---

## DISEÑO OBJETIVO

### Layout general:
```
[PageHeader "Inventario" | botón "Nuevo Material" (solo en tab Materiales)]
[4 Summary cards: Total Materiales, Stock Bajo, Total Tintas, Tintas bajo mínimo]
[Segmented nav: Materiales | Tintas]
[Contenido del tab activo]
[Drawers laterales (3 en total)]
```

---

### 1. PageHeader

```tsx
import { PageHeader } from '@/components/ui/page-header';

<PageHeader
  title="Inventario"
  description="Control de materiales y tintas"
  icon="warehouse"
  actions={
    activeTab === 'materiales' ? (
      <button onClick={openNewMaterialDrawer} style={{
        display:'flex', alignItems:'center', gap:'0.5rem',
        padding:'0.5rem 1rem', backgroundColor:'#2563eb', border:'none',
        borderRadius:'0.25rem', color:'#eeefff', fontWeight:700,
        fontFamily:'Inter,sans-serif', cursor:'pointer'
      }}>
        <span className="material-symbols-outlined" style={{fontSize:'18px'}}>add</span>
        Nuevo Material
      </button>
    ) : undefined
  }
/>
```

---

### 2. Summary Cards (4, siempre visibles)

```tsx
const bajaMateriales = materiales?.filter(m => m.stock <= 5 || m.largo_restante <= 10) || [];
const bajaTintas = tintas?.filter(t =>
  (t.magenta_cantidad||0) < (t.magenta_minimo||0) ||
  (t.cian_cantidad||0)    < (t.cian_minimo||0)    ||
  (t.amarillo_cantidad||0)< (t.amarillo_minimo||0) ||
  (t.negro_cantidad||0)   < (t.negro_minimo||0)
) || [];
```

Grid de 4 cards en línea. Estilo igual a fases anteriores (JetBrains Mono label, Geist metric):

| Label | Valor | Ícono | Color |
|---|---|---|---|
| MATERIALES | `materiales?.length \|\| 0` | `texture` | `#b4c5ff` |
| STOCK BAJO | `bajaMateriales.length` | `warning` | `#ffb95f` |
| SETS TINTA | `tintas?.length \|\| 0` | `palette` | `#b4c5ff` |
| TINTAS BAJAS | `bajaTintas.length` | `colorize` | `#EF4444` |

Si STOCK BAJO > 0 → color `#ffb95f`. Si TINTAS BAJAS > 0 → color `#EF4444`.

---

### 3. Segmented Nav (tabs)

```tsx
<div style={{
  display:'inline-flex', padding:'0.25rem',
  backgroundColor:'#131b2e',
  border:'1px solid rgba(255,255,255,0.08)',
  borderRadius:'0.375rem', gap:'0.25rem',
}}>
  {(['materiales','tintas'] as const).map(tab => (
    <button key={tab} onClick={() => setActiveTab(tab)} style={{
      padding:'0.375rem 1.25rem',
      backgroundColor: activeTab === tab ? '#b4c5ff' : 'transparent',
      color: activeTab === tab ? '#002a78' : '#94A3B8',
      border: 'none', borderRadius:'0.25rem',
      fontWeight: activeTab === tab ? 700 : 500,
      fontFamily:'Inter,sans-serif', fontSize:'13px', cursor:'pointer',
      transition:'all 0.15s',
    }}>
      {tab === 'materiales' ? 'Materiales' : 'Tintas CMYK'}
    </button>
  ))}
</div>
```

---

### 4. Tab Materiales — Tabla Stitch

Tabla full-width dentro de contenedor `background:#1E293B`, borde sutil, borderRadius 0.25rem.

**Búsqueda** encima de la tabla:
```tsx
const [searchMateriales, setSearchMateriales] = useState('');
const filteredMateriales = materiales?.filter(m =>
  m.tipo?.toLowerCase().includes(searchMateriales.toLowerCase())
) || [];
```

**Columnas**: MATERIAL | ANCHO | LARGO RESTANTE | STOCK | PRECIO/m | ACCIONES

**Header** (fondo `#060e20`, JetBrains Mono 11px caps):
```tsx
<thead>
  <tr style={{ backgroundColor:'#060e20', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
    {['MATERIAL','ANCHO','LARGO RESTANTE','STOCK','PRECIO/m','ACCIONES'].map(h => (
      <th key={h} style={{
        padding:'1rem 1.5rem', textAlign:'left',
        fontFamily:'JetBrains Mono,monospace', fontSize:'11px',
        fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#8d90a0'
      }}>{h}</th>
    ))}
  </tr>
</thead>
```

**Fila** con hover:
```tsx
{filteredMateriales.map(material => {
  const pct = material.largo_original > 0
    ? Math.min(100, Math.round((material.largo_restante / material.largo_original) * 100))
    : 0;
  const isLow = material.stock <= 5 || material.largo_restante <= 10;
  const barColor = pct < 20 ? '#EF4444' : pct < 50 ? '#ffb95f' : '#10B981';

  return (
    <tr key={material.id}
      style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor='#222a3d'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor=''}
    >
      {/* MATERIAL */}
      <td style={{ padding:'1rem 1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{
            width:'2rem', height:'2rem', borderRadius:'0.25rem',
            backgroundColor: isLow ? 'rgba(255,185,95,0.15)' : 'rgba(180,197,255,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize:'16px', color: isLow ? '#ffb95f' : '#b4c5ff' }}>texture</span>
          </div>
          <div>
            <p style={{ fontFamily:'Inter,sans-serif', fontSize:'13px', fontWeight:600, color:'#F8FAFC', margin:0 }}>{material.tipo}</p>
            {isLow && (
              <span style={{ fontSize:'10px', color:'#ffb95f', fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>STOCK BAJO</span>
            )}
          </div>
        </div>
      </td>

      {/* ANCHO */}
      <td style={{ padding:'1rem 1.5rem', fontFamily:'JetBrains Mono,monospace', fontSize:'12px', color:'#94A3B8' }}>
        {material.ancho} cm
      </td>

      {/* LARGO RESTANTE — con barra de progreso */}
      <td style={{ padding:'1rem 1.5rem', minWidth:'160px' }}>
        <div style={{ width:'100%', height:'4px', backgroundColor:'#171f33', borderRadius:'999px', overflow:'hidden', marginBottom:'0.375rem' }}>
          <div style={{ height:'100%', width:`${pct}%`, backgroundColor:barColor, borderRadius:'999px' }} />
        </div>
        <span style={{ fontSize:'11px', color: pct < 20 ? '#EF4444' : pct < 50 ? '#ffb95f' : '#94A3B8', fontFamily:'JetBrains Mono,monospace' }}>
          {material.largo_restante?.toFixed(1)}m / {material.largo_original}m
        </span>
      </td>

      {/* STOCK */}
      <td style={{ padding:'1rem 1.5rem' }}>
        <span style={{
          fontFamily:'Inter,sans-serif', fontSize:'13px', fontWeight:700,
          color: material.stock <= 5 ? '#EF4444' : material.stock <= 15 ? '#ffb95f' : '#10B981'
        }}>
          {material.stock} unid.
        </span>
      </td>

      {/* PRECIO/m */}
      <td style={{ padding:'1rem 1.5rem', fontFamily:'Geist,Inter,sans-serif', fontSize:'13px', fontWeight:600, color:'#F8FAFC' }}>
        ${material.precio_metro}
      </td>

      {/* ACCIONES */}
      <td style={{ padding:'1rem 1.5rem' }}>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {/* Editar */}
          <button onClick={() => openEditMaterialDrawer(material)}
            style={{ width:'2rem', height:'2rem', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'0.25rem', cursor:'pointer', color:'#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.color='#b4c5ff'; e.currentTarget.style.borderColor='rgba(180,197,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#94A3B8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}
          >
            <span className="material-symbols-outlined" style={{fontSize:'16px'}}>edit</span>
          </button>
          {/* Reabastecer */}
          <button onClick={() => setReabastecerMaterialId(material.id)}
            style={{ width:'2rem', height:'2rem', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'0.25rem', cursor:'pointer', color:'#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.color='#4edea3'; e.currentTarget.style.borderColor='rgba(78,222,163,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#94A3B8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}
          >
            <span className="material-symbols-outlined" style={{fontSize:'16px'}}>local_shipping</span>
          </button>
        </div>
      </td>
    </tr>
  );
})}
```

**Estado vacío** (dentro de tbody):
```tsx
{filteredMateriales.length === 0 && (
  <tr>
    <td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#94A3B8' }}>
      <span className="material-symbols-outlined" style={{fontSize:'3rem', display:'block', marginBottom:'0.5rem', opacity:0.4}}>texture</span>
      {searchMateriales ? 'No se encontraron materiales' : 'No hay materiales registrados'}
    </td>
  </tr>
)}
```

---

### 5. Tab Tintas — Cards CMYK (diseño mejorado)

Grid 3 columnas. Cada tinta es un card con los 4 canales CMYK como barras.

```tsx
const CMYK_CANALES = [
  { key: 'magenta',  label: 'M', fullLabel: 'Magenta',  color: '#e879f9', cantKey:'magenta_cantidad',  minKey:'magenta_minimo'  },
  { key: 'cian',     label: 'C', fullLabel: 'Cian',     color: '#22d3ee', cantKey:'cian_cantidad',     minKey:'cian_minimo'     },
  { key: 'amarillo', label: 'Y', fullLabel: 'Amarillo', color: '#fde047', cantKey:'amarillo_cantidad', minKey:'amarillo_minimo' },
  { key: 'negro',    label: 'K', fullLabel: 'Negro',    color: '#94A3B8', cantKey:'negro_cantidad',    minKey:'negro_minimo'    },
];

{tintas?.map(tinta => {
  const canales = CMYK_CANALES.map(c => ({
    ...c,
    cant: tinta[c.cantKey] || 0,
    min:  tinta[c.minKey]  || 1,
  }));
  const tieneAlerta = canales.some(c => c.cant <= c.min);
  const tieneVacio  = canales.some(c => c.cant <= 0);

  return (
    <div key={tinta.id} style={{
      backgroundColor:'#1E293B',
      border: tieneVacio ? '1px solid rgba(239,68,68,0.3)' : tieneAlerta ? '1px solid rgba(255,185,95,0.3)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius:'0.25rem', padding:'1.5rem',
    }}>
      {/* Header card */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {/* Puntos de color CMYK */}
          {canales.map(c => (
            <span key={c.key} style={{ width:'14px', height:'14px', borderRadius:'50%', backgroundColor:c.color, display:'inline-block', border:'1px solid rgba(255,255,255,0.15)' }} />
          ))}
          <span style={{ fontFamily:'Geist,Inter,sans-serif', fontSize:'15px', fontWeight:600, color:'#F8FAFC', marginLeft:'0.5rem' }}>
            Tintas CMYK
          </span>
        </div>
        {tieneVacio && (
          <span style={{ fontSize:'10px', fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:'#EF4444', letterSpacing:'0.05em' }}>VACÍO</span>
        )}
        {!tieneVacio && tieneAlerta && (
          <span style={{ fontSize:'10px', fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:'#ffb95f', letterSpacing:'0.05em' }}>BAJO</span>
        )}
      </div>

      {/* Barras CMYK */}
      <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1.25rem' }}>
        {canales.map(c => {
          const maxRef = Math.max(c.min * 5, c.cant, 1);
          const pct    = Math.min(100, Math.round((c.cant / maxRef) * 100));
          const nivel  = c.cant <= 0 ? 'vacio' : c.cant <= c.min ? 'bajo' : 'ok';
          const barColor = nivel === 'vacio' ? '#EF4444' : nivel === 'bajo' ? '#ffb95f' : c.color;

          return (
            <div key={c.key}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.25rem' }}>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, color:'#94A3B8', letterSpacing:'0.05em' }}>
                  {c.fullLabel}
                </span>
                <span style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', fontWeight:600, color: nivel === 'vacio' ? '#EF4444' : nivel === 'bajo' ? '#ffb95f' : '#F8FAFC' }}>
                  {c.cant} cc
                </span>
              </div>
              <div style={{ width:'100%', height:'6px', backgroundColor:'#171f33', borderRadius:'999px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, backgroundColor:barColor, borderRadius:'999px', transition:'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón reabastecer */}
      <button onClick={() => setReabastecerTintaId(tinta.id)}
        style={{
          width:'100%', padding:'0.5rem', backgroundColor:'transparent',
          border:'1px solid rgba(255,255,255,0.08)', borderRadius:'0.25rem',
          color:'#94A3B8', fontFamily:'Inter,sans-serif', fontSize:'13px',
          fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', gap:'0.5rem',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor='rgba(78,222,163,0.1)'; e.currentTarget.style.color='#4edea3'; e.currentTarget.style.borderColor='rgba(78,222,163,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.color='#94A3B8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}
      >
        <span className="material-symbols-outlined" style={{fontSize:'16px'}}>colorize</span>
        Reabastecer
      </button>
    </div>
  );
})}
```

---

### 6. Drawer 1 — Crear/Editar Material (480px)

Estado:
```tsx
const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
const [editingMaterial, setEditingMaterial] = useState<any>(null);

function openNewMaterialDrawer() {
  setEditingMaterial(null);
  setMaterialForm({ tipo:'', ancho:'', largo_original:'', largo_restante:'', stock:'', precio_metro:'' });
  setMaterialDrawerOpen(true);
}
function openEditMaterialDrawer(material: any) {
  setEditingMaterial(material);
  setMaterialForm({
    tipo: material.tipo || '',
    ancho: String(material.ancho || ''),
    largo_original: String(material.largo_original || ''),
    largo_restante: String(material.largo_restante || ''),
    stock: String(material.stock || ''),
    precio_metro: String(material.precio_metro || ''),
  });
  setMaterialDrawerOpen(true);
}
function closeMaterialDrawer() {
  setMaterialDrawerOpen(false);
  setEditingMaterial(null);
}
```

Estructura del drawer (mismos estilos que Fase 2/3):
- Header: badge "Nuevo Material" / "Editar Material" + botón close + nombre del material si edita
- Body: grid 2 cols con los 6 campos (tipo, ancho, largo_original, largo_restante, stock, precio_metro)
- Footer: Cancelar + Guardar

Campos en el form:
```
tipo (text) | ancho_cm (number) | largo_original_m (number)
largo_restante_m (number) | stock_unidades (number) | precio_metro_$ (number)
```

---

### 7. Drawer 2 — Reabastecer Material (400px)

Trigger: `setReabastecerMaterialId(material.id)`

Estado:
```tsx
const [reabastecerMaterialId, setReabastecerMaterialId] = useState<string | null>(null);
const [metrosAgregar, setMetrosAgregar] = useState('');
```

El drawer es más pequeño y simple: muestra el nombre del material, un input "Metros a agregar", y botón Confirmar.

```tsx
const materialReab = materiales?.find(m => m.id === reabastecerMaterialId);
```

Drawer abierto cuando `reabastecerMaterialId !== null`. Al confirmar llama `handleReabastecerMaterial()`.

---

### 8. Drawer 3 — Reabastecer Tinta (400px)

Trigger: `setReabastecerTintaId(tinta.id)`

Estado:
```tsx
const [reabastecerTintaId, setReabastecerTintaId] = useState<string | null>(null);
const [tintaAgregar, setTintaAgregar] = useState({ magenta:'', cian:'', amarillo:'', negro:'' });
```

Drawer con 4 inputs en grid 2×2 (uno por canal CMYK), cada uno con su color de punto indicador. Al confirmar llama `handleReabastecerTinta()`.

```tsx
// En el body del drawer:
<div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
  {[
    { key:'magenta',  label:'Magenta',  color:'#e879f9' },
    { key:'cian',     label:'Cian',     color:'#22d3ee' },
    { key:'amarillo', label:'Amarillo', color:'#fde047' },
    { key:'negro',    label:'Negro',    color:'#94A3B8' },
  ].map(canal => (
    <div key={canal.key}>
      <label style={{ display:'flex', alignItems:'center', gap:'0.375rem', fontFamily:'JetBrains Mono,monospace', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'#94A3B8', marginBottom:'0.5rem' }}>
        <span style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:canal.color, display:'inline-block' }} />
        {canal.label} (cc)
      </label>
      <Input
        type="number" min="0" placeholder="0"
        value={tintaAgregar[canal.key as keyof typeof tintaAgregar]}
        onChange={e => setTintaAgregar(f => ({ ...f, [canal.key]: e.target.value }))}
      />
    </div>
  ))}
</div>
```

---

## ESTRUCTURA FINAL DEL RETURN

```tsx
return (
  <>
    <div className="space-y-6 animate-fade-in">
      {/* 1. PageHeader */}
      {/* 2. Summary Cards (4) */}
      {/* 3. Búsqueda + Segmented Nav */}
      {/* 4. Tabla Materiales (si tab === 'materiales') */}
      {/* 5. Cards Tintas (si tab === 'tintas') */}
    </div>

    {/* Overlays y Drawers (3) — fuera del div principal */}
    {/* Overlay material drawer */}
    {/* Drawer crear/editar material */}
    {/* Overlay reabastecer material */}
    {/* Drawer reabastecer material */}
    {/* Overlay reabastecer tinta */}
    {/* Drawer reabastecer tinta */}
  </>
);
```

Para los overlays — mismo patrón de siempre:
```tsx
{materialDrawerOpen && (
  <div onClick={closeMaterialDrawer} style={{ position:'fixed', inset:0, backgroundColor:'rgba(11,17,32,0.7)', backdropFilter:'blur(4px)', zIndex:60 }} />
)}
<aside style={{
  position:'fixed', top:0, right:0, height:'100vh', width:'480px',
  backgroundColor:'#1E293B', borderLeft:'1px solid rgba(255,255,255,0.08)',
  zIndex:70, display:'flex', flexDirection:'column',
  boxShadow:'-8px 0 32px rgba(0,0,0,0.4)',
  transform: materialDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
  transition:'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
}}>
  {/* ... contenido ... */}
</aside>
```

Los drawers de reabastecer (material y tinta) usan `width:'400px'` y el mismo patrón.

---

## IMPORTS NECESARIOS

```tsx
import { useState } from 'react';
import { useMateriales, useTintas, useCreateMaterial, useUpdateMaterial, useUpdateTinta } from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
```

**Eliminar**: `Card, CardContent, Button, Badge`, todos de `lucide-react`

---

## PASOS

1. Leer: `Read /home/claudeuser/crm-v2/src/pages/Inventario.tsx`
2. Reescribir con el nuevo diseño
3. Build: `cd /home/claudeuser/crm-v2 && npm run build`
4. Si hay error TypeScript: corregir y re-compilar
5. Deploy: `cp -r /home/claudeuser/crm-v2/dist/. /home/claudeuser/crm-v2-deploy/`
6. Reportar resultado

## LO QUE NO DEBES HACER
- ❌ Modificar cualquier otro archivo
- ❌ Tocar crm.biombos.cl
- ❌ Usar lucide-react o Card/Button de shadcn
- ❌ Cambiar la lógica de las mutations
- ❌ Cambiar el schema de tintas (los campos son magenta_cantidad, cian_cantidad, etc.)
