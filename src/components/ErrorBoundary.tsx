// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        console.error('[ErrorBoundary] Caught error:', error);
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Component error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 text-center">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Reload Page
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <details className="mt-4 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                                <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded overflow-auto">
                                    {this.state.error?.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;