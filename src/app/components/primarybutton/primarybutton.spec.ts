import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Primarybutton } from './primarybutton';

describe('Primarybutton', () => {
  let component: Primarybutton;
  let fixture: ComponentFixture<Primarybutton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Primarybutton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Primarybutton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
