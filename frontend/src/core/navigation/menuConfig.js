//Path: frontend/src/core/navigation/menuConfig.js

/**
 * Configuración del menú de navegación según rol de usuario
 */

import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import PhoneIcon from '@mui/icons-material/Phone';
import AssessmentIcon from '@mui/icons-material/Assessment';
export const menuItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon, // Opcional, nombre del ícono de MUI
    roles: ['ADMIN', 'AGENT'] // Roles que pueden ver este item
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    icon: PeopleIcon,
    roles: ['ADMIN'] // Solo admins
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
    roles: ['ADMIN', 'AGENT']
  },
  {
    label: 'Reportes',
    path: '/reportes',
    icon: AssessmentIcon,
    roles: ['ADMIN']
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
