// src/utils/generateTeamNameCards.ts
import { TeamConfig } from '../types';

export const generateTeamNameCardsPDF = (teams: TeamConfig[]): void => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
        alert('Please allow popups to generate the Team Name Cards PDF');
        return;
    }

    // Generate HTML for each team card
    const cardsHtml = teams.map((team, index) => `
        <div style="
            page-break-after: always;
            width: 8.5in;
            height: 11in;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: white;
        ">
            <!-- Left side banner -->
            <div style="
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 1.5in;
                background: #4a5f47;
                color: #d4af37;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px 10px;
            ">
                <img src="/images/ready-or-not-logo.png" style="
                    width: 80%;
                    height: auto;
                    margin-bottom: 20px;
                    filter: brightness(0) saturate(100%) invert(73%) sepia(56%) saturate(434%) hue-rotate(6deg) brightness(103%) contrast(87%);
                " alt="Logo" />
                <div style="
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    font-size: 24pt;
                    font-weight: bold;
                    font-family: Arial, sans-serif;
                    letter-spacing: 0.1em;
                ">
                    ${team.name.toUpperCase()}
                </div>
            </div>
            
            <!-- Right side banner -->
            <div style="
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 1.5in;
                background: #4a5f47;
                color: #d4af37;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px 10px;
            ">
                <img src="/images/ready-or-not-logo.png" style="
                    width: 80%;
                    height: auto;
                    margin-bottom: 20px;
                    filter: brightness(0) saturate(100%) invert(73%) sepia(56%) saturate(434%) hue-rotate(6deg) brightness(103%) contrast(87%);
                " alt="Logo" />
                <div style="
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    font-size: 24pt;
                    font-weight: bold;
                    font-family: Arial, sans-serif;
                    letter-spacing: 0.1em;
                ">
                    ${team.name.toUpperCase()}
                </div>
            </div>
            
            <!-- Center team name (larger) -->
            <div style="
                font-size: 120pt;
                font-weight: bold;
                color: #c46d2e;
                font-family: Arial, sans-serif;
                text-align: center;
                transform: rotate(-45deg);
                letter-spacing: 0.1em;
            ">
                ${team.name.toUpperCase()}
            </div>
        </div>
    `).join('');

    // Write the HTML document
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Team Name Cards</title>
            <style>
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
                body { 
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="padding: 20px; text-align: center;">
                <h2>Team Name Cards - Ready or Not</h2>
                <p>Click the button below to print or save as PDF</p>
                <button onclick="window.print()" style="
                    padding: 10px 20px;
                    font-size: 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Print / Save as PDF</button>
                <hr style="margin: 20px 0;">
            </div>
            ${cardsHtml}
        </body>
        </html>
    `);

    printWindow.document.close();
};