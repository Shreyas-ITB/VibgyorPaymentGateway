import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { CustomerPortalComponent } from './pages/customer-portal/customer-portal.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admindash',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    component: CalendarComponent,
    canActivate: [authGuard]
  },
  {
    path: 'customer-portal',
    component: CustomerPortalComponent
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
