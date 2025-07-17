import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 AUTH FORM: Submit attempt', { isLogin, email });
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        console.log('🔑 ATTEMPTING LOGIN...');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('🔍 LOGIN RESULT:', { hasError: !!error, error: error?.message });
        if (error) {
          throw error;
        }
        console.log('✅ LOGIN SUCCESS');
      } else {
        console.log('📝 ATTEMPTING SIGNUP...');
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        console.log('🔍 SIGNUP RESULT:', { hasError: !!error, error: error?.message });
        if (error) {
          throw error;
        }
        console.log('✅ SIGNUP SUCCESS');
      }
    } catch (error: any) {
      console.error('❌ AUTH ERROR:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prisma IA</h1>
          <p className="text-gray-600">
            {isLogin ? 'Entre em sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                <span>{isLogin ? 'Entrar' : 'Cadastrar'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Form */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="ml-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              {isLogin ? 'Cadastre-se' : 'Entre aqui'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}