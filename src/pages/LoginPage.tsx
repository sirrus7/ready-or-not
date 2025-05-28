// src/pages/LoginPage.tsx
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {LogIn} from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const {signIn, signUp, user, loading: authLoading} = useAuth(); // Added authLoading
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if user is already logged in and auth is not loading
        if (!authLoading && user) {
            navigate('/dashboard', {replace: true});
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            if (isSignUp) {
                await signUp(email, password);
                // Optional: Automatically sign in after successful sign up
                // await signIn(email, password);
                // Or, just tell them to log in now
                setIsSignUp(false); // Switch to login view
                alert("Account created successfully! Please sign in."); // Or a more sophisticated notification
            } else {
                await signIn(email, password);
                // Navigation is handled by the useEffect above once 'user' state updates
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div
                className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-8"> {/* Enhanced styling */}
                <div className="flex items-center justify-center mb-6"> {/* Reduced margin */}
                    <LogIn className="w-10 h-10 text-blue-600"/> {/* Slightly smaller icon */}
                </div>

                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6"> {/* Reduced margin */}
                    {isSignUp ? 'Create Host Account' : 'Host Login'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5"> {/* Slightly reduced spacing */}
                    <div>
                        <label htmlFor="email"
                               className="block text-sm font-medium text-gray-700 mb-1"> {/* Added htmlFor */}
                            Email Address
                        </label>
                        <input
                            id="email" // Added id
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Added shadow-sm, rounded-md
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label htmlFor="password"
                               className="block text-sm font-medium text-gray-700 mb-1"> {/* Added htmlFor */}
                            Password
                        </label>
                        <input
                            id="password" // Added id
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Added shadow-sm, rounded-md
                            required
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 ease-in-out" // Enhanced styling
                    >
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }} // Clear error on toggle
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none" // Added focus style
                    >
                        {isSignUp
                            ? 'Already have an account? Sign in'
                            : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;