import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Module {
  id: string;
  title: string;
  description: string;
  features: string[];
  status: 'active' | 'coming';
  route: string | null;
}

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.css']
})
export class ModulesComponent {
  modules: Module[] = [
    {
      id: 'passagem-plantao',
      title: 'Passagem de Plantão',
      description: 'Sistema SBAR completo para passagem de plantão com registro detalhado de pacientes.',
      features: [
        'Registro digital SBAR completo',
        'Alertas inteligentes de pendências',
        'Histórico completo de passagens',
        'Relatórios e impressão automática'
      ],
      status: 'active',
      route: '/shift-handover'
    },
    {
      id: 'escala-trabalho',
      title: 'Escala de Trabalho',
      description: 'Gestão completa de escalas de trabalho com otimização automática de recursos.',
      features: [
        'Criação automática de escalas',
        'Gestão de folgas e férias',
        'Controle de horas extras',
        'Notificações de escalas'
      ],
      status: 'coming',
      route: null
    },
    {
      id: 'gestao-leitos',
      title: 'Gestão de Leitos',
      description: 'Controle em tempo real da ocupação e disponibilidade de leitos hospitalares.',
      features: [
        'Dashboard de ocupação em tempo real',
        'Gestão de altas e transferências',
        'Previsão de disponibilidade',
        'Relatórios de taxa de ocupação'
      ],
      status: 'coming',
      route: null
    }
  ];

  constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/login']);
  }

  accessModule(module: Module) {
    if (module.route) {
      this.router.navigate([module.route]);
    }
  }
}
