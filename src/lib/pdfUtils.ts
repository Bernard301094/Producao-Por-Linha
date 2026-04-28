import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function saveAndSharePDF(doc: jsPDF, filename: string) {
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
      // Fallback
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
}
