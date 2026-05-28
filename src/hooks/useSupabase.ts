
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadFile as minioUploadFile } from '@/services/storageService';

// Tipos de datos
export interface Cliente {
  [key: string]: any;
  id: string;
  nombre_completo: string;
  cedula_rif: string;
  telefono: string;
  email?: string;
  direccion?: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  [key: string]: any;
  id: string;
  tipo: string;
  ancho: number;
  largo_restante: number;
  largo_original: number;
  proveedor: string;
  fecha_ingreso: string;
  precio_m2: number;
  stock: number;
  porcentaje: number;
  created_at: string;
  updated_at: string;
}

export interface Tinta {
  [key: string]: any;
  id: string;
  nombre: string;
  maquina: string;
  cantidad: number;
  minimo: number;
  unidad: string;
  porcentaje: number;
  magenta_cantidad: number;
  cian_cantidad: number;
  amarillo_cantidad: number;
  negro_cantidad: number;
  magenta_minimo: number;
  cian_minimo: number;
  amarillo_minimo: number;
  negro_minimo: number;
  created_at: string;
  updated_at: string;
}

export interface Proveedor {
  [key: string]: any;
  id: string;
  nombre: string;
  rif: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_principal?: string;
  cuenta_por_pagar: number;
  created_at: string;
  updated_at: string;
}

const normalizeOptionalInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const CONFIG_LOCAL_STORAGE_KEY = 'crm_v2_configuracion_negocio';

function getStoredConfiguracionMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CONFIG_LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value == null ? '' : String(value);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function setStoredConfiguracionMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage no disponible */
  }
}

function mapConfigRowsToPairs(rows: any[]) {
  return rows.flatMap((row: any) =>
    Object.entries(row || {})
      .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
      .map(([clave, valor]) => ({ clave, valor: valor == null ? '' : String(valor) }))
  );
}

export interface CompraProveedor {
  [key: string]: any;
  id: string;
  proveedor_id: string;
  numero_factura: string;
  fecha_factura: string;
  monto_total: number;
  monto_pagado: number;
  estado: 'pendiente' | 'pagado' | 'parcial';
  descripcion?: string;
  archivo_factura_url?: string;
  created_at: string;
  updated_at: string;
  proveedor?: Proveedor;
}

export interface Pedido {
  [key: string]: any;
  id: string;
  cliente_id: string;
  material_id: string;
  alto: number;
  ancho: number;
  metros_cuadrados: number;
  maquina_usar: string;
  precio_total: number;
  notas?: string;
  prioridad: string;
  estado: string;
  archivo_trabajo_url?: string;
  url_diseno?: string;
  medio_pago?: 'Efectivo BS' | 'Efectivo $' | 'Pago Móvil';
  metodo_pago?: 'Efectivo BS' | 'Efectivo $' | 'Pago Móvil';
  referencia_pago?: string;
  fecha_limite?: string;
  tipo_pago?: 'contado' | 'parcial' | 'credito' | 'abono';
  abono?: number;
  dias_credito?: number;
  maquina_id?: string;
  created_at: string;
  updated_at: string;
  pdf_url?: string; // NUEVO CAMPO
  cliente?: Cliente;
  material?: Material;
  producto?: Producto;
}

export interface Producto {
  [key: string]: any;
  id: string;
  nombre: string;
  descripcion?: string;
  precio_por_m2: number;
  activo: boolean;
  tipo_cobro: 'mt2' | 'unidad'; // <-- Agregado
  created_at: string;
  updated_at: string;
  materiales?: Material[];
}

export interface Trabajo {
  [key: string]: any;
  id: string;
  pedido_id: string;
  descripcion: string;
  metros_cuadrados: number;
  material_tipo: string;
  maquina_asignada: string;
  prioridad: string;
  estado: string;
  fecha_estimada?: string;
  created_at: string;
  updated_at: string;
  pedido?: Pedido;
}

