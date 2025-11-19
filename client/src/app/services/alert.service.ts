import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Alert {
  id: string;
  patientId: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private apiUrl = '/api/alerts';

  constructor(private http: HttpClient) {}

  getAllAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.apiUrl);
  }

  createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Observable<Alert> {
    return this.http.post<Alert>(this.apiUrl, alert);
  }

  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
