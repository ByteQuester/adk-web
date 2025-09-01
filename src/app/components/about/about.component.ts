import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class AboutComponent implements OnInit {
  version: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.version = this.route.snapshot.queryParamMap.get('version');
  }
}