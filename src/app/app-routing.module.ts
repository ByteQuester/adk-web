/**
 * @LICENSE
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import { AboutComponent } from './components/about/about.component';
import { ChatComponent } from './components/chat/chat.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { SignInComponent } from './components/saas/sign-in.component';
import { SignUpComponent } from './components/saas/sign-up.component';
import { AccountComponent } from './components/saas/account.component';
import { BillingComponent } from './components/saas/billing.component';
import { SandboxComponent } from './components/saas/sandbox.component';
import { SupabaseService } from './core/services/supabase.service';
import { authGuard } from './core/services/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'chat', component: ChatComponent },
  { path: 'about', component: AboutComponent },
  { path: 'pricing', loadComponent: () => Promise.resolve(PricingComponent) },
  { path: 'signin', loadComponent: () => Promise.resolve(SignInComponent) },
  { path: 'signup', loadComponent: () => Promise.resolve(SignUpComponent) },
  { path: 'account', loadComponent: () => Promise.resolve(AccountComponent), canActivate: [authGuard] },
  { path: 'billing', loadComponent: () => Promise.resolve(BillingComponent), canActivate: [authGuard] },
  { path: 'sandbox', loadComponent: () => Promise.resolve(SandboxComponent), canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}