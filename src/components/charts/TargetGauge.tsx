'use client';

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';
import type { QuarterlyProgress } from '@/types';

interface TargetGaugeProps {
  progress: QuarterlyProgress | null;
  isLoading?: boolean;
}

export function TargetGauge({ progress, isLoading = false }: TargetGaugeProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <Target className="h-12 w-12 mb-2 opacity-50" />
            <p>No quarterly goal set</p>
            <p className="text-sm mt-1">Set a target in Admin &rarr; Goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPct = Math.min(progress.progressPct, 100);
  const remainingToTarget = progress.targetRevenue - progress.actualRevenue;
  const requiredDailyRate = progress.daysRemaining > 0
    ? remainingToTarget / progress.daysRemaining
    : 0;

  // Determine status color
  const getStatusColor = () => {
    if (progress.progressPct >= 100) return '#22c55e'; // Completed
    if (progress.onTrack) return '#3b82f6'; // On track
    return '#f59e0b'; // Behind
  };

  const chartData = [
    {
      name: 'Progress',
      value: progressPct,
      fill: getStatusColor(),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Q{progress.quarter} {progress.year} Target</CardTitle>
        <Badge variant={progress.onTrack ? 'default' : 'secondary'} className={cn(
          progress.progressPct >= 100
            ? 'bg-green-100 text-green-700'
            : progress.onTrack
              ? 'bg-blue-100 text-blue-700'
              : 'bg-yellow-100 text-yellow-700'
        )}>
          {progress.progressPct >= 100 ? (
            <>Complete</>
          ) : progress.onTrack ? (
            <><TrendingUp className="h-3 w-3 mr-1" />On Track</>
          ) : (
            <><TrendingDown className="h-3 w-3 mr-1" />Behind</>
          )}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              barSize={20}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center -mt-8">
            <span className="text-3xl font-bold">
              {formatPercentage(progress.progressPct, 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              of target
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Actual</span>
            <span className="font-medium">{formatCurrency(progress.actualRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium">{formatCurrency(progress.targetRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-orange-600">
              {formatCurrency(Math.max(0, remainingToTarget))}
            </span>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Days Remaining
              </span>
              <span className="font-medium">{progress.daysRemaining}</span>
            </div>
            {remainingToTarget > 0 && progress.daysRemaining > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Required Daily Rate</span>
                <span className={cn(
                  'font-medium',
                  requiredDailyRate > progress.dailyTarget * 1.5
                    ? 'text-red-600'
                    : requiredDailyRate > progress.dailyTarget
                      ? 'text-yellow-600'
                      : 'text-green-600'
                )}>
                  {formatCurrency(requiredDailyRate)}/day
                </span>
              </div>
            )}
          </div>

          {/* Weekly/Daily targets */}
          <div className="border-t pt-3 mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Weekly Target</span>
              <span>{formatCurrency(progress.weeklyTarget)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Daily Target</span>
              <span>{formatCurrency(progress.dailyTarget)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
