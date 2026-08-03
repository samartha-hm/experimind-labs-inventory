import React from 'react';
import { useAuth, AppRole } from '@/src/AuthContext';
import { Lock } from 'lucide-react';

interface RequireRoleProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showIcon?: boolean;
}

export default function RequireRole({ allowedRoles, children, fallback, showIcon = false }: RequireRoleProps) {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    if (fallback !== undefined) return <>{fallback}</>;
    
    if (showIcon) {
      return (
        <span 
          title="You do not have permission to perform this action." 
          className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 border border-slate-200"
        >
          <Lock className="w-4 h-4" />
        </span>
      );
    }
    
    return null; // completely hidden by default
  }

  return <>{children}</>;
}
