import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private router: Router) {}

  handleSubmit(event: Event) {
    event.preventDefault();
    console.log('Login:', { username: this.username, password: this.password });
    this.router.navigate(['/modules']);
  }

  onFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = 'var(--primary-blue)';
    input.style.boxShadow = '0 0 0 3px rgba(0, 86, 179, 0.1)';
  }

  onBlur(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = 'var(--border-gray)';
    input.style.boxShadow = 'none';
  }
}
