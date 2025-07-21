// Strict typing for business event types
export const BUSINESS_EVENT_TYPES = [
    "Conference",
    "Business Development",
    "Employee Training",
    "Marketing",
    "Other"
] as const;

// Strict typing for business player types  
export const BUSINESS_PLAYER_TYPES = [
    "Executives",
    "Management",
    "Workers",
    "Mix",
    "Other"
] as const;

// Strict typing for academic grade levels
export const ACADEMIC_GRADE_LEVELS = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "College Freshman",
    "College Sophomore",
    "College Junior",
    "College Senior",
    "Professional Development",
    "Other"
] as const;

// Type definitions
export type BusinessEventType = typeof BUSINESS_EVENT_TYPES[number];
export type BusinessPlayerType = typeof BUSINESS_PLAYER_TYPES[number];
export type AcademicGradeLevel = typeof ACADEMIC_GRADE_LEVELS[number];
export type UserType = 'academic' | 'business';

// Strongly typed options interfaces
interface FormOptions {
    readonly classLabel: string;
    readonly gradeLabel: string;
    readonly classPlaceholder: string;
}

export interface BusinessFormOptions extends FormOptions {
    readonly eventTypes: readonly BusinessEventType[];
    readonly playerTypes: readonly BusinessPlayerType[];
}

export interface AcademicFormOptions extends FormOptions {
    readonly gradeLevels: readonly AcademicGradeLevel[];
}

// Strongly typed options objects
export const BUSINESS_OPTIONS: BusinessFormOptions = {
    eventTypes: BUSINESS_EVENT_TYPES,
    playerTypes: BUSINESS_PLAYER_TYPES,
    classLabel: "Event Type",
    gradeLabel: "Player Type",
    classPlaceholder: "e.g., Annual Conference, Team Building"
} as const;

export const ACADEMIC_OPTIONS: AcademicFormOptions = {
    gradeLevels: ACADEMIC_GRADE_LEVELS,
    classLabel: "Class / Group Name",
    gradeLabel: "Grade Level / Audience",
    classPlaceholder: "e.g., Business 101, Math Club"
} as const;

// Strictly typed user type detection
export const getUserType = (user: any): UserType => {
    const userType = user?.user_metadata?.user_type;
    return userType === 'business' ? 'business' : 'academic';
};
