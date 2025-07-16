// src/app/App.tsx - Simplified with routing extracted to Router.tsx
import React from 'react';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import {PDFGenerationProvider} from "@shared/hooks/pdf/useTeamCardsPDF.tsx";
import Router from '@routing/Router';
import { SSOProvider } from '../components/auth/SSOProvider';

const App: React.FC = () => {
    return (
        <SSOProvider>
            <ErrorBoundary>
                <PDFGenerationProvider>
                    <Router/>
                </PDFGenerationProvider>
            </ErrorBoundary>
        </SSOProvider>
    );
}

export default App;
