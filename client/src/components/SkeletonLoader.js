import React from 'react';
import './SkeletonLoader.css';

// Generic skeleton pulse block
export const Skeleton = ({ width, height, borderRadius, className = '', style = {} }) => (
  <div
    className={`skeleton-pulse ${className}`}
    style={{ width, height, borderRadius: borderRadius || '8px', ...style }}
    aria-hidden="true"
  />
);

// Card skeleton (for property cards, stat cards)
export const CardSkeleton = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div className="skeleton-card" key={i}>
        <Skeleton height="200px" borderRadius="12px 12px 0 0" />
        <div className="skeleton-card-body">
          <Skeleton width="70%" height="20px" />
          <Skeleton width="40%" height="14px" />
          <div className="skeleton-row">
            <Skeleton width="45%" height="14px" />
            <Skeleton width="30%" height="14px" />
          </div>
          <Skeleton width="100%" height="40px" borderRadius="8px" />
        </div>
      </div>
    ))}
  </>
);

// Stat card skeleton
export const StatSkeleton = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div className="skeleton-stat" key={i}>
        <Skeleton width="48px" height="48px" borderRadius="12px" />
        <Skeleton width="60px" height="32px" />
        <Skeleton width="80%" height="14px" />
      </div>
    ))}
  </>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 4, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr className="skeleton-table-row" key={r}>
        {Array.from({ length: columns }).map((_, c) => (
          <td key={c}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height="16px" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Full page loading skeleton
export const PageSkeleton = () => (
  <div className="skeleton-page">
    <div className="skeleton-page-header">
      <Skeleton width="300px" height="36px" />
      <Skeleton width="180px" height="16px" />
    </div>
    <div className="skeleton-stats-grid">
      <StatSkeleton count={4} />
    </div>
    <div className="skeleton-content-grid">
      <CardSkeleton count={3} />
    </div>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="skeleton-dashboard">
    {/* Header */}
    <div className="skeleton-dash-header">
      <div>
        <Skeleton width="280px" height="32px" />
        <Skeleton width="180px" height="16px" style={{ marginTop: '8px' }} />
      </div>
      <Skeleton width="120px" height="36px" borderRadius="999px" />
    </div>
    {/* Stats */}
    <div className="skeleton-stats-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="skeleton-stat" key={i}>
          <Skeleton width="48px" height="48px" borderRadius="12px" />
          <Skeleton width="60px" height="36px" style={{ marginTop: '12px' }} />
          <Skeleton width="90px" height="14px" style={{ marginTop: '6px' }} />
        </div>
      ))}
    </div>
    {/* Actions */}
    <div className="skeleton-actions-row">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width="200px" height="48px" borderRadius="12px" />
      ))}
    </div>
    {/* Content */}
    <div className="skeleton-content-block">
      <Skeleton width="200px" height="24px" style={{ marginBottom: '20px' }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="skeleton-list-item" key={i}>
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height="18px" />
            <Skeleton width="40%" height="14px" style={{ marginTop: '8px' }} />
          </div>
          <Skeleton width="100px" height="36px" borderRadius="8px" />
        </div>
      ))}
    </div>
  </div>
);

// Empty State Component
export const EmptyState = ({ icon, title, description, action, actionLabel, actionIcon }) => (
  <div className="empty-state-container">
    <div className="empty-state-visual">
      {icon && <span className="empty-state-icon">{icon}</span>}
      <div className="empty-state-rings">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
      </div>
    </div>
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-desc">{description}</p>
    {action && (
      <button className="empty-state-action" onClick={action}>
        {actionIcon} {actionLabel}
      </button>
    )}
  </div>
);

// Error State Component
export const ErrorState = ({ title = 'Something went wrong', description, onRetry }) => (
  <div className="error-state-container">
    <div className="error-state-icon">⚠️</div>
    <h3 className="error-state-title">{title}</h3>
    <p className="error-state-desc">{description || 'An unexpected error occurred. Please try again.'}</p>
    {onRetry && (
      <button className="error-state-retry" onClick={onRetry}>
        🔄 Try Again
      </button>
    )}
  </div>
);

// Animated Counter
export const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const target = parseInt(value) || 0;
    if (target === 0) { setDisplayValue(0); return; }
    
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  
  return <span className="animated-counter">{displayValue}</span>;
};

export default {
  Skeleton,
  CardSkeleton,
  StatSkeleton,
  TableRowSkeleton,
  PageSkeleton,
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  AnimatedCounter
};
