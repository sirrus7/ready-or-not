import { describe, it, expect } from 'vitest'

describe('Import Debug', () => {
    it('should import SSOService', async () => {
        try {
            const { SSOService } = await import('../sso-service')
            expect(SSOService).toBeDefined()
            expect(typeof SSOService).toBe('function')
        } catch (error) {
            console.error('Import error:', error)
            throw error
        }
    })

    it('should create SSOService instance', async () => {
        try {
            const { SSOService } = await import('../sso-service')
            const service = new SSOService('https://test-url.supabase.co', 'test-key', 'test-secret')
            expect(service).toBeInstanceOf(SSOService)
        } catch (error) {
            console.error('Instance creation error:', error)
            throw error
        }
    })
})