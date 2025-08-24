import { Routes } from '@angular/router';
import { HomeComponent } from './home/home'; // Import the HomeComponent
import { AiAssistantComponent } from './ai-assistant/ai-assistant'; // Import the AiAssistantComponent

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Set HomeComponent as the default route
  { path: 'ai-assistant', component: AiAssistantComponent }, // Route for AI Assistant page
  // Add other routes here as needed
];