export const createLogoSection = (logoUrl?: string): string => {
    if (!logoUrl) return '';

    return `
    <img src="${logoUrl}" 
         style="width: 200px; height: 200px; object-fit: contain; margin: 10px;"
         crossorigin="anonymous" />
  `;
};

export const createTeamNameSection = (teamName: string): string => {
    return `
    <h1 style="font-size: 48px; margin: 20px 0; font-weight: bold; color: black; text-align: center;">
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
           style="width: 200px; height: 200px; background: white; padding: 4px; border-radius: 8px; border: 1px solid #ddd;"
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
        <div style="flex: 0 0 auto; width: 200px">
          </div>
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
      justify-content: space-evenly;
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
      ">
<!--      Space holder-->

          <div style="flex: 0 0 auto;">
            <div>Team Login</div>
            ${createQRSection(qrCodeUrl)}
          </div>
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

export const createFoldableCardContainer = (leftContent: string, rightContent: string): string => {
    return `
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
  `;
};