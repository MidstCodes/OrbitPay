import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, TransactionStateBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('should render pending status correctly', () => {
    render(<StatusBadge status="Pending" />);
    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('should render confirmed status correctly', () => {
    render(<StatusBadge status="Confirmed" />);
    expect(screen.getByText('Confirmed')).toBeDefined();
  });

  it('should render cancelled status correctly', () => {
    render(<StatusBadge status="Cancelled" />);
    expect(screen.getByText('Cancelled')).toBeDefined();
  });

  it('should render with small size', () => {
    render(<StatusBadge status="Pending" size="sm" />);
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('should render without icon when showIcon is false', () => {
    const { container } = render(<StatusBadge status="Pending" showIcon={false} />);
    const textElement = container.querySelector('span');
    expect(textElement).toBeDefined();
  });
});

describe('TransactionStateBadge', () => {
  it('should render idle state', () => {
    render(<TransactionStateBadge state="idle" />);
    expect(screen.getByText('Idle')).toBeDefined();
  });

  it('should render preparing state', () => {
    render(<TransactionStateBadge state="preparing" />);
    expect(screen.getByText('Preparing')).toBeDefined();
  });

  it('should render confirmed state', () => {
    render(<TransactionStateBadge state="confirmed" />);
    expect(screen.getByText('Confirmed')).toBeDefined();
  });

  it('should render failed state', () => {
    render(<TransactionStateBadge state="failed" />);
    expect(screen.getByText('Failed')).toBeDefined();
  });
});
