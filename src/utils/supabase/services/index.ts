// src/utils/supabase/services/index.ts - Unified export as db object
import { teamService } from './teamService';
import { sessionService } from './sessionService';
import { decisionService } from './decisionService';
import { kpiService } from './kpiService';
import { adjustmentService } from './adjustmentService';
import { healthService } from './healthService';

// Create the unified db object that maintains the existing API
export const db = {
    // Teams domain
    teams: teamService,

    // Sessions domain
    sessions: sessionService,

    // Team decisions domain
    decisions: decisionService,

    // Team KPIs/round data domain
    kpis: kpiService,

    // Permanent KPI adjustments domain
    adjustments: adjustmentService,

    // Health check and utilities
    ...healthService
};
