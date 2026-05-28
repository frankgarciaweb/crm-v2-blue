import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { uploadFile } from '@/services/storageService';

type PedidoPDFItem = {
  pedido: {
    id?: string;
    descripcion?: string;
    cantidad?: number;
    alto?: number;
    ancho?: number;
    metros_cuadrados?: number;
    tipo_cobro?: 'mt2' | 'unidad';
    fecha_limite?: string | null;
    medio_pago?: string;
    referencia_pago?: string;
    tipo_pago?: string;
    abono?: number;
    dias_credito?: number;
    maquina_usar?: string;
    prioridad?: string;
    estado?: string;
    precio_total?: number;
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
    telefono?: string;
    email?: string;
    direccion?: string;
  } | null;
  grupoPedidoId?: string;
  tasaCambioBs?: number | null;
};

function formatUsd(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatBs(value?: number | null) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-VE');
}

function buildItemTotal(pedido: PedidoPDFItem['pedido']) {
  const nestedTotal = Array.isArray(pedido.notas?.items)
    ? pedido.notas.items.reduce((acc: number, current: any) => acc + Number(current?.precio_total || 0), 0)
    : 0;
  return nestedTotal || Number(pedido.precio_total || 0);
}

function buildItemDescription(item: PedidoPDFItem) {
  const p = item.pedido;
  const firstNote = p.notas?.items?.[0];
  return item.producto?.nombre || firstNote?.producto_nombre || p.descripcion || 'Sin producto';
}

function buildDimensions(pedido: PedidoPDFItem['pedido']) {
  const alto = pedido.alto != null ? Number(pedido.alto) : null;
  const ancho = pedido.ancho != null ? Number(pedido.ancho) : null;
  if (alto == null || ancho == null) return '';
  return `${alto} x ${ancho}`;
}

function hasDimensions(pedido: PedidoPDFItem['pedido']) {
  const alto = pedido.alto != null ? Number(pedido.alto) : null;
  const ancho = pedido.ancho != null ? Number(pedido.ancho) : null;
  const firstNote = pedido.notas?.items?.[0];
  const tipoCobro = String(firstNote?.tipo_cobro || pedido.tipo_cobro || '').toLowerCase();
  if (alto == null || ancho == null) return false;
  if (tipoCobro === 'mt2') return true;
  return alto !== 1 || ancho !== 1;
}

function normalizePaymentType(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'abono') return 'parcial';
  return normalized;
}

