import React, { useState, useEffect } from 'react';
import { Bug, Download, Trash2, RefreshCw, Eye, EyeOff, Filter } from 'lucide-react';
import { logger, LogLevel, LogCategory } from '../utils/logger';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState(logger.getLogs());
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    const levelMatch = selectedLevel === 'ALL' || log.level === selectedLevel;
    const categoryMatch = selectedCategory === 'ALL' || log.category === selectedCategory;
    return levelMatch && categoryMatch;
  });

  const exportLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([logger.exportLogs()], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `prisma-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const refreshLogs = () => {
    setLogs(logger.getLogs());
  };

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case 'DEBUG': return 'text-gray-600';
      case 'INFO': return 'text-blue-600';
      case 'WARN': return 'text-yellow-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-800';
    }
  };

  const getCategoryColor = (category: LogCategory) => {
    switch (category) {
      case 'AUTH': return 'bg-purple-100 text-purple-800';
      case 'NAV': return 'bg-blue-100 text-blue-800';
      case 'DATA': return 'bg-green-100 text-green-800';
      case 'UI': return 'bg-orange-100 text-orange-800';
      case 'SUPABASE': return 'bg-indigo-100 text-indigo-800';
      case 'SESSION': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Bug className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Debug Panel</h2>
              <p className="text-sm text-gray-600">Sistema de logs para diagnóstico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Level Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'ALL')}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="ALL">Todos os níveis</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as LogCategory | 'ALL')}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="ALL">Todas as categorias</option>
              <option value="AUTH">AUTH</option>
              <option value="NAV">NAV</option>
              <option value="DATA">DATA</option>
              <option value="UI">UI</option>
              <option value="SUPABASE">SUPABASE</option>
              <option value="SESSION">SESSION</option>
            </select>

            {/* Auto Refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                autoRefresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>Auto</span>
            </button>

            {/* Show Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 rounded text-sm flex items-center space-x-1 bg-gray-100 text-gray-800"
            >
              {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>Detalhes</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {filteredLogs.length} de {logs.length} logs
            </span>
            
            <button
              onClick={refreshLogs}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Atualizar</span>
            </button>

            <button
              onClick={exportLogs}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center space-x-1"
            >
              <Download className="h-3 w-3" />
              <span>Exportar</span>
            </button>

            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center space-x-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-auto p-4 bg-gray-900 text-green-400 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bug className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum log encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.slice(-500).map((log, index) => (
                <div key={index} className="flex items-start space-x-2 hover:bg-gray-800 p-1 rounded">
                  <span className="text-gray-500 whitespace-nowrap">
                    {log.timestamp}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </span>
                  <span className={`font-bold ${getLogColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-white flex-1">
                    {log.message}
                  </span>
                  {log.userId && (
                    <span className="text-blue-400 text-xs">
                      [{log.userId.slice(0, 8)}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        {showDetails && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 max-h-48 overflow-auto">
            <h3 className="font-semibold text-gray-800 mb-2">Informações de Debug</h3>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(logger.getDebugInfo(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}