// Hooks para Clientes
export const useClientes = () => {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error al obtener clientes:', error);
        throw error;
      }
      return data as Cliente[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cliente: any) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear cliente:', error);
        throw error;
      }
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido creado exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de cliente:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el cliente",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clienteId: string) => {
      // Borrado lógico: marcar como inactivo
      const { error } = await supabase
        .from('clientes')
        .update({ activo: false })
        .eq('id', clienteId);
      if (error) {
        console.error('Error al eliminar cliente:', error);
        throw error;
      }
      return clienteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: "Cliente desactivado",
        description: "El cliente ha sido desactivado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al desactivar el cliente",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, updates } = payload;
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: "Cliente actualizado", description: "Datos actualizados correctamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Error al actualizar el cliente", variant: "destructive" });
    },
  });
};

// Hooks para Materiales
export const useMateriales = () => {
  return useQuery({
    queryKey: ['materiales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener materiales:', error);
        throw error;
      }
      return data as Material[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (material: any) => {
      console.log('Creando material:', material);
      const { data, error } = await supabase
        .from('materiales')
        .insert([material])
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear material:', error);
        throw error;
      }
      console.log('Material creado exitosamente:', data);
      return data as Material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
      toast({
        title: "Material agregado",
        description: "El material ha sido agregado exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de material:', error);
      toast({
        title: "Error",
        description: error.message || "Error al agregar el material",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id } = payload;
      const updates = payload?.updates ?? Object.fromEntries(
        Object.entries(payload || {}).filter(([key]) => key !== 'id' && key !== 'updates')
      );
      const { data, error } = await supabase
        .from('materiales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
    },
  });
};

// Hooks para Tintas
export const useTintas = () => {
  return useQuery({
    queryKey: ['tintas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tintas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener tintas:', error);
        throw error;
      }
      return data as Tinta[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateTinta = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tinta: any) => {
      console.log('Creando tinta:', tinta);
      const { data, error } = await supabase
        .from('tintas')
        .insert([tinta])
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear tinta:', error);
        throw error;
      }
      console.log('Tinta creada exitosamente:', data);
      return data as Tinta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tintas'] });
      toast({
        title: "Tinta agregada",
        description: "La tinta ha sido agregada exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de tinta:', error);
      toast({
        title: "Error",  
        description: error.message || "Error al agregar la tinta",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTinta = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id } = payload;
      const updates = payload?.updates ?? Object.fromEntries(
        Object.entries(payload || {}).filter(([key]) => key !== 'id' && key !== 'updates')
      );
      const { data, error } = await supabase
        .from('tintas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error al actualizar tinta:', error);
        throw error;
      }
      return data as Tinta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tintas'] });
      toast({
        title: "Tinta actualizada",
        description: "La tinta ha sido actualizada exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de actualización de tinta:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la tinta",
        variant: "destructive",
      });
    },
  });
};

// Hooks para Proveedores
export const useProveedores = () => {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener proveedores:', error);
        throw error;
      }
      return data as Proveedor[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateProveedor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (proveedor: any) => {
      const payload = {
        ...proveedor,
        dias_credito: normalizeOptionalInteger(proveedor?.dias_credito),
        lead_time_dias: normalizeOptionalInteger(proveedor?.lead_time_dias),
      };

      const { data, error } = await supabase
        .from('proveedores')
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear proveedor:', error);
        throw error;
      }
      return data as Proveedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast({
        title: "Proveedor creado",
        description: "El proveedor ha sido creado exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de proveedor:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el proveedor",
        variant: "destructive",
      });
    },
  });
};

