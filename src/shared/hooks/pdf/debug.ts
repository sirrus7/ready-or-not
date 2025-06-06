import html2canvas from 'html2canvas';

// Simple debug utility - drop this anywhere in your pipeline
export const debugStep = (content: string | HTMLElement | HTMLCanvasElement, title: string = 'Debug') => {
    const debugContainer = document.createElement('div');
    debugContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 400px;
    max-height: 500px;
    background: white;
    border: 3px solid #007acc;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
    overflow: hidden;
  `;

    // Header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
    background: #007acc;
    color: white;
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
  `;
    header.innerHTML = `
    <span>${title}</span>
    <button id="debug-close" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    ">✕ Close</button>
  `;

    // Content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
    padding: 10px;
    max-height: 400px;
    overflow: auto;
    background: #f9f9f9;
  `;

    // Handle different content types
    if (typeof content === 'string') {
        // HTML string
        const preview = document.createElement('div');
        preview.innerHTML = content;
        preview.style.cssText = `
      transform: scale(0.3);
      transform-origin: top left;
      width: 333%;
      height: auto;
      border: 1px solid #ddd;
      background: white;
    `;
        contentArea.appendChild(preview);

        // Add raw HTML view
        const rawHtml = document.createElement('details');
        rawHtml.innerHTML = `
      <summary style="cursor: pointer; margin-top: 10px; font-weight: bold;">View Raw HTML</summary>
      <pre style="background: #eee; padding: 10px; font-size: 11px; overflow-x: auto; white-space: pre-wrap;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    `;
        contentArea.appendChild(rawHtml);

    } else if (content instanceof HTMLElement) {
        // DOM element
        const clone = content.cloneNode(true) as HTMLElement;
        clone.style.cssText = `
      transform: scale(0.3);
      transform-origin: top left;
      width: 333%;
      height: auto;
      border: 1px solid #ddd;
      background: white;
    `;
        contentArea.appendChild(clone);

        // Add dimensions info
        const info = document.createElement('div');
        info.style.cssText = 'margin-top: 10px; font-size: 12px; color: #666;';
        info.innerHTML = `
      <strong>Dimensions:</strong><br>
      offsetWidth: ${content.offsetWidth}px<br>
      offsetHeight: ${content.offsetHeight}px<br>
      scrollWidth: ${content.scrollWidth}px<br>
      scrollHeight: ${content.scrollHeight}px
    `;
        contentArea.appendChild(info);

    } else if (content instanceof HTMLCanvasElement) {
        // Canvas element
        const canvasClone = content.cloneNode(true) as HTMLCanvasElement;
        canvasClone.style.cssText = `
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      background: white;
    `;
        contentArea.appendChild(canvasClone);

        // Add canvas info
        const info = document.createElement('div');
        info.style.cssText = 'margin-top: 10px; font-size: 12px; color: #666;';
        info.innerHTML = `
      <strong>Canvas Info:</strong><br>
      Width: ${content.width}px<br>
      Height: ${content.height}px<br>
      Data URL length: ${content.toDataURL().length} chars
    `;
        contentArea.appendChild(info);
    }

    debugContainer.appendChild(header);
    debugContainer.appendChild(contentArea);
    document.body.appendChild(debugContainer);

    // Close button functionality
    const closeButton = header.querySelector('#debug-close') as HTMLElement;
    closeButton.onclick = () => {
        document.body.removeChild(debugContainer);
    };

    // Return cleanup function
    return () => {
        if (document.body.contains(debugContainer)) {
            document.body.removeChild(debugContainer);
        }
    };
};

// Quick debug functions for specific steps
export const debugHTML = (htmlContent: string) => {
    return debugStep(htmlContent, 'HTML Content');
};

export const debugDOM = (element: HTMLElement) => {
    return debugStep(element, 'DOM Element');
};

export const debugCanvas = (canvas: HTMLCanvasElement) => {
    return debugStep(canvas, 'Canvas Output');
};

// Async canvas debug with html2canvas
export const debugCanvasAsync = async (element: HTMLElement) => {
    const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
    });
    return debugStep(canvas, 'html2canvas Result');
};

// Chain multiple debug steps
export const debugChain = {
    html: (content: string) => {
        debugHTML(content);
        return debugChain;
    },
    dom: (element: HTMLElement) => {
        debugDOM(element);
        return debugChain;
    },
    canvas: (canvas: HTMLCanvasElement) => {
        debugCanvas(canvas);
        return debugChain;
    }
};

export const previewImage = (canvas: HTMLCanvasElement, title: string = 'Image Preview'): Promise<boolean> => {
    return new Promise((resolve) => {
        // Convert canvas to image data
        const imageDataUrl = canvas.toDataURL('image/png');

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

        // Header with title and controls
        const header = document.createElement('div');
        header.style.cssText = `
      background: #007acc;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px 8px 0 0;
    `;

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.margin = '0';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '📥 Download Image';
        downloadBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'preview-image.png';
            link.href = imageDataUrl;
            link.click();
        };

        // Continue button
        const continueBtn = document.createElement('button');
        continueBtn.textContent = '✅ Continue to PDF';
        continueBtn.style.cssText = `
      background: #28a745;
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
        continueBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.style.cssText = `
      background: #dc3545;
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(continueBtn);
        buttonContainer.appendChild(cancelBtn);

        header.appendChild(titleElement);
        header.appendChild(buttonContainer);

        // Image content area
        const content = document.createElement('div');
        content.style.cssText = `
      padding: 20px;
      text-align: center;
    `;

        // Create image element
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.style.cssText = `
      max-width: 100%;
      max-height: 70vh;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    `;

        // Image info
        const info = document.createElement('div');
        info.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 14px;
      color: #666;
      text-align: left;
    `;
        info.innerHTML = `
      <strong>Image Details:</strong><br>
      Canvas Size: ${canvas.width} × ${canvas.height} pixels<br>
      Data URL Length: ${imageDataUrl.length.toLocaleString()} characters<br>
      Estimated File Size: ${Math.round(imageDataUrl.length * 0.75 / 1024)} KB<br>
      Format: PNG
    `;

        content.appendChild(img);
        content.appendChild(info);

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(false);
            }
        };

        // ESC key to close
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);

        document.body.appendChild(overlay);
    });
};