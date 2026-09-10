import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideWrench,
  LucideZap,
  LucideHammer,
  LucideLaptop,
  LucideSnowflake,
  LucidePaintbrush,
  LucideGrid2x2,
  LucidePlug,
  LucideAntenna,
  LucideBrickWall,
  LucideFlame,
  LucideSparkles,
  LucideBug,
  LucideCar,
} from '@lucide/angular';
import { WorkType } from '../../../core/models/enums';

@Component({
  selector: 'app-work-type-icon',
  standalone: true,
  imports: [
    CommonModule,
    LucideWrench,
    LucideZap,
    LucideHammer,
    LucideLaptop,
    LucideSnowflake,
    LucidePaintbrush,
    LucideGrid2x2,
    LucidePlug,
    LucideAntenna,
    LucideBrickWall,
    LucideFlame,
    LucideSparkles,
    LucideBug,
    LucideCar,
  ],
  template: `
    @switch (type) {
      @case (WorkType.Plumber) { <svg lucideWrench [size]="size" [class]="class"></svg> }
      @case (WorkType.Electrician) { <svg lucideZap [size]="size" [class]="class"></svg> }
      @case (WorkType.Carpenter) { <svg lucideHammer [size]="size" [class]="class"></svg> }
      @case (WorkType.IT) { <svg lucideLaptop [size]="size" [class]="class"></svg> }
      @case (WorkType.ACTechnician) { <svg lucideSnowflake [size]="size" [class]="class"></svg> }
      @case (WorkType.Painter) { <svg lucidePaintbrush [size]="size" [class]="class"></svg> }
      @case (WorkType.Alumetal) { <svg lucideGrid2x2 [size]="size" [class]="class"></svg> }
      @case (WorkType.ApplianceRepair) { <svg lucidePlug [size]="size" [class]="class"></svg> }
      @case (WorkType.Satellite) { <svg lucideAntenna [size]="size" [class]="class"></svg> }
      @case (WorkType.Tiler) { <svg lucideBrickWall [size]="size" [class]="class"></svg> }
      @case (WorkType.Welder) { <svg lucideFlame [size]="size" [class]="class"></svg> }
      @case (WorkType.Cleaner) { <svg lucideSparkles [size]="size" [class]="class"></svg> }
      @case (WorkType.PestControl) { <svg lucideBug [size]="size" [class]="class"></svg> }
      @case (WorkType.CarMechanic) { <svg lucideCar [size]="size" [class]="class"></svg> }
      @default { <svg lucideWrench [size]="size" [class]="class"></svg> }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      vertical-align: middle;
    }
  `],
})
export class WorkTypeIconComponent {
  @Input() type?: WorkType | string | null;
  @Input() size: number | string = 20;
  @Input() class: string = '';

  protected readonly WorkType = WorkType;
}
