import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AppContext } from '../context/AppContext';
import ApiHealthIndicator from '../components/ApiHealthIndicator';
import { useToast } from '../context/ToastContext';

const Login = ({ onLogin: _onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(AppContext);
  const toast = useToast();

  // Background slideshow images (Florida-only, local assets)
  // Highest priority: VITE_LOGIN_BG_IMAGES (comma-separated paths under /public)
  // Else: default list under /public/destinations/
  const envBgList = (import.meta.env.VITE_LOGIN_BG_IMAGES || '').split(',').map(s => s.trim()).filter(Boolean);
  const defaultLocal = [
    '/destinations/KeysSevenMileBridges.jpg.webp',
    '/destinations/SombreroBeach-MarathonFL.jpg.webp',
    '/destinations/bradentonbeachcheap.jpg.webp',
    '/destinations/cocoabeachcheap.jpg.webp',
    '/destinations/fortmyersbeachcheap.jpg.webp',
    '/destinations/gainesvillecheap.jpg.webp',
    '/destinations/jaxxx.jpg.webp',
    '/destinations/newsmyrnacheap.jpg.webp',
    '/destinations/pensacolabeachcheap.jpg.webp',
    '/destinations/ponceinletcheap.jpg.webp',
    '/destinations/splitsville.jpg.webp'
  ];

  const backgroundImages = envBgList.length > 0 ? envBgList : defaultLocal;
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      )
    }, 5000)
    
    return () => clearInterval(interval)
  }, [backgroundImages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Registration mode
        if (!email || !password || !fullName || !username) {
          setError('All fields are required');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        const response = await authService.register(email, password, fullName, username);
        setError('');
        toast.success(response.message || 'Registration successful! Please check your email to verify your account.');
        setIsRegistering(false);
        setFullName('');
        setUsername('');
      } else {
        // Login mode
        if (!email || !password) {
          setError('Email and password are required');
          setIsLoading(false);
          return;
        }

        const response = await authService.login(email, password);
        
        if (response && response.user) {
          setUser(response.user);
          navigate('/dashboard');
        } else {
          setError('Invalid login response');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background slideshow */}
      <div className="absolute inset-0">
        {backgroundImages.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-center bg-cover transition-opacity duration-1000 ease-in-out ${i === bgIndex ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="bg-white/95 backdrop-blur-sm py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                  {isRegistering ? 'Create your account' : 'Sign in to JG Travelex'}
                </h2>
              </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {isRegistering && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <div className="mt-1">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create Account' : 'Sign in')}
                </button>
              </div>

              {error && (
                <div className="mt-2 text-center text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setFullName('');
                    setUsername('');
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isRegistering ? 'Sign in instead' : 'Create new account'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health indicator pinned */}
      <div className="absolute bottom-4 left-4 z-10">
        <ApiHealthIndicator />
      </div>
    </div>
  );
};

export default Login;