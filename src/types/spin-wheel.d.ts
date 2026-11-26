declare module 'spin-wheel' {

  export interface WheelItem {

    label?: string;

    weight?: number;

    backgroundColor?: string;

    labelColor?: string;

    value?: unknown;

  }


  export interface WheelRestEvent {

    currentIndex: number;

    type: string;

    rotation: number;

  }


  export interface WheelOptions {

    items?: WheelItem[];

    isInteractive?: boolean;

    pointerAngle?: number;

    rotation?: number;

    itemLabelFontSizeMax?: number;

    itemLabelRadius?: number;

    itemLabelRadiusMax?: number;

    borderWidth?: number;

    borderColor?: string;

    lineWidth?: number;

    lineColor?: string;

    onRest?: (event: WheelRestEvent) => void;

  }


  export class Wheel {

    constructor(
      container: HTMLElement,
      options?: WheelOptions
    );

    rotation: number;

    items: WheelItem[];

    spinTo(
      rotation: number,
      duration?: number
    ): void;

    spinToItem(
      itemIndex: number,
      duration?: number,
      spinToCenter?: boolean,
      numberOfRevolutions?: number,
      direction?: number
    ): void;

    stop(): void;

    remove(): void;

  }

}