export function generarPedidoPDF({ items, cliente, grupoPedidoId, tasaCambioBs }: PedidoPDFInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const ink: [number, number, number] = [32, 32, 32];
  const muted: [number, number, number] = [96, 96, 96];
  const lightGray: [number, number, number] = [242, 242, 242];
  const border: [number, number, number] = [214, 214, 214];
  const totalUsd = items.reduce((sum, item) => sum + buildItemTotal(item.pedido), 0);
  const first = items[0]?.pedido || {};
  const paymentType = normalizePaymentType(first.tipo_pago);
  const paymentMethod = first.medio_pago || 'Contado';
  const paymentLabel =
    paymentType === 'credito'
      ? 'Credito'
      : paymentType === 'parcial'
        ? 'Con abono'
        : 'Contado';
  const dueDate = first.fecha_limite || null;
  const exchange = Number(tasaCambioBs || 0);
  const totalBs = exchange > 0 ? totalUsd * exchange : null;
  const boleta = String(grupoPedidoId || first.id || '').slice(0, 8).toUpperCase();
  const paymentMeta = (first.notas?.payment || {}) as Record<string, any>;
  const abonoCurrency = String(paymentMeta.abono_moneda || '').toUpperCase();
  const abonoOriginal = Number(paymentMeta.abono_original ?? first.abono ?? 0);
  const abonoUsd = Number(first.abono || 0);
  const notesText = String(first.notas?.notas_libres || '').trim();

  const sectionHeader = (title: string, y: number) => {
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 6.2, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(title, margin + 2, y + 4.0);
  };

  doc.setDrawColor(ink[0], ink[1], ink[2]);
  doc.line(margin, 28, pageWidth - margin, 28);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('COMPROBANTE DE PEDIDO', pageWidth / 2, 38, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(`N° Pedido: ${boleta || '—'}`, margin, 47);
  doc.text(`Fecha: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 47, { align: 'right' });
  doc.text(`Fecha limite entrega: ${formatDate(dueDate)}`, pageWidth - margin, 53, { align: 'right' });

  let y = 59;
  sectionHeader('DATOS DEL CLIENTE', y);
  autoTable(doc, {
    startY: y + 6.5,
    head: [['Nombre', 'Cedula/RIF', 'Telefono']],
    body: [[
      cliente?.nombre_completo || '—',
      cliente?.cedula_rif || '—',
      cliente?.telefono || '—',
    ]],
    styles: {
      font: 'helvetica',
      fontSize: 7.7,
      textColor: [0, 0, 0],
      cellPadding: 1.0,
      lineColor: border,
      lineWidth: 0.18,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [70, 70, 70],
      fontStyle: 'normal',
      lineColor: border,
      lineWidth: 0.18,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    theme: 'grid',
    margin: { left: margin, right: margin },
    tableLineColor: border,
    tableLineWidth: 0.18,
  });
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : y + 12;

  sectionHeader('DETALLE DEL PRODUCTO / SERVICIO', y);
  y += 6.5;

  const detailRows = items.flatMap((item, index) => {
    const p = item.pedido;
    const qty = Number(p.cantidad || 1);
    const lineTotal = buildItemTotal(p);
    const unit = qty > 0 ? lineTotal / qty : lineTotal;
    const rows: any[] = [[
      buildItemDescription(item),
      hasDimensions(p) ? buildDimensions(p) : '',
      String(qty),
      `$${formatUsd(unit)}`,
      `$${formatUsd(lineTotal)}`,
    ]];

    if (index === 0 && notesText) {
      rows.push([{
        content: `Nota del pedido: ${notesText}`,
        colSpan: 5,
        styles: {
          fontStyle: 'italic',
          fillColor: [248, 248, 248],
        },
      }]);
    }

    return rows;
  });

  autoTable(doc, {
    startY: y,
    head: [['Descripcion', 'Dimensiones', 'Cant.', 'P. Unit.', 'Total']],
    body: detailRows,
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      textColor: [0, 0, 0],
      cellPadding: 1.0,
      lineColor: border,
      lineWidth: 0.18,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [70, 70, 70],
      fontStyle: 'normal',
      lineWidth: 0.18,
      lineColor: border,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    theme: 'grid',
    margin: { left: margin, right: margin },
    tableLineColor: border,
    tableLineWidth: 0.18,
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : y + 18;

  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFontSize(8.0);
  doc.text('SUBTOTAL:', pageWidth - margin - 54, y);
  doc.text(`$${formatUsd(totalUsd)}`, pageWidth - margin, y, { align: 'right' });
  y += 4.5;
  doc.setFontSize(9);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text('TOTAL:', pageWidth - margin - 54, y);
  doc.text(`$${formatUsd(totalUsd)}`, pageWidth - margin, y, { align: 'right' });
  y += 4;
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFontSize(7.0);
  if (totalBs !== null) {
    doc.text(`(equivalente a ${formatBs(totalBs)} Bs)`, pageWidth - margin, y, { align: 'right' });
  }
  y += 5;

  if (exchange > 0) {
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFontSize(7.0);
    doc.text(`Tasa de cambio usada: 1 USD = ${formatBs(exchange)} Bs`, margin, y);
    y += 5;
  }

  sectionHeader('INFORMACION DE PAGO', y);
  autoTable(doc, {
    startY: y + 6.0,
    head: [['Estado', 'Metodo de pago', 'Tipo de pago', 'Referencia']],
    body: [[
      first.estado ? first.estado.charAt(0).toUpperCase() + first.estado.slice(1) : 'Pendiente',
      paymentMethod,
      paymentLabel,
      first.referencia_pago || '—',
    ]],
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [0, 0, 0],
      cellPadding: 0.95,
      lineColor: border,
      lineWidth: 0.18,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [70, 70, 70],
      fontStyle: 'normal',
      lineColor: border,
      lineWidth: 0.18,
    },
    theme: 'grid',
    margin: { left: margin, right: margin },
    tableLineColor: border,
    tableLineWidth: 0.18,
  });
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : y + 12;

  if (paymentType === 'credito') {
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SALDO PENDIENTE (CREDITO):', margin, y);
    doc.text(`$${formatUsd(totalUsd)}`, pageWidth - margin, y, { align: 'right' });
    y += 4.5;
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    if (totalBs !== null) {
      doc.text(`(Equivalente a ${formatBs(totalBs)} Bs)`, pageWidth - margin, y, { align: 'right' });
    }
  } else if (paymentType === 'parcial') {
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `Abono recibido: ${abonoCurrency === 'BS' ? `Bs ${formatBs(abonoOriginal)}` : `$${formatUsd(abonoUsd)}`}`,
      margin,
      y
    );
  }

  if (paymentType === 'credito' || paymentType === 'parcial') {
    y += 6;
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFontSize(7.2);
    doc.text('IMPORTANTE: Para retirar la mercancia es necesario cancelar el saldo pendiente.', margin, y);
  }

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
  doc.setTextColor(124, 124, 124);
  doc.setFontSize(7);
  doc.text('Blue CRM', margin, pageHeight - 10);
  doc.text(`Pagina ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  return doc.output('blob');
}

export async function generarYSubirPedidoPDF(input: PedidoPDFInput) {
  const blob = generarPedidoPDF(input);
  const fileName = `pedido_${String(input.grupoPedidoId || input.items?.[0]?.pedido?.id || 'pdf').slice(0, 8).toUpperCase()}.pdf`;
  return uploadFile(blob, 'pedidos/pdf', fileName);
}
