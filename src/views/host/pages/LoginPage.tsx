// src/views/host/pages/LoginPage.tsx - SIMPLIFIED VERSION
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider';
import {LogIn} from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const {signIn, signUp, user, loading: authLoading} = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Ready or Not - Login";
    }, []);

    // 🔧 SIMPLIFIED: Only redirect after successful manual login
    // Magic link routing is now handled by MagicLinkHandler
    useEffect(() => {
        // Only redirect if user exists and we're not in a loading state
        // This handles the case where someone manually logs in via the form
        if (!authLoading && user) {
            console.log('✅ User authenticated via login form, redirecting to dashboard');
            navigate('/dashboard', {replace: true});
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            if (isSignUp) {
                console.log('📝 Creating new account for:', email);
                await signUp(email, password);
                // Switch to login view after successful signup
                setIsSignUp(false);
                setPassword(''); // Clear password for security
                alert("Account created successfully! Please sign in."); // TODO: Replace with proper notification
            } else {
                console.log('🔐 Signing in user:', email);
                await signIn(email, password);
                // Navigation is handled by the useEffect above once 'user' state updates
            }
        } catch (err) {
            console.error('Login/Signup error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    // Show loading state while authenticating
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-700">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-8">
                <div className="flex items-center justify-center mb-6">
                    <LogIn className="w-10 h-10 text-game-orange-600"/>
                </div>

                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-transparent"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-transparent"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-game-orange-600 text-white py-2 px-4 rounded-md hover:bg-game-orange-700 focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:ring-offset-2 transition-colors"
                        disabled={authLoading}
                    >
                        {authLoading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Processing...
                            </div>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                            setPassword('');
                        }}
                        className="text-game-orange-600 hover:text-game-orange-800 text-sm font-medium"
                    >
                        {isSignUp
                            ? 'Already have an account? Sign in'
                            : "Don't have an account? Create one"
                        }
                    </button>
                </div>

                {/* Magic Link Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800 text-center">
                        <strong>Coming from Global Game Loader?</strong><br/>
                        You should be automatically signed in. If not, please contact support.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;