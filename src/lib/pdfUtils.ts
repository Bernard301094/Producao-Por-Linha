import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { FinishedOperation } from '../api';

// Sobrecarga 1: chamada direta com doc jsPDF (SupervisorPanel)
export async function saveAndSharePDF(doc: jsPDF, filename: string): Promise<void>;
// Sobrecarga 2: chamada com lista de ops (App.tsx — gera o PDF internamente)
export async function saveAndSharePDF(ops: FinishedOperation[], loginProfile: string, dateStr: string): Promise<void>;

export async function saveAndSharePDF(
  docOrOps: jsPDF | FinishedOperation[],
  filenameOrProfile: string,
  dateStr?: string
): Promise<void> {
  let doc: jsPDF;
  let filename: string;

  if (Array.isArray(docOrOps)) {
    // Gera o PDF a partir da lista de ops
    const ops = docOrOps;
    const profile = filenameOrProfile;
    const today = dateStr || new Date().toLocaleDateString('pt-BR');

    doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Produção', 14, 20);
    doc.setFontSize(11);
    doc.text(`Turno: ${profile} \u2014 Data: ${today}`, 14, 28);

    const columns = ['OP', 'Produto', 'Litragem', 'Linha', 'Turno', 'Qtd', 'Início', 'Fim'];
    const rows = ops.map(op => [
      op.opNumber, op.produto, op.litragem, op.linha, op.turno,
      op.quantidade, op.horaInicial, op.horaFinal
    ]);
    autoTable(doc, { head: [columns], body: rows, startY: 34 });
    filename = `relatorio_${profile.replace(' ', '_')}_${today.replace(/\//g, '-')}.pdf`;
  } else {
    doc = docOrOps;
    filename = filenameOrProfile;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const result = await Filesystem.writeFile({
        path: filename,
        data: pdfBase64,
        directory: Directory.Documents,
      });
      await Share.share({
        title: filename,
        text: 'Relatório',
        url: result.uri,
        dialogTitle: 'Compartilhar Relatório',
      });
    } catch (e) {
      console.error('Error sharing PDF:', e);
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
}
