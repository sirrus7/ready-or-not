
import { PDFConfig } from '../types';
import jsPDF from "jspdf";

export const createPDFDocument = (config: PDFConfig, debug: boolean = false) => {
    if (debug) {
        console.debug(`Creating pdf with orientation: ${config.orientation}, unit: ${config.unit}, format: ${config.format}`);
    }
    return new jsPDF({
        orientation: config.orientation,
        unit: config.unit,
        format: config.format
    });
};

export const addImageToPDF = (pdf: any, imageData: string, isFirstPage: boolean, debug: boolean): void => {
    if (debug) {
        console.debug("Adding image to pdf");
    }
    if (!isFirstPage) {
        pdf.addPage();
    }
    // The 11 and 8.5 here are important as they indicate the correct orientation
    // if they are flipped the image will be squished
    // This is kinda frail, revist
    pdf.addImage(imageData, 'PNG', 0, 0, 11, 8.5);
};

export const generateTimestampedFilename = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `team-name-cards-html2canvas-${timestamp}.pdf`;
};