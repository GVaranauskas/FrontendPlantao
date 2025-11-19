import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient.service';
import { AlertService, Alert } from '../../services/alert.service';

@Component({
  selector: 'app-shift-handover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shift-handover.component.html',
  styleUrls: ['./shift-handover.component.css']
})
export class ShiftHandoverComponent implements OnInit {
  patients: Patient[] = [];
  alerts: Alert[] = [];
  searchTerm = '';
  isLoading = true;
  alertsOpen = false;

  constructor(
    private patientService: PatientService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.patientService.getAllPatients().subscribe({
      next: (data) => {
        this.patients = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.alertService.getAllAlerts().subscribe({
      next: (data) => {
        this.alerts = data;
      }
    });
  }

  get filteredPatients(): Patient[] {
    if (!this.searchTerm) {
      return this.patients;
    }
    const search = this.searchTerm.toLowerCase();
    return this.patients.filter(p =>
      p.nome.toLowerCase().includes(search) ||
      p.leito.includes(search) ||
      (p.especialidadeRamal && p.especialidadeRamal.toLowerCase().includes(search))
    );
  }

  get stats() {
    const complete = this.patients.filter(p => (p as any).status === 'complete').length;
    const pending = this.patients.filter(p => (p as any).status === 'pending').length;
    const alert = this.patients.filter(p => p.alertStatus === 'medium').length;
    const critical = this.patients.filter(p => p.alertStatus === 'critical').length;
    const total = this.patients.length;
    return { complete, pending, alert, critical, total };
  }

  getRowClass(patient: Patient, index: number): string {
    if (patient.alertStatus === 'critical') {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (patient.alertStatus === 'medium') {
      return 'bg-orange-50 hover:bg-orange-100';
    }
    return index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50';
  }

  getPriorityLabel(priority: string): string {
    const labels: {[key: string]: string} = {
      'critical': 'CRÍTICA',
      'high': 'ALTA',
      'medium': 'MÉDIA',
      'low': 'BAIXA'
    };
    return labels[priority] || priority.toUpperCase();
  }

  goToModules() {
    this.router.navigate(['/modules']);
  }

  refresh() {
    this.loadData();
  }

  toggleAlerts() {
    this.alertsOpen = !this.alertsOpen;
  }

  onIconHover(event: Event, isHover: boolean) {
    const button = event.target as HTMLElement;
    const parentButton = button.closest('button');
    if (parentButton) {
      if (isHover) {
        parentButton.style.background = 'var(--light-blue)';
        const icon = parentButton.querySelector('span');
        if (icon) {
          icon.style.color = 'var(--primary-blue)';
        }
      } else {
        parentButton.style.background = 'transparent';
        const icon = parentButton.querySelector('span');
        if (icon) {
          icon.style.color = 'var(--neutral-gray)';
        }
      }
    }
  }

  onSearchFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = 'var(--primary-blue)';
    input.style.boxShadow = '0 0 0 3px rgba(0, 86, 179, 0.1)';
  }

  onSearchBlur(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = 'var(--border-gray)';
    input.style.boxShadow = 'none';
  }
}
