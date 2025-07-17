// =====================================================================================
// src/app/App.tsx - Optimized with React.memo
// =====================================================================================
import React from 'react';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import {PDFGenerationProvider} from "@shared/hooks/pdf/useTeamCardsPDF.tsx";
import Router from '@routing/Router';

const App: React.FC = React.memo(() => {
    return (
        <ErrorBoundary>
            <PDFGenerationProvider>
                <Router/>
            </PDFGenerationProvider>
        </ErrorBoundary>
    );
});

App.displayName = 'App';
export default App;