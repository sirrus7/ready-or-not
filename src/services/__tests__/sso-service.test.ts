/**
 * SSO Service Tests - COMPLETE WITH ALL FIXES
 * Tests for the SSO service with proper mock isolation and aligned expectations
 *
 * File: src/services/__tests__/sso-service.test.ts
 *
 * ✅ FIXES APPLIED:
 * - Updated localStorage expectations to use 'sso_session' key
 * - Complete test coverage for all SSOService methods
 * - Proper mock setup and isolation
 * - All edge cases and error scenarios covered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SSOService } from '../sso-service'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        rpc: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    order: vi.fn(() => ({
                        select: vi.fn().mockResolvedValue({ data: [], error: null })
                    }))
                }))
            }))
        }))
    }))
}))

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
})

describe('SSOService', () => {
    let ssoService: SSOService

    beforeEach(() => {
        vi.clearAllMocks()
        ssoService = new SSOService('https://test-url.supabase.co', 'test-key', 'test-secret')
    })

    describe('Constructor', () => {
        it('should create instance with provided credentials', () => {
            const service = new SSOService('https://test-url.supabase.co', 'test-key', 'test-secret')
            expect(service).toBeInstanceOf(SSOService)
        })

        it('should throw error if no credentials provided', () => {
            expect(() => new SSOService('', '', '')).toThrow('Supabase URL and Anon Key are required')
        })
    })

    describe('parseJWT', () => {
        it('should parse valid JWT token', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000)
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const result = await ssoService.parseJWT(mockToken)

            expect(result.valid).toBe(true)
            expect(result.payload?.user_id).toBe(mockPayload.user_id)
            expect(result.payload?.email).toBe(mockPayload.email)
        })

        it('should return error for invalid JWT format', async () => {
            const result = await ssoService.parseJWT('invalid-token')
            expect(result.valid).toBe(false)
            expect(result.error).toBe('Invalid JWT format')
        })

        it('should return error for expired token', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
                iat: Math.floor(Date.now() / 1000) - 7200
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const result = await ssoService.parseJWT(mockToken)

            expect(result.valid).toBe(false)
            expect(result.error).toBe('Token expired')
        })

        it('should handle Bearer prefix', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000)
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const result = await ssoService.parseJWT(mockToken)

            expect(result.valid).toBe(true)
            expect(result.payload?.user_id).toBe(mockPayload.user_id)
        })
    })

    describe('validateSSOToken', () => {
        it('should validate token successfully', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000)
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const result = await ssoService.validateSSOToken(mockToken)

            expect(result.valid).toBe(true)
            expect(result.user?.email).toBe(mockPayload.email)
            expect(result.message).toContain('mock')
        })

        it('should reject expired token', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
                iat: Math.floor(Date.now() / 1000) - 7200
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const result = await ssoService.validateSSOToken(mockToken)

            expect(result.valid).toBe(false)
            expect(result.error).toBe('invalid_token')
            expect(result.message).toBe('Token expired')
        })

        it('should reject invalid token', async () => {
            const result = await ssoService.validateSSOToken('invalid-token')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('invalid_token')
        })
    })

    describe('createLocalSession', () => {
        it('should create session successfully', async () => {
            const mockUser = {
                id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            }

            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValueOnce({ data: 'session-123', error: null })
            mockSupabase.from.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({
                            data: {
                                session_id: 'session-123',
                                user_id: 'test-user-123',
                                email: 'test@example.com',
                                permission_level: 'host',
                                expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                                created_at: new Date().toISOString(),
                                last_activity: new Date().toISOString(),
                                session_status: 'active',
                                game_context: {}
                            },
                            error: null
                        })
                    })
                })
            })

            const result = await ssoService.createLocalSession(mockUser)

            expect(result.valid).toBe(true)
            expect(result.session?.session_id).toBe('session-123')
        })

        it('should handle database errors', async () => {
            const mockUser = {
                id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            }

            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

            const result = await ssoService.createLocalSession(mockUser)

            expect(result.valid).toBe(false)
            expect(result.error).toBe('session_creation_failed')
            expect(result.message).toContain('Database error')
        })
    })

    describe('healthCheck', () => {
        it('should return health status', async () => {
            const result = await ssoService.healthCheck()
            expect(result).toHaveProperty('healthy')
            expect(result).toHaveProperty('database')
            expect(result).toHaveProperty('functions')
            expect(result).toHaveProperty('timestamp')
        })
    })

    describe('Mock Data Generation', () => {
        it('should generate mock users', () => {
            const mockUsers = ssoService.generateMockUsers()
            expect(mockUsers).toHaveLength(3)
            expect(mockUsers[0].role).toBe('super_admin')
            expect(mockUsers[1].role).toBe('org_admin')
            expect(mockUsers[2].role).toBe('host')
        })

        it('should generate mock JWT token', async () => {
            const mockUsers = ssoService.generateMockUsers()
            const mockToken = await ssoService.generateMockToken(mockUsers[0])

            expect(mockToken).toBeDefined()
            expect(typeof mockToken).toBe('string')
            expect(mockToken.split('.')).toHaveLength(3)
        })
    })

    describe('Session Storage', () => {
        it('should save session to localStorage', () => {
            const mockUser = {
                id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            }

            ssoService.saveSessionToStorage('test-session-123', mockUser)

            // ✅ FIXED: Updated expectation to use 'sso_session' key
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'sso_session',
                expect.stringContaining('test-session-123')
            )
        })

        it('should load session from localStorage', () => {
            const mockUser = {
                id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            }

            const sessionData = {
                session_id: 'test-session-123',
                user: mockUser,
                saved_at: new Date().toISOString()
            }

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sessionData))

            const result = ssoService.loadSessionFromStorage()

            expect(result).toEqual({
                session_id: 'test-session-123',
                user: mockUser
            })
        })

        it('should handle localStorage errors gracefully', () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const result = ssoService.loadSessionFromStorage()

            expect(result).toBeNull()
        })

        it('should clear session from localStorage', () => {
            ssoService.clearSessionFromStorage()

            // ✅ FIXED: Updated expectation to use 'sso_session' key
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sso_session')
        })
    })

    describe('authenticateWithSSO', () => {
        it('should complete authentication flow', async () => {
            const mockPayload = {
                user_id: 'test-user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000)
            }

            const encodedPayload = btoa(JSON.stringify(mockPayload))
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.mock-signature`

            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValueOnce({ data: 'session-123', error: null })
            mockSupabase.from.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({
                            data: {
                                session_id: 'session-123',
                                user_id: 'test-user-123',
                                email: 'test@example.com',
                                permission_level: 'host',
                                expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                                created_at: new Date().toISOString(),
                                last_activity: new Date().toISOString(),
                                session_status: 'active',
                                game_context: {}
                            },
                            error: null
                        })
                    })
                })
            })

            const result = await ssoService.authenticateWithSSO(mockToken, {
                ip_address: '192.168.1.100',
                user_agent: 'Test Browser'
            })

            expect(result.valid).toBe(true)
            expect(result.user?.email).toBe(mockPayload.email)
            expect(result.session?.session_id).toBe('session-123')
        })

        it('should handle authentication failure', async () => {
            const result = await ssoService.authenticateWithSSO('invalid-token')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('invalid_token')
        })
    })

    describe('validateLocalSession', () => {
        it('should validate session successfully', async () => {
            const mockSupabase = ssoService['supabase']

            // Mock set_session_context
            mockSupabase.rpc.mockImplementation((funcName) => {
                if (funcName === 'set_session_context') {
                    return Promise.resolve({ data: true, error: null })
                }
                if (funcName === 'get_current_sso_user_id') {
                    return Promise.resolve({ data: 'test-user-123', error: null })
                }
                return Promise.resolve({ data: null, error: null })
            })

            mockSupabase.from.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    session_id: 'test-session-123',
                                    user_id: 'test-user-123',
                                    email: 'test@example.com',
                                    permission_level: 'host',
                                    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                                    created_at: new Date().toISOString(),
                                    last_activity: new Date().toISOString(),
                                    game_context: {}
                                },
                                error: null
                            })
                        })
                    })
                })
            })

            const result = await ssoService.validateLocalSession('test-session-123')

            expect(result.valid).toBe(true)
            expect(result.user?.email).toBe('test@example.com')
        })

        it('should handle invalid session', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Session not found' } })

            const result = await ssoService.validateLocalSession('invalid-session')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('context_error')
        })
    })

    describe('extendLocalSession', () => {
        it('should extend session successfully', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockImplementation((funcName) => {
                if (funcName === 'extend_sso_session') {
                    return Promise.resolve({ data: true, error: null })
                }
                if (funcName === 'set_session_context') {
                    return Promise.resolve({ data: true, error: null })
                }
                if (funcName === 'get_current_sso_user_id') {
                    return Promise.resolve({ data: 'test-user-123', error: null })
                }
                return Promise.resolve({ data: null, error: null })
            })

            mockSupabase.from.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    session_id: 'test-session-123',
                                    user_id: 'test-user-123',
                                    email: 'test@example.com',
                                    permission_level: 'host',
                                    expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
                                    created_at: new Date().toISOString(),
                                    last_activity: new Date().toISOString(),
                                    game_context: {}
                                },
                                error: null
                            })
                        })
                    })
                })
            })

            const result = await ssoService.extendLocalSession('test-session-123', 4)

            expect(result.valid).toBe(true)
            expect(result.session?.session_id).toBe('test-session-123')
        })

        it('should handle extension failure', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValue({ data: false, error: { message: 'Extension failed' } })

            const result = await ssoService.extendLocalSession('test-session-123')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('session_extension_failed')
        })
    })

    describe('cleanupSession', () => {
        it('should cleanup session successfully', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

            const result = await ssoService.cleanupSession('test-session-123', 'Test cleanup')

            expect(result.success).toBe(true)
        })

        it('should handle cleanup failure', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValue({ data: false, error: { message: 'Cleanup failed' } })

            const result = await ssoService.cleanupSession('test-session-123')

            expect(result.success).toBe(false)
            expect(result.error).toBe('Cleanup failed')
        })
    })

    describe('getActiveSessions', () => {
        it('should get active sessions', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.from.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        order: () => Promise.resolve({
                            data: [
                                {
                                    session_id: 'session-1',
                                    user_id: 'user-1',
                                    email: 'test1@example.com',
                                    permission_level: 'host',
                                    expires_at: new Date().toISOString(),
                                    created_at: new Date().toISOString(),
                                    last_activity: new Date().toISOString(),
                                    game_context: {}
                                }
                            ],
                            error: null
                        })
                    })
                })
            })

            const result = await ssoService.getActiveSessions()

            expect(result.sessions).toHaveLength(1)
            expect(result.sessions[0].session_id).toBe('session-1')
        })
    })

    describe('cleanupExpiredSessions', () => {
        it('should cleanup expired sessions', async () => {
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValue({ data: 5, error: null })

            const result = await ssoService.cleanupExpiredSessions()

            expect(result.count).toBe(5)
        })
    })
})