import { create } from 'zustand';

export interface CustomerAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  type: 'School / Institution Lab' | 'Home / Residential' | 'Office';
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  organization?: string;
  gstin?: string;
  addresses: CustomerAddress[];
}

interface CustomerState {
  customer: CustomerProfile | null;
  isLoggedIn: boolean;
  login: (profile: Partial<CustomerProfile>) => void;
  register: (profile: Partial<CustomerProfile>) => void;
  logout: () => void;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
  addAddress: (address: Omit<CustomerAddress, 'id'>) => void;
  updateAddress: (id: string, updates: Partial<CustomerAddress>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

const STORAGE_KEY = 'experimind_customer_session';

const getInitialSession = (): { customer: CustomerProfile | null; isLoggedIn: boolean } => {
  if (typeof window === 'undefined') {
    return { customer: null, isLoggedIn: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return { customer: parsed, isLoggedIn: true };
      }
    }
  } catch (_) {}
  return { customer: null, isLoggedIn: false };
};

export const useCustomerStore = create<CustomerState>((set) => ({
  ...getInitialSession(),

  login: (profileData) => {
    const newProfile: CustomerProfile = {
      id: profileData.id || `CUST-${Date.now().toString().slice(-6)}`,
      name: profileData.name || 'Educator Customer',
      email: profileData.email || '',
      phone: profileData.phone || '',
      role: profileData.role || 'Science / Math Teacher',
      organization: profileData.organization || '',
      gstin: profileData.gstin || '',
      addresses: profileData.addresses && profileData.addresses.length > 0
        ? profileData.addresses
        : [
            {
              id: 'addr-default',
              name: profileData.name || 'Central STEM Laboratory',
              phone: profileData.phone || '+91 9876543210',
              line1: 'Experiential STEM Labs & Innovation Wing',
              line2: 'Electronics City Phase 1',
              city: 'Bengaluru',
              state: 'Karnataka',
              pincode: '560100',
              type: 'School / Institution Lab',
              isDefault: true,
            },
          ],
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (_) {}

    set({ customer: newProfile, isLoggedIn: true });
  },

  register: (profileData) => {
    const newProfile: CustomerProfile = {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      name: profileData.name || 'Verified Educator',
      email: profileData.email || '',
      phone: profileData.phone || '',
      role: profileData.role || 'Science / Math Teacher',
      organization: profileData.organization || '',
      gstin: profileData.gstin || '',
      addresses: profileData.addresses || [],
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (_) {}

    set({ customer: newProfile, isLoggedIn: true });
  },

  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    set({ customer: null, isLoggedIn: false });
  },

  updateProfile: (updates) => {
    set((state) => {
      if (!state.customer) return state;
      const updated = { ...state.customer, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return { customer: updated };
    });
  },

  addAddress: (addressData) => {
    set((state) => {
      if (!state.customer) return state;
      const newId = `addr-${Date.now()}`;
      const isFirst = state.customer.addresses.length === 0;
      const newAddress: CustomerAddress = {
        ...addressData,
        id: newId,
        isDefault: isFirst || addressData.isDefault || false,
      };

      const updatedAddresses = newAddress.isDefault
        ? state.customer.addresses.map((a) => ({ ...a, isDefault: false })).concat(newAddress)
        : [...state.customer.addresses, newAddress];

      const updatedCustomer = { ...state.customer, addresses: updatedAddresses };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomer));
      } catch (_) {}
      return { customer: updatedCustomer };
    });
  },

  updateAddress: (id, updates) => {
    set((state) => {
      if (!state.customer) return state;
      let updatedAddresses = state.customer.addresses.map((a) => (a.id === id ? { ...a, ...updates } : a));
      if (updates.isDefault) {
        updatedAddresses = updatedAddresses.map((a) => ({ ...a, isDefault: a.id === id }));
      }
      const updatedCustomer = { ...state.customer, addresses: updatedAddresses };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomer));
      } catch (_) {}
      return { customer: updatedCustomer };
    });
  },

  deleteAddress: (id) => {
    set((state) => {
      if (!state.customer) return state;
      const updatedAddresses = state.customer.addresses.filter((a) => a.id !== id);
      if (updatedAddresses.length > 0 && !updatedAddresses.some((a) => a.isDefault)) {
        updatedAddresses[0].isDefault = true;
      }
      const updatedCustomer = { ...state.customer, addresses: updatedAddresses };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomer));
      } catch (_) {}
      return { customer: updatedCustomer };
    });
  },

  setDefaultAddress: (id) => {
    set((state) => {
      if (!state.customer) return state;
      const updatedAddresses = state.customer.addresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }));
      const updatedCustomer = { ...state.customer, addresses: updatedAddresses };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomer));
      } catch (_) {}
      return { customer: updatedCustomer };
    });
  },
}));
