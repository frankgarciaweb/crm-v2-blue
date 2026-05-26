import { useState, useEffect, useCallback, useRef } from 'react';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { usePedidos, useClientes } from '@/hooks/useSupabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, X, Upload } from 'lucide-react';

// ─── MinIO client ──────────────────────────────────────────────────

const STORAGE_ENDPOINT = import.meta.env.VITE_STORAGE_ENDPOINT || '';
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'crm-archivos';
const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_BASE_URL || '';
const STORAGE_ACCESS_KEY = import.meta.env.VITE_STORAGE_ACCESS_KEY || '';
const STORAGE_SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET_KEY || '';
const STORAGE_ENABLED = Boolean(STORAGE_ENDPOINT && STORAGE_BASE_URL && STORAGE_ACCESS_KEY && STORAGE_SECRET_KEY);

const s3 = STORAGE_ENABLED
  ? new S3Client({
      endpoint: STORAGE_ENDPOINT,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
    })
  : null;

// ─── Helpers ───────────────────────────────────────────────────────

interface ArchivoMinIO {
  key: string;
  nombre: string;
  carpeta: string;
  ext: string;
  tamano: number;
  fecha: Date;
  url: string;
  origen: 'minio';
}

interface ArchivoPedido {
  key: string;
  nombre: string;
  carpeta: string;
  ext: string;
  tamano: number;
  fecha: Date;
  url: string;
  origen: 'pedido';
  pedidoId: string;
  clienteNombre: string;
}

type Archivo = ArchivoMinIO | ArchivoPedido;

function formatBytes(b: number): string {
  if (b === 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(nombre: string): string {
  return nombre.split('.').pop()?.toLowerCase() || '';
}

type TipoArchivo = 'pdf' | 'imagen' | 'vector' | 'texto' | 'otro';

function getTipo(ext: string): TipoArchivo {
  if (['pdf'].includes(ext)) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext)) return 'imagen';
  if (['ai', 'eps', 'svg', 'cdr'].includes(ext)) return 'vector';
  if (['txt', 'doc', 'docx', 'rtf'].includes(ext)) return 'texto';
  return 'otro';
}

const TIPO_CONFIG: Record<TipoArchivo, { icon: string; color: string; bg: string; label: string }> = {
  pdf:    { icon: 'picture_as_pdf', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    label: 'PDF' },
  imagen: { icon: 'image',          color: '#4edea3', bg: 'rgba(78,222,163,0.12)',   label: 'IMAGEN' },
  vector: { icon: 'draw',           color: '#ffb95f', bg: 'rgba(255,185,95,0.12)',   label: 'VECTOR' },
  texto:  { icon: 'description',    color: '#b4c5ff', bg: 'rgba(180,197,255,0.12)',  label: 'TEXTO' },
  otro:   { icon: 'insert_drive_file', color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'ARCHIVO' },
};

// ─── StatCard ──────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color?: string; sub?: string;
}) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div className="flex items-start justify-between mb-3">
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: color || '#b4c5ff' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: color || '#b4c5ff', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{sub}</p>}
    </div>
  );
}