// Hooks para Compras de Proveedores
export const useComprasProveedores = () => {
  return useQuery({
    queryKey: ['compras_proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compras_proveedores')
        .select(`
          *,
          proveedor:proveedores(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CompraProveedor[];
    },
  });
};

export const useCreateCompraProveedor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (compra: any) => {
      const { data, error } = await supabase
        .from('compras_proveedores')
        .insert([compra])
        .select()
        .single();
      
      if (error) throw error;
      return data as CompraProveedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast({
        title: "Compra registrada",
        description: "La compra ha sido registrada exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar la compra",
        variant: "destructive",
      });
    },
  });
};

// Hooks para Pedidos
export const usePedidos = () => {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(*),
          material:materiales(*),
          producto:productos(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Pedido[];
    },
  });
};

export const useCreatePedido = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pedido: any) => {
      const {
        medio_pago,
        metodo_pago,
        maquina_id,
        maquina_usar,
        archivo_trabajo_url,
        ...rest
      } = pedido as any;

      const dbPedido: Record<string, unknown> = {
        cliente_id: rest.cliente_id ?? null,
        alto: rest.alto ?? 0,
        ancho: rest.ancho ?? 0,
        metros_cuadrados: rest.metros_cuadrados ?? 0,
        maquina_usar: maquina_usar ?? rest.maquina_usar ?? '',
        precio_total: rest.precio_total ?? 0,
        estado: rest.estado ?? 'pendiente',
        prioridad: rest.prioridad ?? 'media',
        notas: rest.notas ?? null,
      };

      const metodoPagoFinal = metodo_pago ?? medio_pago;
      if (metodoPagoFinal !== undefined) dbPedido.metodo_pago = metodoPagoFinal;
      if (rest.referencia_pago !== undefined) dbPedido.referencia_pago = rest.referencia_pago;
      if (rest.fecha_limite !== undefined) dbPedido.fecha_limite = rest.fecha_limite;
      if (rest.tipo_pago !== undefined) dbPedido.tipo_pago = rest.tipo_pago === 'abono' ? 'parcial' : rest.tipo_pago;
      if (rest.abono !== undefined) dbPedido.abono = rest.abono;
      if (rest.dias_credito !== undefined) dbPedido.dias_credito = rest.dias_credito;
      if (rest.producto_id !== undefined) dbPedido.producto_id = rest.producto_id;
      if (rest.material_id !== undefined) dbPedido.material_id = rest.material_id;
      const urlDisenoFinal = rest.url_diseno ?? archivo_trabajo_url;
      if (urlDisenoFinal !== undefined) dbPedido.url_diseno = urlDisenoFinal;
      if (maquina_id !== undefined) dbPedido.maquina_id = maquina_id;

      const { data, error } = await supabase
        .from('pedidos')
        .insert([dbPedido])
        .select()
        .single();

      if (error) throw error;
      return { ...data, medio_pago: (data as any).metodo_pago } as Pedido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['trabajos'] });
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
      toast({
        title: "Pedido creado",
        description: "El pedido ha sido creado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el pedido",
        variant: "destructive",
      });
    },
  });
};

// Hooks para Trabajos
export const useTrabajos = () => {
  return useQuery({
    queryKey: ['trabajos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trabajos')
        .select(`
          *,
          pedido:pedidos(
            *,
            cliente:clientes(nombre_completo),
            producto:productos(*)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Trabajo[];
    },
  });
};

export const useUpdateTrabajo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, updates, ...rest } = payload;
      const payloadToSave = updates ?? rest;
      const { data, error } = await supabase
        .from('trabajos')
        .update(payloadToSave)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Trabajo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajos'] });
    },
  });
};

export const useDeleteTrabajo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trabajoId: string) => {
      const { error } = await supabase
        .from('trabajos')
        .delete()
        .eq('id', trabajoId);
      if (error) {
        console.error('Error al eliminar trabajo:', error);
        throw error;
      }
      return trabajoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajos'] });
      toast({
        title: "Trabajo eliminado",
        description: "El trabajo ha sido eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el trabajo",
        variant: "destructive",
      });
    },
  });
};

