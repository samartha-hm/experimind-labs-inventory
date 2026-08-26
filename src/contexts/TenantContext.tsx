import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant } from '@/src/types';

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'experimind-labs',
    name: 'Experimind Labs (HQ)',
    code: 'EXP-HQ',
    logoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&auto=format&fit=crop&q=80',
    currency: 'INR',
    gstin: '27AAACE1234F1Z9',
    stateCode: '27', // Maharashtra
    plan: 'Enterprise',
    isFlagship: true,
    workspaces: ['HQ Main Storage', 'Kitting Assembly Line', 'R&D Lab'],
  },
];

interface TenantContextType {
  activeTenant: Tenant;
  tenants: Tenant[];
  setActiveTenantId: (id: string) => void;
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('nexa_tenants');
    return saved ? JSON.parse(saved) : DEFAULT_TENANTS;
  });

  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => {
    return localStorage.getItem('nexa_active_tenant_id') || 'experimind-labs';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nexa_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('nexa_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('nexa_active_tenant_id', activeTenantId);
  }, [activeTenantId]);

  useEffect(() => {
    localStorage.setItem('nexa_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  const setActiveTenantId = (id: string) => {
    if (tenants.some(t => t.id === id)) {
      setActiveTenantIdState(id);
    }
  };

  const addTenant = (tenantData: Omit<Tenant, 'id'>) => {
    const newId = `tenant_${Date.now()}`;
    const newTenant: Tenant = { ...tenantData, id: newId };
    setTenants(prev => [...prev, newTenant]);
    setActiveTenantIdState(newId);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <TenantContext.Provider value={{ activeTenant, tenants, setActiveTenantId, addTenant, theme, toggleTheme }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within a TenantProvider');
  return context;
};
