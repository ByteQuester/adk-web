import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {

  constructor(private http: HttpClient) { }

  log(message: string) {
    console.log('From LoggingService: ', message);
    this.http.get('https://jsonplaceholder.typicode.com/todos/1').subscribe(data => {
      console.log('Data from API: ', data);
    });
  }
}