// Hooks para Productos
export const useProductos = () => {
  return useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, productos_materiales(materiales(*))')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) {
        console.error('Error al obtener productos:', error);
        throw error;
      }
      // Mapear materiales y normalizar nombre de columna precio_m2 → precio_por_m2
      const productosConMateriales = (data as any[]).map(prod => ({
        ...prod,
        precio_por_m2: prod.precio_m2,
        materiales: prod.productos_materiales?.map((rel: any) => rel.materiales) || []
      }));
      return productosConMateriales as Producto[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateProducto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (producto: any) => {
      const { precio_por_m2, materiales, ...rest } = producto as any;
      const dbProducto = { ...rest, precio_m2: precio_por_m2 };
      const { data, error } = await supabase
        .from('productos')
        .insert([dbProducto])
        .select()
        .single();

      if (error) {
        console.error('Error al crear producto:', error);
        throw error;
      }
      return { ...data, precio_por_m2: (data as any).precio_m2 } as Producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({
        title: "Producto creado",
        description: "El producto ha sido creado exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de producto:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el producto",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateProducto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, updates } = payload;
      const { precio_por_m2, materiales, ...rest } = updates as any;
      const dbUpdates: any = { ...rest };
      if (precio_por_m2 !== undefined) dbUpdates.precio_m2 = precio_por_m2;
      const { data, error } = await supabase
        .from('productos')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar producto:', error);
        throw error;
      }
      return { ...data, precio_por_m2: (data as any).precio_m2 } as Producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      console.error('Error en mutación de actualización de producto:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteProducto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productoId: string) => {
      // Borrado lógico: marcar como inactivo
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', productoId);
      if (error) {
        console.error('Error al eliminar producto:', error);
        throw error;
      }
      return productoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({
        title: "Producto desactivado",
        description: "El producto ha sido desactivado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al desactivar el producto",
        variant: "destructive",
      });
    },
  });
};

// Hook para subir archivos — usa MinIO (storage.biombos.cl)
export const useUploadFile = () => {
  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }) => {
      // path viene como "uploads/nombre.png" — usamos la carpeta como folder
      const folder = path.includes('/') ? path.split('/')[0] : 'uploads';
      const result = await minioUploadFile(file, folder);
      return result;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al subir el archivo",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase.from('materiales').delete().eq('id', materialId);
      if (error) throw error;
      return materialId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] });
      toast({ title: 'Material eliminado', description: 'El material ha sido eliminado exitosamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Error al eliminar el material', variant: 'destructive' });
    },
  });
};

export const useDeleteTinta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tintaId: string) => {
      const { error } = await supabase.from('tintas').delete().eq('id', tintaId);
      if (error) throw error;
      return tintaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tintas'] });
      toast({ title: 'Tinta eliminada', description: 'La tinta ha sido eliminada exitosamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Error al eliminar la tinta', variant: 'destructive' });
    },
  });
};

// Reabastecer tinta — suma CC a los colores indicados
export const useReabastecerTinta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      magenta = 0,
      cian = 0,
      amarillo = 0,
      negro = 0,
      tintaActual,
    }: {
      id: string;
      magenta?: number;
      cian?: number;
      amarillo?: number;
      negro?: number;
      tintaActual: { magenta_cantidad: number; cian_cantidad: number; amarillo_cantidad: number; negro_cantidad: number };
    }) => {
      const { error } = await supabase
        .from('tintas')
        .update({
          magenta_cantidad: tintaActual.magenta_cantidad + magenta,
          cian_cantidad: tintaActual.cian_cantidad + cian,
          amarillo_cantidad: tintaActual.amarillo_cantidad + amarillo,
          negro_cantidad: tintaActual.negro_cantidad + negro,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tintas'] });
      toast({ title: 'Tinta reabastecida', description: 'Stock actualizado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Error al reabastecer tinta', variant: 'destructive' });
    },
  });
};

// ─── COTIZACIONES ─────────────────────────────────────────────────────────────

export interface CotizacionItem {
  id?: string;
  cotizacion_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  line_total?: number;
}

