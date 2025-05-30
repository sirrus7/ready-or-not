// src/pages/DashboardPage/components/NotificationBanner.tsx - Notification display
import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface NotificationBannerProps {
    notification: { type: 'error' | 'success'; message: string } | null;
    onDismiss: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notification, onDismiss }) => {
    if (!notification) return null;

    return (
        <div className={`max-w-6xl mx-auto mb-4 p-4 rounded-md shadow-md text-sm
            ${notification.type === 'error'
            ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
            : 'bg-green-100 border-l-4 border-green-500 text-green-700'
        }`}
             role="alert"
        >
            <div className="flex">
                <div className="py-1">
                    {notification.type === 'error'
                        ? <AlertTriangle className="h-6 w-6 mr-3"/>
                        : <CheckCircle className="h-6 w-6 mr-3"/>
                    }
                </div>
                <div>
                    <p className="font-bold">
                        {notification.type === 'error' ? 'Error' : 'Success'}
                    </p>
                    <p>{notification.message}</p>
                </div>
                <button
                    onClick={onDismiss}
                    className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8"
                    aria-label="Dismiss"
                >
                    <XCircle className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};

export default NotificationBanner;
