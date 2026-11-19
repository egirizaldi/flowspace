'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/lib/api/health';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, RefreshCw, Database, Server } from 'lucide-react';

export function BackendStatus() {
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: 1,
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Backend & Database Integration
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 gap-1 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            Connecting to FlowSpace API (http://localhost:3001/api/v1)...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Backend Connection Offline
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(error as Error).message ||
                'Unable to connect to http://localhost:3001/api/v1/health. Ensure backend is running.'}
            </p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-xs text-muted-foreground">API Status</div>
                <Badge variant={data.status === 'ok' ? 'success' : 'danger'} className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {data.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  PostgreSQL
                </div>
                <Badge variant={data.database === 'connected' ? 'success' : 'danger'}>
                  {data.database}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-xs text-muted-foreground">Uptime</div>
                <span className="text-xs font-mono font-medium">{data.uptime}s</span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between border-t border-border/50 pt-2">
              <span>Service: {data.service}</span>
              <span>Env: {data.environment}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
