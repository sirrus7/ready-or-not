// src/components/StudentDisplay/StudentDisplayWrapper.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayPage from '../../pages/StudentDisplayPage';

// Simple wrapper that just extracts sessionId and passes it to StudentDisplayPage
// No authentication required for the student display
const StudentDisplayWrapper: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();

    return <StudentDisplayPage sessionId={sessionId} />;
};

export default StudentDisplayWrapper;