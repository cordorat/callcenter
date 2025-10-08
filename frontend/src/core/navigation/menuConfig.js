//Path: frontend/src/core/navigation/menuConfig.js

/**
 * Configuración del menú de navegación según rol de usuario
 */

import{
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Campaign as CampaignIcon,
  Phone as PhoneIcon,
  AttachMoney as AttachMoneyIcon,
  Settings as SettingsIcon,
  Equalizer as EqualizerIcon,
  History as HistoryIcon
} from '@mui/icons-material';

export const menuItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon, // Opcional, nombre del ícono de MUI
    roles: ['ADMIN', 'AGENT'] 
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    icon: PeopleIcon,
    roles: ['ADMIN']
  },
  {
    label: 'Campañas',
    path: '/campañas',
    icon: CampaignIcon,
    roles: ['ADMIN', 'AGENT']
  },
  {
    label: 'Llamadas',
    path: '/llamadas',
    icon: PhoneIcon,
    roles: ['AGENT']
  },
  {
    label: 'KPIs',
    path: '/kpis',
    icon: EqualizerIcon,
    roles: ['AGENT']
  },
  {
    label: 'Historial',
    path: '/historial',
    icon: HistoryIcon,
    roles: ['AGENT']
  },
  {
    label: 'Comisiones',
    path: '/comisiones',
    icon: AttachMoneyIcon,
    roles: ['AGENT']
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: SettingsIcon,
    roles: ['ADMIN', 'AGENT']
  }
];

/**
 * Filtra los items del menú según el rol del usuario
 * @param {string} userRole - Rol del usuario ('ADMIN' o 'AGENT')
 * @returns {Array} Items de menú permitidos para ese rol
 */
export function getMenuForRole(userRole) {
  if (!userRole) return [];
  
  return menuItems.filter(item => item.roles.includes(userRole));
}
