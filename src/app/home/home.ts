import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Added import
import { RouterModule } from '@angular/router'; // Added import

@Component({
  selector: 'app-home',
  standalone: true, // Ensure it's marked as standalone
  imports: [CommonModule, RouterModule], // Add CommonModule and RouterModule
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {

}