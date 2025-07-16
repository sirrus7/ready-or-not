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

            const mockSessionId = 'test-session-123'
            const mockSessionData = {
                session_id: mockSessionId,
                user_id: mockUser.id,
                email: mockUser.email,
                permission_level: mockUser.role,
                expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                session_status: 'active',
                game_context: { game: 'ready-or-not' }
            }

            // Mock the Supabase calls
            const mockSupabase = ssoService['supabase']
            mockSupabase.rpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnValueOnce({
                    eq: vi.fn().mockReturnValueOnce({
                        single: vi.fn().mockResolvedValueOnce({ data: mockSessionData, error: null })
                    })
                })
            })

            const result = await ssoService.createLocalSession(mockUser)

            expect(result.valid).toBe(true)
            expect(result.session?.session_id).toBe(mockSessionId)
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

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'ready_or_not_sso_session',
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

            ;(localStorage.getItem as any).mockReturnValue(JSON.stringify(sessionData))

            const result = ssoService.loadSessionFromStorage()

            expect(result).toEqual({
                session_id: 'test-session-123',
                user: mockUser
            })
        })

        it('should handle localStorage errors gracefully', () => {
            ;(localStorage.getItem as any).mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const result = ssoService.loadSessionFromStorage()

            expect(result).toBeNull()
        })

        it('should clear session from localStorage', () => {
            ssoService.clearSessionFromStorage()

            expect(localStorage.removeItem).toHaveBeenCalledWith('ready_or_not_sso_session')
        })
    })
})