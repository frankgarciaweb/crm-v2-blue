import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type PedidoPDFItem = {
  pedido: {
    descripcion?: string;
    cantidad?: number;
    fecha_limite?: string | null;
    medio_pago?: string;
    referencia_pago?: string;
    notas?: any;
  };
  producto?: {
    nombre?: string;
  } | null;
};

type PedidoPDFInput = {
  items: PedidoPDFItem[];
  cliente?: {
    nombre_completo?: string;
    cedula_rif?: string;
  } | null;
  grupoPedidoId?: string;
};

export function generarPedidoPDF({ items, cliente, grupoPedidoId }: PedidoPDFInput) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Pedido', 14, 18);
  doc.setFontSize(10);
  doc.text(`Grupo: ${grupoPedidoId || ''}`, 14, 26);
  doc.text(`Cliente: ${cliente?.nombre_completo || ''}`, 14, 32);
  doc.text(`C.I/RIF: ${cliente?.cedula_rif || ''}`, 14, 38);

  autoTable(doc, {
    startY: 46,
    head: [['Producto', 'Descripción', 'Cantidad']],
    body: items.map(item => [
      item.producto?.nombre || '',
      item.pedido.descripcion || '',
      String(item.pedido.cantidad ?? 1),
    ]),
  });

  return doc.output('blob');
}

export async function generarYSubirPedidoPDF(input: PedidoPDFInput) {
  const blob = generarPedidoPDF(input);
  return URL.createObjectURL(blob);
}