function ClientAutocomplete({ clientes, selectedId, onSelect }: {
  clientes: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = clientes?.find(c => c.id === selectedId);

  useEffect(() => {
    if (selected && !query) setQuery(selected.nombre_completo || '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function out(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  const filtered = query.length === 0
    ? clientes?.slice(0, 20) || []
    : clientes?.filter(c =>
        (c.nombre_completo || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.cedula_rif || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.telefono || '').includes(query)
      ).slice(0, 20) || [];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(''); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cliente por nombre, cédula o teléfono..."
        style={{ width: '100%', padding: '8px 12px', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.375rem', color: '#dae2fd', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: '4px', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '200px', overflowY: 'auto' }}>
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,197,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { onSelect(c.id); setQuery(c.nombre_completo || ''); setOpen(false); }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.nombre_completo}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{c.cedula_rif && `${c.cedula_rif} · `}{c.telefono || ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export default function Archivos() {
  const { data: pedidos } = usePedidos();
  const { data: clientes } = useClientes();

  const [archivosMinIO, setArchivosMinIO] = useState<ArchivoMinIO[]>([]);
  const [loadingMinIO, setLoadingMinIO] = useState(true);
  const [errorMinIO, setErrorMinIO] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'recientes' | 'por_pedido'>('recientes');
  const [showUpload, setShowUpload] = useState(false);
  const [clienteUploadId, setClienteUploadId] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const clienteUpload = (clientes || []).find((cliente: any) => cliente.id === clienteUploadId) || null;

  // ── Cargar archivos de MinIO ──
  const fetchMinIO = useCallback(async () => {
    setLoadingMinIO(true);
    setErrorMinIO(null);
    try {
      if (!s3) {
        setArchivosMinIO([]);
        setErrorMinIO('La conexión directa a MinIO está deshabilitada en el navegador. Usa URLs de Nextcloud o configura las variables `VITE_STORAGE_*`.');
        return;
      }
      const res = await s3.send(new ListObjectsV2Command({ Bucket: STORAGE_BUCKET }));
      const items: ArchivoMinIO[] = (res.Contents || [])
        .filter(obj => obj.Key && !obj.Key.endsWith('/'))
        .map(obj => {
          const parts = obj.Key!.split('/');
          const nombre = parts[parts.length - 1];
          const carpeta = parts.length > 1 ? parts.slice(0, -1).join('/') : 'raíz';
          const ext = getExt(nombre);
          return {
            key: obj.Key!,
            nombre,
            carpeta,
            ext,
            tamano: obj.Size || 0,
            fecha: obj.LastModified || new Date(),
            url: `${STORAGE_BASE_URL}/${obj.Key}`,
            origen: 'minio' as const,
          };
        });
      items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setArchivosMinIO(items);
    } catch (err: any) {
      setErrorMinIO('No se pudo conectar con MinIO: ' + (err?.message || 'error desconocido'));
    } finally {
      setLoadingMinIO(false);
    }
  }, []);

  useEffect(() => { fetchMinIO(); }, [fetchMinIO]);

  // ── PDFs de pedidos ──
  const archivosPedidos: ArchivoPedido[] = (pedidos || [])
    .filter(p => p.pdf_url)
    .map(p => ({
      key: `pedidos/${p.id}.pdf`,
      nombre: `Pedido_${p.id?.slice(0, 8).toUpperCase()}.pdf`,
      carpeta: 'pedidos',
      ext: 'pdf',
      tamano: 0,
      fecha: new Date(p.created_at),
      url: p.pdf_url!,
      origen: 'pedido' as const,
      pedidoId: p.id,
      clienteNombre: p.clientes?.nombre_completo || p.clientes?.nombre || 'Sin cliente',
    }));

  // ── Combinar y filtrar ──
  const todos: Archivo[] = [...archivosMinIO, ...archivosPedidos];
  const filtered = todos.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.nombre.toLowerCase().includes(q) ||
      a.carpeta.toLowerCase().includes(q) ||
      (a.origen === 'pedido' && (a as ArchivoPedido).clienteNombre.toLowerCase().includes(q))
    );
  });

  // ── Stats ──
  const totalArchivos = todos.length;
  const totalPDFs = todos.filter(a => a.ext === 'pdf').length;
  const totalImagenes = todos.filter(a => getTipo(a.ext) === 'imagen').length;
  const totalVectores = todos.filter(a => getTipo(a.ext) === 'vector').length;

  // ── Agrupar por carpeta (Por Pedido tab) ──
  const porCarpeta = filtered.reduce<Record<string, Archivo[]>>((acc, a) => {
    const key = a.carpeta;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // ── Upload ──
  const handleUpload = async (file: File) => {
    if (!s3) { alert('La subida directa está deshabilitada. Usa una URL pública de Nextcloud o configura el storage.'); return; }
    if (!clienteUpload?.nombre_completo?.trim()) { alert('Selecciona un cliente antes de subir'); return; }
    setSubiendo(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const key = `diseños/${clienteUpload.nombre_completo.trim()}/${Date.now()}_${safeName}`;
      const buf = await file.arrayBuffer();
      await s3.send(new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: new Uint8Array(buf),
        ContentType: file.type || 'application/octet-stream',
        ACL: 'public-read' as any,
      }));
      setClienteUploadId('');
      setShowUpload(false);
      await fetchMinIO();
    } catch (err: any) {
      alert('Error al subir: ' + (err?.message || 'error desconocido'));
    } finally {
      setSubiendo(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (archivo: Archivo) => {
    if (archivo.origen === 'pedido') { alert('Los PDFs de pedidos se gestionan desde la sección Pedidos.'); return; }
    if (!confirm(`¿Eliminar "${archivo.nombre}"?`)) return;
    if (!s3) { alert('La eliminación directa está deshabilitada sin configuración de storage.'); return; }
    setEliminando(archivo.key);
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: archivo.key }));
      await fetchMinIO();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message || 'error'));
    } finally {
      setEliminando(null);
    }
  };

  // ── Row render ──
  function ArchivoRow({ a }: { a: Archivo }) {
    const tipo = getTipo(a.ext);
    const cfg = TIPO_CONFIG[tipo];
    const isPedido = a.origen === 'pedido';
    const isElim = eliminando === a.key;

    return (
      <tr
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
        className="group"
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,42,61,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Nombre */}
        <td style={{ padding: '12px 20px' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: '36px', height: '36px', borderRadius: '0.25rem', flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: cfg.color }}>{cfg.icon}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                {a.nombre}
              </p>
              <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>
                {a.carpeta}
              </p>
            </div>
          </div>
        </td>

        {/* Tipo */}
        <td style={{ padding: '12px 20px' }}>
          <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '0.125rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>
            {a.ext.toUpperCase() || cfg.label}
          </span>
        </td>

        {/* Tamaño */}
        <td style={{ padding: '12px 20px', fontSize: '12px', color: '#94A3B8', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
          {a.tamano > 0 ? formatBytes(a.tamano) : '—'}
        </td>

        {/* Pedido relacionado */}
        <td style={{ padding: '12px 20px' }}>
          {isPedido ? (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#b4c5ff' }}>
              #{(a as ArchivoPedido).pedidoId?.slice(0, 8).toUpperCase()}
            </span>
          ) : (
            <span style={{ color: '#64748B', opacity: 0.4, fontSize: '13px' }}>—</span>
          )}
        </td>

        {/* Fecha */}
        <td style={{ padding: '12px 20px', fontSize: '12px', color: '#94A3B8', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
          {a.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>

        {/* Acciones */}
        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Descargar */}
            <a
              href={a.url}
              download={a.nombre}
              title="Descargar"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '0.25rem', color: '#94A3B8', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#222a3d'; (e.currentTarget as HTMLElement).style.color = '#b4c5ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            </a>
            {/* Ver */}
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '0.25rem', color: '#94A3B8', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#222a3d'; (e.currentTarget as HTMLElement).style.color = '#b4c5ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
            </a>
            {/* Eliminar (solo MinIO) */}
            <button
              onClick={() => handleDelete(a)}
              disabled={isElim || isPedido}
              title={isPedido ? 'PDF de pedido — gestionar en Pedidos' : 'Eliminar'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '30px', height: '30px', borderRadius: '0.25rem',
                color: isPedido ? '#64748B' : '#EF4444',
                background: 'transparent', border: 'none',
                cursor: isPedido ? 'not-allowed' : 'pointer',
                opacity: isPedido ? 0.3 : 1,
              }}
              onMouseEnter={e => { if (!isPedido) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {isElim
                ? <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>hourglass_empty</span>
                : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
              }
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            REPOSITORIO / ARTES Y TRABAJOS
          </p>
          <h1 style={{ fontFamily: 'Geist, Inter, sans-serif', fontSize: '30px', fontWeight: 700, color: '#b4c5ff', letterSpacing: '-0.01em', lineHeight: '38px', margin: 0 }}>
            Gestión de Archivos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Diseños, artes y documentos en MinIO — {STORAGE_BUCKET}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '3px' }}>
            {[{ k: 'recientes', l: 'Recientes' }, { k: 'por_pedido', l: 'Por Carpeta' }].map(({ k, l }) => (
              <button key={k} onClick={() => setTab(k as typeof tab)}
                style={{ padding: '5px 16px', borderRadius: '0.375rem', fontSize: '13px', fontWeight: tab === k ? 700 : 500, color: tab === k ? '#b4c5ff' : '#64748B', background: tab === k ? '#222a3d' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>
                {l}
              </button>
            ))}
          </div>
          {/* Subir */}
          <button
            onClick={() => setShowUpload(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
            Subir Archivo
          </button>
        </div>
      </div>

      {/* ─── UPLOAD PANEL ─── */}
      {showUpload && (
        <div style={{ background: '#1E293B', border: '1px solid rgba(180,197,255,0.2)', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Subir Archivo de Diseño
            </h3>
            <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {!STORAGE_ENABLED && (
            <div style={{ marginBottom: '14px', padding: '12px 14px', background: 'rgba(255,185,95,0.08)', border: '1px solid rgba(255,185,95,0.22)', borderRadius: '0.375rem', color: '#ffcf8a', fontSize: '13px', lineHeight: 1.5 }}>
              La conexión directa al storage está desactivada en el navegador para evitar errores de CORS y credenciales expuestas. En esta fase el módulo queda como visor de archivos asociados a pedidos y la subida debe migrarse a URL pública de Nextcloud o a un backend proxy.
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontFamily: 'Inter, sans-serif' }}>
                Cliente
              </label>
              <ClientAutocomplete
                clientes={clientes || []}
                selectedId={clienteUploadId}
                onSelect={setClienteUploadId}
              />
              <p style={{ marginTop: '4px', fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                Se usaría como carpeta base si el storage estuviera habilitado.
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={subiendo || !STORAGE_ENABLED}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: subiendo || !STORAGE_ENABLED ? '#64748B' : '#222a3d', color: subiendo || !STORAGE_ENABLED ? '#94A3B8' : '#b4c5ff', border: '1px solid rgba(180,197,255,0.2)', borderRadius: '0.375rem', fontWeight: 600, fontSize: '13px', cursor: subiendo || !STORAGE_ENABLED ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}
            >
              <Upload className="h-4 w-4" />
              {subiendo ? 'Subiendo...' : STORAGE_ENABLED ? 'Seleccionar archivo' : 'Storage deshabilitado'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.ai,.eps,.tiff,.tif,.txt,.doc,.docx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
          />
        </div>
      )}

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Archivos Totales" value={totalArchivos} icon="folder_zip" sub={loadingMinIO ? 'Cargando...' : undefined} />
        <StatCard label="PDFs" value={totalPDFs} icon="picture_as_pdf" color="#EF4444" />
        <StatCard label="Imágenes" value={totalImagenes} icon="image" color="#4edea3" />
        <StatCard label="Vectores" value={totalVectores} icon="draw" color="#ffb95f" />
      </div>

      {/* ─── SEARCH ─── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] h-4 w-4" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar archivos por nombre, carpeta o cliente..."
          style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '8px', paddingBottom: '8px', background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: '#dae2fd', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
        />
      </div>

      {/* ─── ERROR MinIO ─── */}
      {errorMinIO && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EF4444' }}>warning</span>
          <span style={{ fontSize: '13px', color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>{errorMinIO}</span>
          <button onClick={fetchMinIO} style={{ marginLeft: 'auto', fontSize: '12px', color: '#b4c5ff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Reintentar
          </button>
        </div>
      )}

      {/* ─── TABLA: RECIENTES ─── */}
      {tab === 'recientes' && (
        <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(23,31,51,0.5)' }}>
            <div className="flex items-center gap-3">
              <h3 style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Repositorio de Artes
              </h3>
              <span style={{ background: '#222a3d', color: '#94A3B8', padding: '2px 8px', borderRadius: '0.125rem', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {filtered.length} ÍTEMS
              </span>
            </div>
            <button onClick={fetchMinIO} disabled={loadingMinIO} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            </button>
          </div>

          {loadingMinIO ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(6,14,32,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Nombre de archivo', 'Tipo', 'Tamaño', 'Pedido', 'Fecha', 'Acciones'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: i === 5 ? 'right' : 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                        {search ? 'No se encontraron archivos' : 'No hay archivos en el repositorio'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(a => <ArchivoRow key={a.key} a={a} />)
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '12px 20px', background: 'rgba(6,14,32,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {filtered.length} de {todos.length} archivos
            </span>
            <a
              href="https://storage.biombos.cl" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#b4c5ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, sans-serif' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
              Abrir MinIO
            </a>
          </div>
        </div>
      )}

      {/* ─── VISTA: POR CARPETA ─── */}
      {tab === 'por_pedido' && (
        <div className="flex flex-col gap-4">
          {loadingMinIO ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : Object.keys(porCarpeta).length === 0 ? (
            <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '48px', textAlign: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
              No hay archivos
            </div>
          ) : (
            Object.entries(porCarpeta)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([carpeta, items]) => (
                <div key={carpeta} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  {/* Carpeta header */}
                  <div style={{ padding: '14px 20px', background: 'rgba(23,31,51,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#b4c5ff' }}>folder</span>
                    <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                      {carpeta}
                    </span>
                    <span style={{ background: '#222a3d', color: '#94A3B8', padding: '1px 8px', borderRadius: '0.125rem', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                      {items.length} archivo{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Files in this folder */}
                  <div>
                    {items.map(a => {
                      const tipo = getTipo(a.ext);
                      const cfg = TIPO_CONFIG[tipo];
                      return (
                        <div
                          key={a.key}
                          className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#222a3d]"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '0.25rem', flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: cfg.color }}>{cfg.icon}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.nombre}
                            </p>
                            <p style={{ fontSize: '11px', color: '#64748B', margin: '1px 0 0' }}>
                              {formatBytes(a.tamano)} · {a.fecha.toLocaleDateString('es-CL')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={a.url} download={a.nombre}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '0.25rem', color: '#94A3B8', textDecoration: 'none' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2d3449'; (e.currentTarget as HTMLElement).style.color = '#b4c5ff'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                            </a>
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '0.25rem', color: '#94A3B8', textDecoration: 'none' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2d3449'; (e.currentTarget as HTMLElement).style.color = '#b4c5ff'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                            </a>
                            {a.origen === 'minio' && (
                              <button onClick={() => handleDelete(a)} disabled={eliminando === a.key}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '0.25rem', color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
