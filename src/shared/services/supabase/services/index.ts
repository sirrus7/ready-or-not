// src/shared/services/supabase/services/index.ts
import { sessionService } from './sessionService';
import { teamService } from './teamService';
import { decisionService } from './decisionService';
import { kpiService } from './kpiService';
import { adjustmentService } from './adjustmentService';
import { consequenceApplicationService } from './consequenceApplicationService';
import { payoffApplicationService } from './payoffApplicationService';
import { doubleDownService } from './doubleDownService';

export const db = {
    sessions: sessionService,
    teams: teamService,
    decisions: decisionService,
    kpis: kpiService,
    adjustments: adjustmentService,
    consequenceApplications: consequenceApplicationService,
    payoffApplications: payoffApplicationService,
    doubleDown: doubleDownService,
};