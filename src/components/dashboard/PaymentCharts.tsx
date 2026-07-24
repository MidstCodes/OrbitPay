'use client';

/**
 * PaymentCharts component for OrbitPay.
 * Displays interactive charts for payment analytics including:
 * - Daily payment volume trend (area chart)
 * - Payment status distribution (pie chart)
 * - Asset breakdown (bar chart)
 * - Transaction count timeline
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Payment } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

interface PaymentChartsProps {
  payments: Payment[];
  loading?: boolean;
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  cancelled: '#EF4444',
  xlm: '#3B82F6',
  usdc: '#8B5CF6',
  eurt: '#06B6D4',
  volume: '#6366F1',
  count: '#14B8A6',
};

const CHART_HEIGHT = 300;

// ============================================================================
// Volume Chart (Area)
// ============================================================================

function VolumeChart({ data }: { data: { date: string; volume: number; count: number }[] }) {
  if (data.length === 0) {
    return <EmptyState variant="compact" title="No volume data available" />;
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Volume Trend</h4>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.volume} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.volume} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke={COLORS.volume}
            fill="url(#volumeGradient)"
            strokeWidth={2}
            name="Volume"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Status Distribution (Pie)
// ============================================================================

function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <EmptyState variant="compact" title="No payment data" />;
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Distribution</h4>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={
                  entry.name === 'Pending'
                    ? COLORS.pending
                    : entry.name === 'Confirmed'
                      ? COLORS.confirmed
                      : COLORS.cancelled
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Asset Breakdown (Bar)
// ============================================================================

function AssetBarChart({ data }: { data: { asset: string; volume: number; count: number }[] }) {
  if (data.length === 0) {
    return <EmptyState variant="compact" title="No asset data" />;
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Volume by Asset</h4>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="asset" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((entry) => (
              <Cell
                key={entry.asset}
                fill={
                  entry.asset === 'XLM'
                    ? COLORS.xlm
                    : entry.asset === 'USDC'
                      ? COLORS.usdc
                      : COLORS.eurt
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Transaction Count Timeline (Bar)
// ============================================================================

function CountTimeline({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <EmptyState variant="compact" title="No transaction data" />;
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Transaction Count</h4>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          />
          <Bar dataKey="count" fill={COLORS.count} radius={[4, 4, 0, 0]} maxBarSize={60} name="Transactions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Main Composite Component
// ============================================================================

export function PaymentCharts({ payments, loading = false }: PaymentChartsProps) {
  // Compute chart data from payments
  const { volumeData, statusData, assetData, countData } = useMemo(() => {
    // Group payments by date to compute daily volume
    const dateGroups = new Map<string, { volume: number; count: number }>();
    const statusCounts: Record<string, number> = { Pending: 0, Confirmed: 0, Cancelled: 0 };
    const assetVolumes: Record<string, { volume: number; count: number }> = {};
    const countByDate = new Map<string, number>();

    for (const payment of payments) {
      const date = new Date(payment.created_at * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const amount = Number(payment.amount) / 10_000_000;

      // Volume data
      const existing = dateGroups.get(date) || { volume: 0, count: 0 };
      existing.volume += amount;
      existing.count += 1;
      dateGroups.set(date, existing);

      // Status distribution
      statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;

      // Asset breakdown
      const assetEntry = assetVolumes[payment.asset] || { volume: 0, count: 0 };
      assetEntry.volume += amount;
      assetEntry.count += 1;
      assetVolumes[payment.asset] = assetEntry;

      // Count by date
      countByDate.set(date, (countByDate.get(date) || 0) + 1);
    }

    return {
      volumeData: Array.from(dateGroups.entries())
        .map(([date, { volume, count }]) => ({ date, volume: Math.round(volume * 100) / 100, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      statusData: Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
      assetData: Object.entries(assetVolumes)
        .map(([asset, { volume }]) => ({
          asset,
          volume: Math.round(volume * 100) / 100,
          count: assetVolumes[asset].count,
        })),
      countData: Array.from(countByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, [payments]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-[300px] bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <EmptyState
          title="No analytics data"
          description="Create some payments to see analytics and charts"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <VolumeChart data={volumeData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <StatusPieChart data={statusData} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <AssetBarChart data={assetData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <CountTimeline data={countData} />
        </div>
      </div>
    </div>
  );
}
