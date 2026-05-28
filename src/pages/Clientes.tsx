import { useState } from 'react';
import { useClientes, useCreateCliente, useUpdateCliente } from '@/hooks/useSupabase';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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

const AVATAR_COLORS = ['#2563eb', '#007d55', '#653e00', '#0053db', '#93000a'];

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function Clientes() {
  const { data: clientes, isLoading } = useClientes();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);
  const [drawerCliente, setDrawerCliente] = useState<any | null>(null);

  const filteredClientes = clientes?.filter(c =>
    c.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
    c.cedula_rif?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search)
  ) || [];

  const stats = {
    total: clientes?.length || 0,
    activos: clientes?.filter(c => c.activo !== false).length || 0,
    conEmail: clientes?.filter(c => c.email).length || 0,
    conTelefono: clientes?.filter(c => c.telefono).length || 0,
  };

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
    setDrawerCliente({ id: '__new__', nombre_completo: 'Nuevo Cliente' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_completo || !form.cedula_rif) {
      alert('Nombre y Cédula/RIF son obligatorios');
      return;
    }
    if (editingId && editingId !== '__new__') {
      await updateCliente.mutateAsync({ id: editingId, updates: form });
    } else {
      await createCliente.mutateAsync(form as unknown as Record<string, unknown>);
    }
    setForm(emptyForm);
    setEditingId(null);
    setDrawerCliente(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Clientes"
          description={`${filteredClientes.length} registros`}
          icon="group"
          actions={
            <Button onClick={openNewForm} className="gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '0.5rem' }}>person_add</span>
              Registrar Cliente
            </Button>
          }
        />

        <div className="rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(12,18,31,0.98),rgba(9,13,22,0.95))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
          <div className="relative">
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '20px', color: '#94A3B8', pointerEvents: 'none',
            }}>search</span>
            <Input
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Clientes', value: stats.total, icon: 'group', color: '#b4c5ff' },
            { label: 'Activos', value: stats.activos, icon: 'check_circle', color: '#4edea3' },
            { label: 'Con Email', value: stats.conEmail, icon: 'email', color: '#b4c5ff' },
            { label: 'Con Teléfono', value: stats.conTelefono, icon: 'phone', color: '#ffb95f' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-[18px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.14)]"
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                {stat.label}
              </p>
              <div className="flex items-end justify-between gap-3">
                <p style={{
                  fontFamily: 'Geist, Inter, sans-serif', fontSize: '28px', fontWeight: 700,
                  letterSpacing: '-0.02em', color: stat.color, margin: 0,
                }}>
                  {stat.value}
                </p>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: stat.color }}>{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[rgba(180,197,255,0.10)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,13,22,0.96))] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="text-base font-semibold text-[#f8fafc]">Listado de clientes</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">Selección rápida con vista compacta para trabajo diario.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
              <tr style={{ backgroundColor: '#060e20', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['CLIENTE', 'CÉDULA/RIF', 'TELÉFONO', 'DIRECCIÓN', 'ESTADO', 'ACCIONES'].map(col => (
                  <th key={col} style={{
                    padding: '0.9rem 1.25rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: '#8d90a0', textAlign: 'left',
                  }}>{col}</th>
                ))}
              </tr>
              </thead>
              <tbody>
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '0.5rem' }}>group</span>
                    {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente, index) => (
                  <tr
                    key={cliente.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      backgroundColor: index % 2 === 0 ? '#0f172a' : '#101a30',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#16233b')}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0f172a' : '#101a30';
                    }}
                    onClick={() => openDrawer(cliente)}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
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
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC' }}>
                      {cliente.cedula_rif || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F8FAFC' }}>
                      {cliente.telefono || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#94A3B8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cliente.direccion || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        fontSize: '11px', fontWeight: 700,
                        color: cliente.activo !== false ? '#10B981' : '#EF4444',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cliente.activo !== false ? '#10B981' : '#EF4444' }} />
                        {cliente.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button
                        onClick={e => { e.stopPropagation(); openDrawer(cliente); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,197,255,0.10)', cursor: 'pointer', color: '#b4c5ff', width: '38px', height: '38px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(180,197,255,0.10)';
                          e.currentTarget.style.borderColor = 'rgba(180,197,255,0.20)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.borderColor = 'rgba(180,197,255,0.10)';
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Overlay */}
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

      {/* 6. Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0,
        height: '100vh', width: '480px',
        background: 'linear-gradient(180deg, rgba(12,18,31,0.98), rgba(9,13,22,0.98))',
        borderLeft: '1px solid rgba(180,197,255,0.12)',
        zIndex: 70,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 60px rgba(0,0,0,0.45)',
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
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                Nombre Completo *
              </label>
              <Input value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} placeholder="Nombre completo" required />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>
                Cédula / RIF *
              </label>
              <Input value={form.cedula_rif} onChange={e => setForm({ ...form, cedula_rif: e.target.value })} placeholder="V-12345678" required />
            </div>
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
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem' }}>Dirección</label>
              <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección completa" />
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <button type="button" onClick={closeDrawer}
            style={{ padding: '0.9rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(180,197,255,0.10)', borderRadius: '14px', color: '#F8FAFC', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit as any}
            disabled={createCliente.isPending || updateCliente.isPending}
            style={{ padding: '0.9rem', background: 'linear-gradient(180deg, #2f6cff, #2454d6)', border: 'none', borderRadius: '14px', color: '#eeefff', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', opacity: (createCliente.isPending || updateCliente.isPending) ? 0.7 : 1 }}>
            {(createCliente.isPending || updateCliente.isPending) ? 'Guardando...' : 'Guardar'}
          </button>
        </footer>
      </aside>
    </>
  );
}
