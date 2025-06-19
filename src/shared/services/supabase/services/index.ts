// src/shared/services/supabase/services/index.ts
// Updated to include consequence applications service

import {sessionService} from './sessionService';
import {teamService} from './teamService';
import {decisionService} from './decisionService';
import {kpiService} from './kpiService';
import {adjustmentService} from './adjustmentService';
import {consequenceApplicationService} from './consequenceApplicationService';
import {payoffApplicationService} from './payoffApplicationService';

export const db = {
    sessions: sessionService,
    teams: teamService,
    decisions: decisionService,
    kpis: kpiService,
    adjustments: adjustmentService,
    consequenceApplications: consequenceApplicationService,
    payoffApplications: payoffApplicationService,
};
