// src/main.tsx - With debugging to track root-level remounts
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';

console.log('🔍 [MAIN] Starting main.tsx execution');
console.log('🔍 [MAIN] Environment:', import.meta.env.MODE);

const rootElement = document.getElementById('root');
console.log('🔍 [MAIN] Root element:', rootElement ? 'found' : 'NOT FOUND');

if (!rootElement) {
    throw new Error('Root element not found');
}

console.log('🏗️ [MAIN] Creating React root');
const root = createRoot(rootElement);

console.log('🏗️ [MAIN] About to render App into root');
root.render(
    <StrictMode>
        <App/>
    </StrictMode>
);

console.log('🏗️ [MAIN] App rendered into root - main.tsx complete');