export interface Cotizacion {
  id: string;
  cliente_id?: string;
  nombre: string;
  descripcion?: string;
  cliente_nombre?: string;
  margen_ganancia: number;
  iva_percent: number;
  subtotal: number;
  total_precio: number;
  total?: number;
  estado: string;
  notas?: string;
  descuento_porcentaje?: number;
  validez_dias?: number;
  created_at: string;
  updated_at: string;
  cliente?: { id: string; nombre_completo: string };
  items?: CotizacionItem[];
}

export const useCotizaciones = () => {
  return useQuery({
    queryKey: ['cotizaciones'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cotizaciones')
        .select('*, cliente:clientes(id, nombre_completo), items:cotizacion_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((cotizacion: any) => ({
        ...cotizacion,
        descripcion: cotizacion.descripcion ?? cotizacion.nombre,
        cliente_nombre: cotizacion.cliente_nombre ?? cotizacion.cliente?.nombre_completo ?? '',
        total: cotizacion.total ?? cotizacion.total_precio,
        descuento_porcentaje: cotizacion.descuento_porcentaje ?? 0,
        validez_dias: cotizacion.validez_dias ?? 15,
      })) as Cotizacion[];
    },
  });
};

export const useCreateCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const cotizacion = payload.cotizacion || payload;
      const items: CotizacionItem[] = payload.items || cotizacion.items || [];
      const cotizacionDb = {
        cliente_id: cotizacion.cliente_id ?? null,
        nombre: cotizacion.nombre ?? cotizacion.descripcion ?? 'Sin nombre',
        margen_ganancia: cotizacion.margen_ganancia ?? 50,
        iva_percent: cotizacion.iva_percent ?? 0,
        subtotal: cotizacion.subtotal ?? 0,
        total_precio: cotizacion.total_precio ?? cotizacion.total ?? 0,
        estado: cotizacion.estado ?? 'borrador',
        notas: cotizacion.notas ?? null,
      };
      const { data: cot, error } = await (supabase as any)
        .from('cotizaciones')
        .insert(cotizacionDb)
        .select()
        .single();
      if (error) throw error;
      if (items.length > 0) {
        const { error: itemsError } = await (supabase as any)
          .from('cotizacion_items')
          .insert(items.map(i => ({
            cotizacion_id: cot.id,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            line_total: i.cantidad * i.precio_unitario,
          })));
        if (itemsError) throw itemsError;
      }
      return cot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      toast({ title: 'Cotización creada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useUpdateCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, cotizacion, items, ...rest } = payload;
      const source = cotizacion || rest;
      const itemsDb: CotizacionItem[] = items || source.items || [];
      const cotizacionToSave = {
        cliente_id: source.cliente_id ?? null,
        nombre: source.nombre ?? source.descripcion ?? 'Sin nombre',
        margen_ganancia: source.margen_ganancia ?? 50,
        iva_percent: source.iva_percent ?? 0,
        subtotal: source.subtotal ?? 0,
        total_precio: source.total_precio ?? source.total ?? 0,
        estado: source.estado ?? 'borrador',
        notas: source.notas ?? null,
      };
      const { error } = await (supabase as any)
        .from('cotizaciones')
        .update(cotizacionToSave)
        .eq('id', id);
      if (error) throw error;
      // Replace all items
      await (supabase as any).from('cotizacion_items').delete().eq('cotizacion_id', id);
      if (itemsDb.length > 0) {
        const { error: itemsError } = await (supabase as any)
          .from('cotizacion_items')
          .insert(itemsDb.map(i => ({
            cotizacion_id: id,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            line_total: i.cantidad * i.precio_unitario,
          })));
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      toast({ title: 'Cotización actualizada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      toast({ title: 'Cotización eliminada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

// ─── Hooks auxiliares faltantes para compatibilidad ──────────────────

function useTableList<T = any>(table: string, queryKey: string, orderBy = 'created_at') {
  return useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return data as T[];
    },
  });
}

function useTableCreate(table: string, queryKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

function useTableUpdate(table: string, queryKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, updates, ...rest } = payload;
      const patch = updates ?? rest;
      const { data, error } = await (supabase as any)
        .from(table)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

function useTableDelete(table: string, queryKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

export const useMaquinas = () => useTableList('maquinas', 'maquinas');
export const useCreateMaquina = () => useTableCreate('maquinas', 'maquinas');
export const useUpdateMaquina = () => useTableUpdate('maquinas', 'maquinas');
export const useDeleteMaquina = () => useTableDelete('maquinas', 'maquinas');

export const useMaquinaTintaActiva = (maquinaId?: string) => {
  return useQuery({
    queryKey: ['maquina_tinta_activa', maquinaId ?? 'all'],
    enabled: Boolean(maquinaId),
    queryFn: async () => {
      let query = (supabase as any).from('maquina_tinta_activa').select('*');
      if (maquinaId) query = query.eq('maquina_id', maquinaId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
export const useCreateMaquinaTintaActiva = () => useTableCreate('maquina_tinta_activa', 'maquina_tinta_activa');
export const useUpdateMaquinaTintaActiva = () => useTableUpdate('maquina_tinta_activa', 'maquina_tinta_activa');
export const useDeleteMaquinaTintaActiva = () => useTableDelete('maquina_tinta_activa', 'maquina_tinta_activa');

// movimientos_caja: la tabla real no tiene 'categoria' ni 'notas'.
// Se codifican en el campo 'referencia' como "cat=X|clave1=val1|..."
function normalizarMovimiento(m: any) {
  if (!m) return m;
  const ref = String(m.referencia || '');
  const catMatch = ref.match(/(?:^|\|)cat=([^|]+)/);
  return {
    ...m,
    notas: ref || m.notas,
    categoria: catMatch ? catMatch[1] : (m.categoria || undefined),
  };
}
function desnormalizarMovimiento(payload: any) {
  const { categoria, notas, ...rest } = payload ?? {};
  const categoriaTag = categoria ? `cat=${categoria}` : '';
  const notasStr = notas ? String(notas) : '';
  const referencia = [categoriaTag, notasStr].filter(Boolean).join('|') || undefined;
  return { ...rest, ...(referencia !== undefined ? { referencia } : {}) };
}
export const useMovimientosCaja = () => {
  return useQuery({
    queryKey: ['movimientos_caja'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizarMovimiento);
    },
  });
};
export const useCreateMovimientoCaja = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .insert([desnormalizarMovimiento(payload)])
        .select()
        .single();
      if (error) throw error;
      return normalizarMovimiento(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movimientos_caja'] }),
  });
};
export const useUpdateMovimientoCaja = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, updates, ...rest } = payload;
      const patch = desnormalizarMovimiento(updates ?? rest);
      const { data, error } = await supabase
        .from('movimientos_caja')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizarMovimiento(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movimientos_caja'] }),
  });
};

export const useConfiguracionNegocio = () => {
  return useQuery({
    queryKey: ['configuracion_negocio'],
    queryFn: async () => {
      const storedMap = getStoredConfiguracionMap();
      let dbMap: Record<string, string> = {};
      try {
        const { data } = await (supabase as any)
          .from('configuracion_negocio')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);
        const rows = Array.isArray(data) ? data : [];
        const dbPairs = mapConfigRowsToPairs(rows);
        dbMap = dbPairs.reduce<Record<string, string>>((acc, item) => {
          acc[item.clave] = item.valor;
          return acc;
        }, {});
      } catch {
        // Supabase inaccesible — usar solo localStorage
      }
      // localStorage siempre tiene precedencia sobre la BD
      const merged = { ...dbMap, ...storedMap };
      return Object.entries(merged).map(([clave, valor]) => ({ clave, valor }));
    },
  });
};
export const useUpdateConfiguracion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const patches = Array.isArray(payload)
        ? payload
        : payload?.clave
          ? [{ clave: payload.clave, valor: payload.valor }]
          : Object.entries(payload || {}).map(([clave, valor]) => ({ clave, valor }));

      // 1. Siempre guardar en localStorage (fuente primaria)
      const current = getStoredConfiguracionMap();
      for (const patch of patches) {
        if (!patch?.clave) continue;
        current[String(patch.clave)] = patch.valor == null ? '' : String(patch.valor);
      }
      setStoredConfiguracionMap(current);

      // 2. Persistir también en Supabase (best-effort, falla silenciosa)
      try {
        const updateObj = patches.reduce((acc: Record<string, any>, p: any) => {
          if (p?.clave) acc[String(p.clave)] = p.valor == null ? null : String(p.valor);
          return acc;
        }, {});
        if (Object.keys(updateObj).length > 0) {
          const { data: row } = await (supabase as any)
            .from('configuracion_negocio')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (row?.id) {
            await (supabase as any)
              .from('configuracion_negocio')
              .update(updateObj)
              .eq('id', row.id);
          }
        }
      } catch {
        // localStorage es suficiente si Supabase falla
      }

      return current;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion_negocio'] });
    },
  });
};

