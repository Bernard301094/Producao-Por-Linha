import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function saveAndSharePDF(ops: any[], profile: string, dateStr: string) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(`Relatório de Produção - Turno ${profile}`, 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Data: ${dateStr}`, 14, 30);
  
  const tableData = ops.map(op => [
    op.opNumber,
    op.linha,
    op.produto,
    op.litragem || '-',
    op.quantidade,
    op.horaInicial,
    op.horaFinal
  ]);

  (doc as any).autoTable({
    startY: 40,
    head: [['OP', 'Linha', 'Produto', 'Litragem', 'Qtd', 'Início', 'Fim']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  doc.save(`Relatorio_Turno_${profile}_${dateStr}.pdf`);
}
