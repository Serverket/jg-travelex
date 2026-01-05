import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AppContext } from '../context/AppContext';
import ApiHealthIndicator from '../components/ApiHealthIndicator';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

const ENV_BACKGROUND_IMAGES = (import.meta.env.VITE_LOGIN_BG_IMAGES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const DEFAULT_BACKGROUND_IMAGES = [
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

  const backgroundImages = ENV_BACKGROUND_IMAGES.length > 0 ? ENV_BACKGROUND_IMAGES : DEFAULT_BACKGROUND_IMAGES;
  const [bgIndex, setBgIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState(() => new Set());
  const [logoReady, setLogoReady] = useState(false);
  const overlayGradientClass = 'bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-slate-950/90';
  const prevBgIndexRef = useRef(bgIndex);

  const ambienceGlowPrimary = 'bg-blue-500/30';
  const ambienceGlowSecondary = 'bg-indigo-500/30';

  const cardClasses = 'relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-8 text-blue-100/80 shadow-2xl shadow-blue-500/10 backdrop-blur sm:px-10';

  const copyWrapperClass = 'space-y-8 text-blue-100/80';

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      )
    }, 5000)
    
    return () => clearInterval(interval)
  }, [backgroundImages.length]);

  useEffect(() => {
    setLoadedImages(new Set());
  }, [backgroundImages]);

  useEffect(() => {
    prevBgIndexRef.current = bgIndex;
  }, [bgIndex]);

  useEffect(() => {
    const nextSrc = backgroundImages[(bgIndex + 1) % backgroundImages.length];
    if (!nextSrc || loadedImages.has(nextSrc)) return;

    const image = new Image();
    const handleLoad = () => {
      setLoadedImages(prev => {
        if (prev.has(nextSrc)) return prev;
        const updated = new Set(prev);
        updated.add(nextSrc);
        return updated;
      });
    };
    image.onload = handleLoad;
    image.src = nextSrc;
    if (image.complete) {
      handleLoad();
    }
  }, [bgIndex, backgroundImages, loadedImages]);

  useEffect(() => {
    if (logoReady) return;
    const activeSrc = backgroundImages[bgIndex];
    if (activeSrc && loadedImages.has(activeSrc)) {
      setLogoReady(true);
    }
  }, [bgIndex, backgroundImages, loadedImages, logoReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Registration mode
        if (!email || !password || !fullName || !username) {
          setError('Todos los campos son obligatorios');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setIsLoading(false);
          return;
        }

        const response = await authService.register(email, password, fullName, username);
        setError('');
        toast.success(response.message || '¡Registro exitoso! Por favor revise su email para verificar su cuenta.');
        setIsRegistering(false);
        setFullName('');
        setUsername('');
      } else {
        // Login mode
        if (!email || !password) {
          setError('El email y la contraseña son obligatorios');
          setIsLoading(false);
          return;
        }

        const response = await authService.login(email, password);
        
        if (response && response.user) {
          setUser(response.user);
          navigate('/dashboard');
        } else {
          setError('Respuesta de login inválida');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      const message = err?.message || 'Error de autenticación. Por favor intente nuevamente.';
      setError(message);
      const statusCode = err?.code;
      const redirectData = {
        email: err?.email || email,
        reason: statusCode || 'ACCESS_EXPIRED',
        message
      };

      if (statusCode === 'ACCESS_EXPIRED' || statusCode === 'ACCOUNT_DISABLED') {
        navigate('/access/expired', { state: redirectData });
      } else if (message.toLowerCase().includes('acceso temporal ha expirado')) {
        navigate('/access/expired', { state: redirectData });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const previousBgIndex = prevBgIndexRef.current;
  const activeBackgroundSrc = backgroundImages[bgIndex];
  const activeImageLoaded = activeBackgroundSrc ? loadedImages.has(activeBackgroundSrc) : false;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0" aria-hidden="true">
        {backgroundImages.map((src, index) => {
          const isActive = index === bgIndex;
          const isPreviousActive = previousBgIndex !== bgIndex && index === previousBgIndex;
          const isLoaded = loadedImages.has(src);
          const shouldShow = (isActive && isLoaded) || (isPreviousActive && !activeImageLoaded);
          return (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out will-change-opacity ${
                shouldShow ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${src})` }}
            >
              <img
                src={src}
                alt=""
                className="invisible h-0 w-0"
                onLoad={() => {
                  setLoadedImages(prev => {
                    if (prev.has(src)) return prev;
                    const updated = new Set(prev);
                    updated.add(src);
                    return updated;
                  });
                }}
              />
            </div>
          );
        })}
        <div className={`absolute inset-0 ${overlayGradientClass} backdrop-blur`} />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className={`pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full ${ambienceGlowPrimary} blur-3xl`} />
        <div className={`pointer-events-none absolute -bottom-16 right-0 h-72 w-72 rounded-full ${ambienceGlowSecondary} blur-3xl`} />

        <div className="w-full max-w-lg" data-aos="fade-up">
          <div className={copyWrapperClass}>
            <div
              className={cardClasses}
              data-aos="fade-up"
              data-aos-delay="80"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),transparent_55%)]" />
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.15)' }}
              />

              <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mb-6 flex justify-center">
                  <div
                    className={`group inline-flex transform-gpu transition-all duration-700 ease-out ${
                      logoReady ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                    }`}
                  >
                    <Logo
                      size="large"
                      showDropShadow={true}
                      variant="original"
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>
                <h2 className="text-center text-3xl font-semibold tracking-tight text-white">
                  {isRegistering ? 'Crear su cuenta' : 'Iniciar sesión en JG TravelEx'}
                </h2>
                <p className="text-center text-sm text-blue-100/70">
                  Acceso seguro para socios y agentes certificados.
                </p>
              </div>

              <form className="relative z-10 mt-8 space-y-6" onSubmit={handleSubmit}>
                {isRegistering && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-blue-100/80">
                        Nombre Completo
                      </label>
                      <div className="mt-1">
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          required
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-blue-100/80">
                        Nombre de Usuario
                      </label>
                      <div className="mt-1">
                        <input
                          id="username"
                          name="username"
                          type="text"
                          autoComplete="username"
                          required
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-blue-100/80">
                    Correo Electrónico
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-blue-100/80">
                    Contraseña
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full justify-center rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-blue-600/80 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (isRegistering ? 'Creando cuenta...' : 'Iniciando sesión...') : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
                  </button>
                </div>

                {error && (
                  <div className="mt-2 text-center text-sm font-medium text-rose-400" role="alert">
                    {error}
                  </div>
                )}
              </form>

              <div className="relative z-10 mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-blue-100/70 backdrop-blur-sm">
                      {isRegistering ? '¿Ya tiene una cuenta?' : '¿No tiene una cuenta?'}
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
                    className="flex w-full justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-blue-100/80 shadow-inner shadow-blue-500/10 transition-all hover:scale-[1.01] hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    {isRegistering ? 'Iniciar sesión' : 'Crear nueva cuenta'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <ApiHealthIndicator />
      </div>
    </div>
  );
};

export default Login;