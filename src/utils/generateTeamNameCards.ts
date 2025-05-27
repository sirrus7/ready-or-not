// src/utils/generateTeamNameCards.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TeamConfig {
    name: string;
}

// --- Configuration (USER TO ADJUST) ---
const LOGO_URL = '/images/ready-or-not-logo.png'; // Your confirmed logo path

const CAPTURE_WIDTH_PX = 1020;
const CAPTURE_HEIGHT_PX = 1320;
const HTML2CANVAS_SCALE = 2;

const STRIP_WIDTH_PERCENT = 12;

const LOGO_EFFECTIVE_WIDTH_ON_STRIP_AS_PERCENT_OF_STRIP_ACTUAL_WIDTH = 85;
const LOGO_EFFECTIVE_HEIGHT_ON_STRIP_AS_PERCENT_OF_CAPTURE_HEIGHT = 55;

const LOGO_OVERLAP_PERCENT_OF_EFFECTIVE_WIDTH = 25;
// --- End Configuration ---

const preloadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error(`Failed to load image for html2canvas at path: ${src}`, err);
            resolve(img);
        };
    });
};

const getTeamNameFontSizeForHTML = (teamName: string): string => {
    const length = teamName.length;
    // --- INCREASED FONT SIZES ---
    if (length > 10) return '4.5vw'; // Previously 3.5vw
    if (length > 7) return '5.5vw';  // Previously 4.5vw
    if (length > 5) return '6.5vw';  // Previously 5vw
    return '7.5vw'; // Previously 6vw
};

const generateCardHTMLInternal = (team: TeamConfig, logoUrlForHTML: string): string => {
    const teamName = team.name.toUpperCase();
    const fontSize = getTeamNameFontSizeForHTML(teamName);

    const stripActualWidthPx = CAPTURE_WIDTH_PX * (STRIP_WIDTH_PERCENT / 100.0);
    const logoCssHeightPx = stripActualWidthPx * (LOGO_EFFECTIVE_WIDTH_ON_STRIP_AS_PERCENT_OF_STRIP_ACTUAL_WIDTH / 100.0);
    const logoCssWidthPx = CAPTURE_HEIGHT_PX * (LOGO_EFFECTIVE_HEIGHT_ON_STRIP_AS_PERCENT_OF_CAPTURE_HEIGHT / 100.0);
    const overlapAmountPx = logoCssHeightPx * (LOGO_OVERLAP_PERCENT_OF_EFFECTIVE_WIDTH / 100.0);

    const baseLogoImgStyle = `
    width: ${logoCssWidthPx}px;
    height: ${logoCssHeightPx}px;
    object-fit: contain;
    position: relative;
    z-index: 10; /* --- ADDED Z-INDEX TO BRING LOGO FORWARD --- */
  `;

    // For the left logo, shifting it right (positive left value)
    const leftLogoSpecificStyle = `left: ${overlapAmountPx}px; transform: rotate(90deg);`;
    // For the right logo, shifting it left (positive right value)
    const rightLogoSpecificStyle = `right: ${overlapAmountPx}px; transform: rotate(-90deg);`;

    return `
    <div style="
      width: ${CAPTURE_WIDTH_PX}px;
      height: ${CAPTURE_HEIGHT_PX}px;
      display: flex;
      flex-direction: row;
      font-family: 'Helvetica', Arial, sans-serif;
      background-color: white; /* Main background */
      overflow: hidden;
      box-sizing: border-box;
    ">
      {/* --- Left Black Strip ---
          Added position: relative and z-index: 1 to help with stacking context if needed,
          though the z-index on the image itself should be primary.
      --- */}
      <div style="
        width: ${STRIP_WIDTH_PERCENT}%;
        height: 100%;
        background-color: black;
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        position: relative; /* For potential z-index stacking if needed, or for absolute children */
        z-index: 1; /* Ensure strips are above default page background, but below explicitly higher z-index children */
      ">
        ${logoUrlForHTML ? `<img src="${logoUrlForHTML}" alt="Logo" style="
          ${baseLogoImgStyle}
          ${leftLogoSpecificStyle}
        "/>` : ''}
      </div>

      {/* --- White Area ---
          Ensure it doesn't have a higher z-index that would cover the overlapping logo.
          Default z-index (auto or 0) should be fine if the logo image has a higher z-index.
      --- */}
      <div style="
        flex-grow: 1;
        height: 100%;
        position: relative; /* For fold line */
        display: flex;
        background-color: white; /* Explicit background */
        box-sizing: border-box;
      ">
        <div style="position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background-color: #cccccc; transform: translateX(-50%);"></div>
        <div style="width: 50%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; box-sizing: border-box;">
          <div style="transform: rotate(90deg); font-size: ${fontSize}; font-weight: bold; color: rgb(204, 102, 51); white-space: nowrap;">${teamName}</div>
        </div>
        <div style="width: 50%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; box-sizing: border-box;">
          <div style="transform: rotate(-90deg); font-size: ${fontSize}; font-weight: bold; color: rgb(204, 102, 51); white-space: nowrap;">${teamName}</div>
        </div>
      </div>

      {/* --- Right Black Strip --- */}
      <div style="
        width: ${STRIP_WIDTH_PERCENT}%;
        height: 100%;
        background-color: black;
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        position: relative;
        z-index: 1;
      ">
        ${logoUrlForHTML ? `<img src="${logoUrlForHTML}" alt="Logo" style="
          ${baseLogoImgStyle}
          ${rightLogoSpecificStyle}
        "/>` : ''}
      </div>
    </div>
  `;
};

export const generateTeamNameCardsPDF = async (teams: TeamConfig[] | undefined): Promise<void> => {
    if (!teams || teams.length === 0) {
        console.warn('No teams provided for name card generation.');
        return;
    }
    try {
        await preloadImage(LOGO_URL);
        console.log("Logo preloaded successfully for html2canvas.");
    } catch (e) {
        console.error("Logo preloading failed.", e);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    // captureContainer.style.left = '0px'; // For debugging make it visible
    // captureContainer.style.top = '0px'; // For debugging make it visible
    // captureContainer.style.border = '1px solid blue'; // For debugging
    captureContainer.style.left = '-9999px';
    captureContainer.style.top = '-9999px';
    document.body.appendChild(captureContainer);

    try {
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            captureContainer.innerHTML = generateCardHTMLInternal(team, LOGO_URL);
            await new Promise(resolve => setTimeout(resolve, 150)); // Allow render

            const canvas = await html2canvas(captureContainer, {
                scale: HTML2CANVAS_SCALE,
                useCORS: true,
                logging: process.env.NODE_ENV === 'development',
                width: CAPTURE_WIDTH_PX,
                height: CAPTURE_HEIGHT_PX,
                windowWidth: CAPTURE_WIDTH_PX,
                windowHeight: CAPTURE_HEIGHT_PX,
                backgroundColor: null, // Important for transparent backgrounds if needed
            });
            const imgData = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11);
            console.log(`Processed card for team: ${team.name}`);
        }
        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`team-name-cards-html2canvas-${timestamp}.pdf`);
    } catch (error) {
        console.error("Error during PDF generation with html2canvas:", error);
        throw error;
    } finally {
        if (captureContainer.parentElement) {
            captureContainer.parentElement.removeChild(captureContainer);
        }
    }
};