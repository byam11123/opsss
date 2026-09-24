// OpsFlow 360 – Authentication & Operational State Context

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, RoleType, Department, Location, AppNotification } from '../../types';
import { api } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  permissions: Set<string>;
  roleDefinition: Role | null;
  allUsers: User[];
  departments: Department[];
  locations: Location[];
  switchUser: (userId: string) => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (...roles: RoleType[]) => boolean;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  sheetsStatus: any;
  refreshSheetsStatus: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [roleDefinition, setRoleDefinition] = useState<Role | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId?: string) => {
    try {
      if (userId) {
        await api.login(userId);
      }
      const meData = await api.getCurrentUser();
      setCurrentUser(meData.user);
      setPermissions(new Set(meData.permissions || []));
      setRoleDefinition(meData.roleDefinition);

      const notifs = await api.listNotifications();
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Failed to load user session', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const notifs = await api.listNotifications();
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Failed to refresh notifications', err);
    }
  }, []);

  const refreshSheetsStatus = useCallback(async () => {
    try {
      const st = await api.getSheetsStatus();
      setSheetsStatus(st);
    } catch (err) {
      console.error('Failed to fetch Sheets status', err);
    }
  }, []);

  const switchUser = async (userId: string) => {
    setLoading(true);
    await loadUserData(userId);
    setLoading(false);
  };

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, readStatus: true, readAt: new Date().toISOString() } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, readStatus: true, readAt: now })));
  };

  const hasPermission = (code: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return permissions.has(code);
  };

  const hasRole = (...roles: RoleType[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return roles.includes(currentUser.role);
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const master = await api.getMasterData();
        setAllUsers(master.users || []);
        setDepartments(master.departments || []);
        setLocations(master.locations || []);

        const initialUserId = api.getUserId() || 'usr-1';
        await loadUserData(initialUserId);
        await refreshSheetsStatus();
      } catch (err) {
        console.error('Error during init', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadUserData, refreshSheetsStatus]);

  const unreadNotificationsCount = notifications.filter(n => !n.readStatus).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        roleDefinition,
        allUsers,
        departments,
        locations,
        switchUser,
        hasPermission,
        hasRole,
        notifications,
        unreadNotificationsCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        sheetsStatus,
        refreshSheetsStatus,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
