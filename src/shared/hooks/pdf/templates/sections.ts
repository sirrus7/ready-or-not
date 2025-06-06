export const createLogoSection = (logoUrl?: string): string => {
    if (!logoUrl) return '';

    return `
    <img src="${logoUrl}" 
         style="width: 100px; height: 100px; object-fit: contain; margin: 20px 0;"
         crossorigin="anonymous" />
  `;
};

export const createTeamNameSection = (teamName: string): string => {
    return `
    <h1 style="font-size: 48px; margin: 30px 0; font-weight: bold; color: black;">
      ${teamName}
    </h1>
  `;
};

export const createQRSection = (qrCodeUrl?: string): string => {
    if (!qrCodeUrl) return '';

    return `
    <div style="margin: 20px 0;">
      <img src="${qrCodeUrl}" 
           style="width: 120px; height: 120px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #ddd;"
           crossorigin="anonymous" />
    </div>
  `;
};

// Top half - normal orientation
export const createTopHalf = (teamName: string, logoUrl?: string, showQR: boolean = false, qrCodeUrl?: string): string => {
    const content = showQR
        ? [createQRSection(qrCodeUrl), createTeamNameSection(teamName), createLogoSection(logoUrl)].filter(Boolean).join('')
        : [createLogoSection(logoUrl), createTeamNameSection(teamName)].filter(Boolean).join('');

    return `
    <div style="
      width: 680px;
      height: 439px;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
    ">
      ${content}
    </div>
  `;
};

// Bottom half - rotated 180 degrees (reflection)
export const createBottomHalf = (teamName: string, logoUrl?: string, showQR: boolean = false, qrCodeUrl?: string): string => {
    const content = showQR
        ? [createQRSection(qrCodeUrl), createTeamNameSection(teamName), createLogoSection(logoUrl)].filter(Boolean).join('')
        : [createLogoSection(logoUrl), createTeamNameSection(teamName)].filter(Boolean).join('');

    return `
    <div style="
      width: 680px;
      height: 439px;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
      transform: rotate(180deg);
    ">
      ${content}
    </div>
  `;
};

export const createHorizontalFoldLine = (): string => {
    return `
    <div style="
      width: 680px;
      height: 2px;
      background: black;
      box-shadow: 0 0 4px rgba(0,0,0,0.5);
    "></div>
  `;
};

export const createFoldableCardContainer = (topContent: string, bottomContent: string): string => {
    return `
    <div style="
      width: 680px; 
      height: 880px; 
      display: flex;
      flex-direction: column;
      align-items: stretch;
      box-sizing: border-box;
      background: white;
    ">
      ${topContent}
      ${createHorizontalFoldLine()}
      ${bottomContent}
    </div>
  `;
};

// Legacy functions (keeping for backward compatibility)
export const createMembersSection = (members?: string[]): string => {
    if (!members || members.length === 0) return '';

    const memberItems = members.map(member => `
    <div style="margin: 4px 0; background: rgba(0,0,0,0.1); padding: 6px 12px; border-radius: 12px; display: inline-block; margin: 3px; font-size: 14px;">${member}</div>
  `).join('');

    return `
    <div style="font-size: 18px; margin: 15px 0;">
      <h3 style="margin-bottom: 10px; font-size: 20px;">Team Members:</h3>
      ${memberItems}
    </div>
  `;
};

export const createCategorySection = (category?: string): string => {
    if (!category) return '';

    return `
    <div style="
      background: rgba(0,0,0,0.1); 
      padding: 10px 20px; 
      border-radius: 20px; 
      margin: 15px 0;
      font-size: 16px;
      font-weight: bold;
      border: 2px solid rgba(0,0,0,0.2);
    ">
      ${category}
    </div>
  `;
};

export const createCardContainer = (content: string): string => {
    return `
    <div style="
      width: 680px; 
      height: 880px; 
      padding: 40px;
      background: white;
      color: black;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
    ">
      ${content}
    </div>
  `;
};