export const useComprasMaterial = () => useTableList('compras_material', 'compras_material', 'fecha_compra');
export const useCreateCompraMaterial = () => useTableCreate('compras_material', 'compras_material');
export const useUpdateCompraMaterial = () => useTableUpdate('compras_material', 'compras_material');
export const useDeleteCompraMaterial = () => useTableDelete('compras_material', 'compras_material');

export const useSolicitudesCompra = () => useTableList('solicitudes_compra', 'solicitudes_compra');
export const useCreateSolicitudCompra = () => useTableCreate('solicitudes_compra', 'solicitudes_compra');
export const useUpdateSolicitudCompra = () => useTableUpdate('solicitudes_compra', 'solicitudes_compra');
export const useDeleteSolicitudCompra = () => useTableDelete('solicitudes_compra', 'solicitudes_compra');

export const useOrdenesCompra = () => useTableList('ordenes_compra', 'ordenes_compra');
export const useCreateOrdenCompra = () => useTableCreate('ordenes_compra', 'ordenes_compra');
export const useUpdateOrdenCompra = () => useTableUpdate('ordenes_compra', 'ordenes_compra');

export const useUpdateProveedor = () => useTableUpdate('proveedores', 'proveedores');

export const useProductoMaterialesAll = () => useTableList('productos_materiales', 'productos_materiales');
export const useProductoMateriales = (productoId?: string) => {
  return useQuery({
    queryKey: ['productos_materiales', productoId ?? 'all'],
    enabled: true,
    queryFn: async () => {
      let query = (supabase as any).from('productos_materiales').select('*');
      if (productoId) query = query.eq('producto_id', productoId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
export const useCreateProductoMaterial = () => useTableCreate('productos_materiales', 'productos_materiales');
export const useUpdateProductoMaterial = () => useTableUpdate('productos_materiales', 'productos_materiales');
export const useDeleteProductoMaterial = () => useTableDelete('productos_materiales', 'productos_materiales');

export const useProductoPerfilTinta = (productoId?: string) => {
  return useQuery({
    queryKey: ['producto_perfil_tinta', productoId ?? 'all'],
    enabled: true,
    queryFn: async () => {
      let query = (supabase as any).from('producto_perfil_tinta').select('*');
      if (productoId) query = query.eq('producto_id', productoId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useRecipeModuleEnabled = () => true;

export const useDolar = () => {
  return useQuery({
    queryKey: ['dolar'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dolar')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });
};

export const useCreateTrabajo = () => useTableCreate('trabajos', 'trabajos');
export const useUpdatePedido = () => useTableUpdate('pedidos', 'pedidos');
export const useDeletePedido = () => useTableDelete('pedidos', 'pedidos');

export const useCreateConsumoTinta = () => useTableCreate('consumo_tinta_pedido', 'consumo_tinta_pedido');
export const useCreateConsumoMaterial = () => useTableCreate('consumo_materiales', 'consumo_materiales');
export const useConsumoMateriales = () => useTableList('consumo_materiales', 'consumo_materiales');
export const useConsumoTintaPedido = () => useTableList('consumo_tinta_pedido', 'consumo_tinta_pedido');
