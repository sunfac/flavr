import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DiagnosticPage() {
  const [systemInfo, setSystemInfo] = useState({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    location: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    reactVersion: '',
    errors: [] as string[]
  });

  useEffect(() => {
    try {
      // Test basic functionality
      const tests = [];
      
      // Test React
      if (typeof React !== 'undefined') {
        setSystemInfo(prev => ({ ...prev, reactVersion: 'Available' }));
      }
      
      // Test API connectivity
      fetch('/api/health')
        .then(response => response.json())
        .then(data => {
          console.log('API Health Check:', data);
        })
        .catch(error => {
          setSystemInfo(prev => ({ 
            ...prev, 
            errors: [...prev.errors, `API Error: ${error.message}`]
          }));
        });
        
    } catch (error) {
      setSystemInfo(prev => ({ 
        ...prev, 
        errors: [...prev.errors, `System Error: ${error}`]
      }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-400 mb-2">Flavr Diagnostics</h1>
          <p className="text-slate-300">System Status & Health Check</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-green-400">✅ System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Timestamp:</span>
                <div className="text-slate-200 font-mono">{systemInfo.timestamp}</div>
              </div>
              <div>
                <span className="text-slate-400">Viewport:</span>
                <div className="text-slate-200 font-mono">{systemInfo.viewport}</div>
              </div>
              <div>
                <span className="text-slate-400">Location:</span>
                <div className="text-slate-200 font-mono break-all">{systemInfo.location}</div>
              </div>
              <div>
                <span className="text-slate-400">React:</span>
                <div className="text-slate-200 font-mono">{systemInfo.reactVersion || 'Not Available'}</div>
              </div>
            </div>
            
            <div>
              <span className="text-slate-400">User Agent:</span>
              <div className="text-slate-200 font-mono text-xs break-all">{systemInfo.userAgent}</div>
            </div>
          </CardContent>
        </Card>

        {systemInfo.errors.length > 0 && (
          <Card className="bg-red-900/20 border-red-700">
            <CardHeader>
              <CardTitle className="text-red-400">⚠️ Errors Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {systemInfo.errors.map((error, index) => (
                  <li key={index} className="text-red-300 font-mono text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-blue-400">🧪 Quick Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => {
                alert('JavaScript is working!');
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Test JavaScript Alert
            </Button>
            
            <Button 
              onClick={() => {
                window.location.href = '/';
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Navigate to Home
            </Button>
            
            <Button 
              onClick={() => {
                window.location.reload();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-purple-400">📋 Console Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded p-4 font-mono text-sm">
              <div className="text-green-400">Console output will appear here...</div>
              <div className="text-slate-400 mt-2">Check browser dev tools for detailed logs.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}