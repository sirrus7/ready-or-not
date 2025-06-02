// src/shared/types/api.ts
import {User as SupabaseUser} from '@supabase/supabase-js';

// --- User & Authentication ---
export type User = SupabaseUser;

// Add any other pure API request/response DTOs here if they don't cleanly fit
// into UI-specific DTOs or database entities.
// Example: export interface LoginRequest { email: string; password: string; }
// For now, only User is explicitly defined.