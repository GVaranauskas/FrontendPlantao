import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'modules',
    loadComponent: () => import('./pages/modules/modules.component').then(m => m.ModulesComponent)
  },
  {
    path: 'shift-handover',
    loadComponent: () => import('./pages/shift-handover/shift-handover.component').then(m => m.ShiftHandoverComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
