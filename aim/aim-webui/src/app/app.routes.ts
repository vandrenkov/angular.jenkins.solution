import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component'; // If you have a Home component too

import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent }
];
