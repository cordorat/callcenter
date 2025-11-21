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
import FactCheckIcon from "@mui/icons-material/FactCheck";
export const menuItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon, // Opcional, nombre del ícono de MUI
    roles: ['AGENTE', 'JEFE_CENTRO', 'JEFE_CAMPANA', 'COORDINADOR', 'BACKOFFICE'] // Roles permitidos
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
    roles: ['COORDINADOR']
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
    roles: ['ADMIN', 'JEFE_CAMPANA', 'JEFE_CENTRO']
  },
  {
    label: 'Llamadas',
    path: '/llamadas',
    icon: PhoneIcon,
    roles: ['AGENTE', 'COORDINADOR', 'JEFE_CENTRO']
  },
  {
    label: 'KPIs',
    path: '/kpis',
    icon: EqualizerIcon,
    roles: ['AGENTE', 'JEFE_CAMPANA', 'COORDINADOR']
  },
  {
    label: 'Historial',
    path: '/historial',
    icon: HistoryIcon,
    roles: ['AGENTE', 'JEFE_CAMPANA', 'JEFE_CENTRO']
  },
  {
    label: 'Historial',
    path: '/historial/coordinador',
    icon: HistoryIcon,
    roles: ['COORDINADOR']
  },
  {
    label: 'Auditoría de\nllamadas',
    path: '/auditoria-llamadas',
    icon: FactCheckIcon,
    roles: ['BACKOFFICE']
  },
  {
    label: 'Comisiones',
    path: '/commissions',
    icon: AttachMoneyIcon,
    roles: ['AGENTE']
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: SettingsIcon,
    roles: ['ADMIN', 'AGENTE', 'JEFE_CENTRO', 'JEFE_CAMPANA', 'COORDINADOR', 'BACKOFFICE']
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
