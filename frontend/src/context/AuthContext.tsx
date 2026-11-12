import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { BasinLocation, UserProfile, UserRole } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  locations: BasinLocation[];
  selectedLocationId: number;
  selectedLocation: BasinLocation | null;
  setSelectedLocationId: (id: number) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  quickSwitchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const DEFAULT_LOCATIONS: BasinLocation[] = [
  {
    id: 1,
    name: 'Cauvery Basin — Karur & Mayanur Reach',
    district: 'Karur',
    state: 'Tamil Nadu',
    river_basin: 'Cauvery River',
    latitude: 10.9601,
    longitude: 78.0766,
    elevation_m: 38.0,
    slope_deg: 1.8,
    drainage_index: 42.0,
    population: 245000,
    area_sq_km: 112.5,
    historical_flood_count: 5,
    danger_river_level_m: 9.0,
    warning_river_level_m: 7.5,
  },
  {
    id: 2,
    name: 'Adyar & Cooum Estuarine Basin — Chennai South',
    district: 'Chennai',
    state: 'Tamil Nadu',
    river_basin: 'Adyar River',
    latitude: 13.0102,
    longitude: 80.2206,
    elevation_m: 8.5,
    slope_deg: 0.7,
    drainage_index: 31.0,
    population: 680000,
    area_sq_km: 145.0,
    historical_flood_count: 8,
    danger_river_level_m: 6.5,
    warning_river_level_m: 5.2,
  },
  {
    id: 3,
    name: 'Brahmaputra Floodplain — Guwahati Lower Reach',
    district: 'Kamrup Metro',
    state: 'Assam',
    river_basin: 'Brahmaputra River',
    latitude: 26.1844,
    longitude: 91.7458,
    elevation_m: 51.0,
    slope_deg: 1.4,
    drainage_index: 38.0,
    population: 520000,
    area_sq_km: 198.0,
    historical_flood_count: 9,
    danger_river_level_m: 11.5,
    warning_river_level_m: 9.8,
  },
  {
    id: 4,
    name: 'Periyar River Lower Basin — Aluva Corridor',
    district: 'Ernakulam',
    state: 'Kerala',
    river_basin: 'Periyar River',
    latitude: 10.1076,
    longitude: 76.3516,
    elevation_m: 22.0,
    slope_deg: 2.9,
    drainage_index: 56.0,
    population: 310000,
    area_sq_km: 94.0,
    historical_flood_count: 6,
    danger_river_level_m: 8.2,
    warning_river_level_m: 6.8,
  },
  {
    id: 5,
    name: 'Mahanadi Delta — Cuttack Bifurcation Zone',
    district: 'Cuttack',
    state: 'Odisha',
    river_basin: 'Mahanadi River',
    latitude: 20.4625,
    longitude: 85.8830,
    elevation_m: 19.5,
    slope_deg: 1.1,
    drainage_index: 44.0,
    population: 415000,
    area_sq_km: 162.0,
    historical_flood_count: 7,
    danger_river_level_m: 10.2,
    warning_river_level_m: 8.6,
  },
];

const DEMO_USERS_BY_ROLE: Record<UserRole, { email: string; user: UserProfile }> = {
  Admin: {
    email: 'admin@floodshield.ai',
    user: {
      id: 1,
      full_name: 'Dr. Aravind Krishnan',
      email: 'admin@floodshield.ai',
      role_id: 1,
      role_name: 'Admin',
      organization: 'Digital Pioneer — NDMA Command Center',
      phone: '+91-9443011223',
      assigned_location_id: 1,
      is_active: true,
    },
  },
  'Disaster Management Officer': {
    email: 'dmo@floodshield.ai',
    user: {
      id: 2,
      full_name: 'Meenakshi Sundaram, IAS',
      email: 'dmo@floodshield.ai',
      role_id: 2,
      role_name: 'Disaster Management Officer',
      organization: 'State Disaster Management Authority (SDMA)',
      phone: '+91-9443022334',
      assigned_location_id: 1,
      is_active: true,
    },
  },
  'Health Officer': {
    email: 'health@floodshield.ai',
    user: {
      id: 3,
      full_name: 'Dr. Priya Darshini, MD (Public Health)',
      email: 'health@floodshield.ai',
      role_id: 3,
      role_name: 'Health Officer',
      organization: 'Directorate of Public Health & Preventive Medicine',
      phone: '+91-9443033445',
      assigned_location_id: 1,
      is_active: true,
    },
  },
  Analyst: {
    email: 'analyst@floodshield.ai',
    user: {
      id: 4,
      full_name: 'Rohan Deshmukh, M.Tech (GIS & AI)',
      email: 'analyst@floodshield.ai',
      role_id: 4,
      role_name: 'Analyst',
      organization: 'NRSC / Hydro-Informatics Division',
      phone: '+91-9443044556',
      assigned_location_id: 2,
      is_active: true,
    },
  },
  Viewer: {
    email: 'viewer@floodshield.ai',
    user: {
      id: 5,
      full_name: 'Karthik Subramanian',
      email: 'viewer@floodshield.ai',
      role_id: 5,
      role_name: 'Viewer',
      organization: 'District Citizen Emergency Watch',
      phone: '+91-9443055667',
      assigned_location_id: 1,
      is_active: true,
    },
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('floodshield_user');
    return saved ? JSON.parse(saved) : DEMO_USERS_BY_ROLE.Admin.user;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('floodshield_token'));
  const [locations, setLocations] = useState<BasinLocation[]>(DEFAULT_LOCATIONS);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);

  useEffect(() => {
    apiClient
      .get('/locations')
      .then((res) => {
        if (res.data?.locations?.length) {
          setLocations(res.data.locations);
        }
      })
      .catch(() => {
        // Keep default locations if backend is starting
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('floodshield_token', access_token);
    localStorage.setItem('floodshield_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
  };

  const register = async (payload: any) => {
    const res = await apiClient.post('/auth/register', payload);
    const { access_token, user: newUser } = res.data;
    localStorage.setItem('floodshield_token', access_token);
    localStorage.setItem('floodshield_user', JSON.stringify(newUser));
    setToken(access_token);
    setUser(newUser);
  };

  const quickSwitchRole = async (role: UserRole) => {
    const entry = DEMO_USERS_BY_ROLE[role];
    try {
      await login(entry.email, 'Password123!');
    } catch {
      localStorage.setItem('floodshield_user', JSON.stringify(entry.user));
      setUser(entry.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('floodshield_token');
    localStorage.removeItem('floodshield_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    if (user.role_name === 'Admin') return true;
    return roles.includes(user.role_name);
  };

  const selectedLocation =
    locations.find((l) => l.id === selectedLocationId) || locations[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        locations,
        selectedLocationId,
        selectedLocation,
        setSelectedLocationId,
        login,
        register,
        quickSwitchRole,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
