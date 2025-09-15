// === PERFORMANCE MONITORING SYSTEM FOR SLO COMPLIANCE ===

import { Express, Request, Response, NextFunction } from "express";

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userId?: number;
  userAgent?: string;
  contentLength?: number;
}

interface EndpointSLO {
  name: string;
  endpoint: string;
  targetP50: number; // milliseconds
  targetP95: number; // milliseconds
  critical: boolean;
}

// Define SLOs for critical endpoints
const ENDPOINT_SLOs: EndpointSLO[] = [
  { name: "Chef Assist Inspire", endpoint: "/api/chef-assist/inspire", targetP50: 1500, targetP95: 2000, critical: true },
  { name: "Weekly Planner Titles", endpoint: "/api/generate-weekly-titles", targetP50: 2000, targetP95: 4000, critical: true },
  { name: "Chat Interactions", endpoint: "/api/chat", targetP50: 1000, targetP95: 1500, critical: true },
  { name: "User Auth", endpoint: "/api/me", targetP50: 200, targetP95: 500, critical: true },
  { name: "Subscription Status", endpoint: "/api/subscription-status", targetP50: 200, targetP95: 500, critical: true },
  { name: "Quota Status", endpoint: "/api/quota-status", targetP50: 200, targetP95: 500, critical: true },
  { name: "Recipe Generation", endpoint: "/api/generate-recipe", targetP50: 3000, targetP95: 6000, critical: true },
  { name: "Fridge Recipe", endpoint: "/api/generate-fridge-recipe", targetP50: 3000, targetP95: 6000, critical: true },
  { name: "Shopping Recipe", endpoint: "/api/generate-shopping-recipe", targetP50: 3000, targetP95: 6000, critical: true },
  { name: "Recipe History", endpoint: "/api/recipes", targetP50: 500, targetP95: 1000, critical: false },
  { name: "Chat History", endpoint: "/api/chat/history", targetP50: 300, targetP95: 800, critical: false }
];

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 50000; // Keep last 50k metrics for analysis
  
  // Performance monitoring middleware
  static createMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalSend = res.send;
      
      // Override res.send to capture response data
      res.send = function(data: any) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Record the metric
        PerformanceMonitor.recordMetric({
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: endTime,
          userId: (req.session as any)?.userId,
          userAgent: req.get('User-Agent'),
          contentLength: data ? JSON.stringify(data).length : 0
        });
        
        // Call original send
        return originalSend.call(this, data);
      };
      
      next();
    };
  }
  
  // Record performance metric
  private static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Cleanup old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    // Log slow requests immediately
    const slo = this.getSLOForEndpoint(metric.endpoint);
    if (slo && metric.responseTime > slo.targetP95) {
      console.warn(`🐌 SLOW REQUEST: ${metric.method} ${metric.endpoint} took ${metric.responseTime}ms (SLO P95: ${slo.targetP95}ms)`);
    }
  }
  
  // Get SLO configuration for endpoint
  private static getSLOForEndpoint(endpoint: string): EndpointSLO | undefined {
    return ENDPOINT_SLOs.find(slo => endpoint.startsWith(slo.endpoint));
  }
  
  // Calculate percentiles for an array of values
  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  // Generate performance report for time window
  static generateReport(timeWindowMinutes: number = 60): {
    summary: {
      totalRequests: number;
      avgResponseTime: number;
      p50ResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      errorRate: number;
    };
    endpointPerformance: Array<{
      endpoint: string;
      slo: EndpointSLO;
      metrics: {
        requestCount: number;
        avgResponseTime: number;
        p50ResponseTime: number;
        p95ResponseTime: number;
        errorRate: number;
        sloCompliant: boolean;
        slowestRequest: number;
      };
    }>;
    sloCompliance: {
      overall: boolean;
      criticalEndpointsCompliant: number;
      totalCriticalEndpoints: number;
      failingEndpoints: string[];
    };
  } {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (recentMetrics.length === 0) {
      return this.getEmptyReport();
    }
    
    // Overall summary
    const responseTimes = recentMetrics.map(m => m.responseTime);
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    
    const summary = {
      totalRequests: recentMetrics.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      p50ResponseTime: this.calculatePercentile(responseTimes, 50),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      errorRate: (errorCount / recentMetrics.length) * 100
    };
    
    // Endpoint-specific analysis
    const endpointPerformance = ENDPOINT_SLOs.map(slo => {
      const endpointMetrics = recentMetrics.filter(m => m.endpoint.startsWith(slo.endpoint));
      
      if (endpointMetrics.length === 0) {
        return {
          endpoint: slo.endpoint,
          slo,
          metrics: {
            requestCount: 0,
            avgResponseTime: 0,
            p50ResponseTime: 0,
            p95ResponseTime: 0,
            errorRate: 0,
            sloCompliant: true, // No requests = compliant
            slowestRequest: 0
          }
        };
      }
      
      const endpointResponseTimes = endpointMetrics.map(m => m.responseTime);
      const endpointErrors = endpointMetrics.filter(m => m.statusCode >= 400).length;
      const p50 = this.calculatePercentile(endpointResponseTimes, 50);
      const p95 = this.calculatePercentile(endpointResponseTimes, 95);
      
      const sloCompliant = p50 <= slo.targetP50 && p95 <= slo.targetP95;
      
      return {
        endpoint: slo.endpoint,
        slo,
        metrics: {
          requestCount: endpointMetrics.length,
          avgResponseTime: Math.round(endpointResponseTimes.reduce((a, b) => a + b, 0) / endpointResponseTimes.length),
          p50ResponseTime: p50,
          p95ResponseTime: p95,
          errorRate: (endpointErrors / endpointMetrics.length) * 100,
          sloCompliant,
          slowestRequest: Math.max(...endpointResponseTimes)
        }
      };
    });
    
    // SLO compliance analysis
    const criticalEndpoints = endpointPerformance.filter(ep => ep.slo.critical);
    const compliantCriticalEndpoints = criticalEndpoints.filter(ep => ep.metrics.sloCompliant);
    const failingEndpoints = endpointPerformance
      .filter(ep => !ep.metrics.sloCompliant && ep.metrics.requestCount > 0)
      .map(ep => ep.endpoint);
    
    const sloCompliance = {
      overall: failingEndpoints.length === 0,
      criticalEndpointsCompliant: compliantCriticalEndpoints.length,
      totalCriticalEndpoints: criticalEndpoints.length,
      failingEndpoints
    };
    
    return {
      summary,
      endpointPerformance,
      sloCompliance
    };
  }
  
  // Generate empty report structure
  private static getEmptyReport() {
    return {
      summary: {
        totalRequests: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0
      },
      endpointPerformance: ENDPOINT_SLOs.map(slo => ({
        endpoint: slo.endpoint,
        slo,
        metrics: {
          requestCount: 0,
          avgResponseTime: 0,
          p50ResponseTime: 0,
          p95ResponseTime: 0,
          errorRate: 0,
          sloCompliant: true,
          slowestRequest: 0
        }
      })),
      sloCompliance: {
        overall: true,
        criticalEndpointsCompliant: 0,
        totalCriticalEndpoints: ENDPOINT_SLOs.filter(slo => slo.critical).length,
        failingEndpoints: []
      }
    };
  }
  
  // Generate detailed performance dashboard HTML
  static generateDashboardHTML(): string {
    const report = this.generateReport(60); // Last hour
    
    const endpointRows = report.endpointPerformance
      .filter(ep => ep.metrics.requestCount > 0)
      .map(ep => {
        const statusIcon = ep.metrics.sloCompliant ? '✅' : '❌';
        const criticalBadge = ep.slo.critical ? '<span style="background: #ff4444; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">CRITICAL</span>' : '';
        
        return `
          <tr style="background: ${ep.metrics.sloCompliant ? '#f0f9ff' : '#fef2f2'}">
            <td>${statusIcon} ${ep.endpoint} ${criticalBadge}</td>
            <td>${ep.metrics.requestCount}</td>
            <td>${ep.metrics.avgResponseTime}ms</td>
            <td>${ep.metrics.p50ResponseTime}ms <small>(target: ${ep.slo.targetP50}ms)</small></td>
            <td>${ep.metrics.p95ResponseTime}ms <small>(target: ${ep.slo.targetP95}ms)</small></td>
            <td>${ep.metrics.errorRate.toFixed(1)}%</td>
            <td>${ep.metrics.slowestRequest}ms</td>
          </tr>
        `;
      }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Flavr Performance Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .metric-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
          .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 4px; }
          .slo-status { padding: 15px; border-radius: 6px; margin-bottom: 20px; }
          .slo-compliant { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
          .slo-failing { background: #fee2e2; border: 1px solid #ef4444; color: #7f1d1d; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #f3f4f6; }
          tr:hover { background: #f9fafb; }
          .refresh-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Flavr Performance Dashboard</h1>
          <p>Real-time performance monitoring with SLO compliance tracking</p>
          <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        </div>
        
        <div class="summary">
          <div class="metric-card">
            <div class="metric-value">${report.summary.totalRequests}</div>
            <div class="metric-label">Total Requests (1h)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${report.summary.p50ResponseTime}ms</div>
            <div class="metric-label">P50 Response Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${report.summary.p95ResponseTime}ms</div>
            <div class="metric-label">P95 Response Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${report.summary.errorRate.toFixed(1)}%</div>
            <div class="metric-label">Error Rate</div>
          </div>
        </div>
        
        <div class="slo-status ${report.sloCompliance.overall ? 'slo-compliant' : 'slo-failing'}">
          <strong>SLO Compliance Status:</strong> 
          ${report.sloCompliance.overall ? '✅ All SLOs are being met' : '❌ Some SLOs are failing'}
          <br>
          Critical Endpoints: ${report.sloCompliance.criticalEndpointsCompliant}/${report.sloCompliance.totalCriticalEndpoints} compliant
          ${report.sloCompliance.failingEndpoints.length > 0 ? `<br>Failing: ${report.sloCompliance.failingEndpoints.join(', ')}` : ''}
        </div>
        
        <h2>Endpoint Performance Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Requests</th>
              <th>Avg Time</th>
              <th>P50</th>
              <th>P95</th>
              <th>Error Rate</th>
              <th>Slowest</th>
            </tr>
          </thead>
          <tbody>
            ${endpointRows}
          </tbody>
        </table>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          Dashboard generated at ${new Date().toLocaleString()} | Data from last 60 minutes
        </p>
      </body>
      </html>
    `;
  }
  
  // Get current metrics for API consumption
  static getCurrentMetrics() {
    return {
      totalMetrics: this.metrics.length,
      report: this.generateReport(60),
      slos: ENDPOINT_SLOs
    };
  }
  
  // Performance testing helper
  static async testEndpointPerformance(endpoint: string, testCount: number = 10): Promise<{
    endpoint: string;
    testCount: number;
    results: number[];
    avgResponseTime: number;
    p50: number;
    p95: number;
    sloCompliant: boolean;
    slo?: EndpointSLO;
  }> {
    const slo = this.getSLOForEndpoint(endpoint);
    const results: number[] = [];
    
    console.log(`🧪 Performance testing ${endpoint} (${testCount} requests)...`);
    
    // This would normally make actual HTTP requests
    // For now, we'll extract recent performance data for the endpoint
    const recentMetrics = this.metrics
      .filter(m => m.endpoint.startsWith(endpoint))
      .slice(-testCount)
      .map(m => m.responseTime);
    
    if (recentMetrics.length === 0) {
      console.warn(`No recent metrics found for ${endpoint}`);
      return {
        endpoint,
        testCount: 0,
        results: [],
        avgResponseTime: 0,
        p50: 0,
        p95: 0,
        sloCompliant: true,
        slo
      };
    }
    
    const avgResponseTime = Math.round(recentMetrics.reduce((a, b) => a + b, 0) / recentMetrics.length);
    const p50 = this.calculatePercentile(recentMetrics, 50);
    const p95 = this.calculatePercentile(recentMetrics, 95);
    const sloCompliant = !slo || (p50 <= slo.targetP50 && p95 <= slo.targetP95);
    
    return {
      endpoint,
      testCount: recentMetrics.length,
      results: recentMetrics,
      avgResponseTime,
      p50,
      p95,
      sloCompliant,
      slo
    };
  }
}