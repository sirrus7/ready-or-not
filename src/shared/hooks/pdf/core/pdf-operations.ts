
import { PDFConfig } from '../types';

export const createPDFDocument = (config: PDFConfig) => {
    return new (globalThis as any).jsPDF({
        orientation: config.orientation,
        unit: config.unit,
        format: config.format
    });
};

export const addImageToPDF = (pdf: any, imageData: string, isFirstPage: boolean): void => {
    if (!isFirstPage) {
        pdf.addPage();
    }
    pdf.addImage(imageData, 'PNG', 0, 0, 8.5, 11);
};

export const generateTimestampedFilename = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `team-name-cards-html2canvas-${timestamp}.pdf`;
};

export const loadPDFDependencies = async () => {
    const [jsPDF, html2canvas] = await Promise.all([
        import('jspdf').then(m => m.default),
        import('html2canvas').then(m => m.default)
    ]);

    (globalThis as any).jsPDF = jsPDF;
    (globalThis as any).html2canvas = html2canvas;

    return { jsPDF, html2canvas };
};