const imageWidth = '180px';

export const createLogoSection = (logoUrl?: string): string => {
    if (!logoUrl) return '';

    return `
    <img src="${logoUrl}" 
         style="width: ${imageWidth}; object-fit: contain;"
         crossorigin="anonymous" />
  `;
};

export const createTeamNameSection = (teamName: string): string => {
    return `
    <h1 style="font-family: 'Century Gothic','Nunito Sans', sans-serif; font-size: 86px; margin: 20px 0; font-weight: bold; color: black; text-align: center;">
      ${teamName}
    </h1>
  `;
};

export const createQRSection = (qrCodeUrl?: string): string => {
    if (!qrCodeUrl) return '';

    console.debug(`Creating Team Card QR Section with url: "${qrCodeUrl}"`)

    return `
    <div style="margin: 10px;">
      <img src="${qrCodeUrl}" 
           style="width: ${imageWidth}; object-fit: contain; background: white; border-radius: 8px; border: 1px solid #ddd;"
           crossorigin="anonymous" />
    </div>
  `;
};

// Left side - text rotated 90 degrees clockwise (baseline toward right edge)
export const createLeftSide = (teamName: string, logoUrl?: string): string => {
    return `
    <div style="
      width: 100%;
      height: 50%;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
      padding: 60px 20px;
      transform: rotate(-180deg);
    ">
      <div style="
        display: flex;
        flex-direction: row;
        width: 90%;
      ">
          <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
            ${createTeamNameSection(teamName)}
          </div>
          <div style="flex: 0 0 auto;">
            ${createLogoSection(logoUrl)}
          </div>
      </div>
    </div>
  `;
};

// Right side - text rotated 90 degrees counter-clockwise (baseline toward left edge)
export const createRightSide = (teamName: string, logoUrl?: string, qrCodeUrl?: string): string => {
    return `
    <div style="
      width: 100%;
      height: 50%;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
      padding: 60px 20px;
      border-top: 2px solid black;
    ">
    <div style="
        display: flex;
        flex-direction: row;
        width: 90%;
        justify-content: center;
      ">
          <div style="flex: 0 0 auto; flex-direction: row; justify-content: center">
              <div style="flex: 0 0 auto;">
              <div style="
                font-family: 'Century Gothic','Nunito Sans', sans-serif; 
                font-size: 20px; font-weight: bold; color: black; text-align: center;">
                Team Login
              </div>
                ${createQRSection(qrCodeUrl)}
              </div>
              <div style="flex: 0 0 auto;">
                ${createLogoSection(logoUrl)}
              </div>
          </div>
          <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
            ${createTeamNameSection(teamName)}
          </div>
      </div>
    </div>
  `;
};

export const createFoldableCardContainer = (leftContent: string, rightContent: string): string => {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');
                
                /* Reset body padding/margin */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Nunito Sans', sans-serif;
                }
            </style>
        </head>
        <body>
            <div style="
                width: 1100px;
                height: 850px; 
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                background: white;
                margin: 0 auto;
                page-break-inside: avoid;
            ">
                ${leftContent}
                ${rightContent}
            </div>
        </body>
    </html>
  `;
};