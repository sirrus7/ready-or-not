// src/app/App.tsx - Simplified with routing extracted to Router.tsx
import React, {useEffect} from 'react';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import {PDFGenerationProvider} from "@shared/hooks/pdf/useTeamCardsPDF.tsx";
import Router from '@routing/Router';

const App: React.FC = () => {
    useEffect(() => {
        console.log('🏗️ [APP] COMPONENT MOUNTED');
        return () => console.log('💀 [APP] COMPONENT UNMOUNTED');
    }, []);

    console.log('🔍 [APP] Component re-rendering');

    return (
        <ErrorBoundary>
            <PDFGenerationProvider>
                <Router/>
            </PDFGenerationProvider>
        </ErrorBoundary>
    );
}

export default App;
