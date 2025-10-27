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
  History as HistoryIcon,
  Groups as GroupsIcon,
  AssignmentInd as AssignmentIndIcon
} from '@mui/icons-material';

export const menuItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon, // Opcional, nombre del ícono de MUI
    roles: ['ADMIN', 'AGENTE', 'JEFE_CENTRO'] 
  },
  {
    label: 'Equipos',
    path: '/equipos',
    icon: GroupsIcon,
    roles: ['JEFE_CENTRO']
  },
  {
    label: 'Agentes',
    path: '/kpis/agentes',
    icon: AssignmentIndIcon,
    roles: ['COORDINADOR', 'ADMIN']
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    icon: PeopleIcon,
    roles: ['ADMIN']
  },
  {
    label: 'Campaña',
    path: '/campana',
    icon: CampaignIcon,
    roles: ['ADMIN']
  },
  {
    label: 'Llamadas',
    path: '/llamadas',
    icon: PhoneIcon,
    roles: ['AGENTE']
  },
  {
    label: 'KPIs',
    path: '/kpis',
    icon: EqualizerIcon,
    roles: ['AGENTE']
  },
  {
    label: 'Historial',
    path: '/historial',
    icon: HistoryIcon,
    roles: ['AGENTE']
  },
  {
    label: 'Comisiones',
    path: '/comisiones',
    icon: AttachMoneyIcon,
    roles: ['AGENTE']
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: SettingsIcon,
    roles: ['ADMIN', 'AGENTE', 'JEFE_CENTRO']
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
