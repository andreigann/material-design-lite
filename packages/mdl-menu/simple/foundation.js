/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {MDLFoundation} from 'mdl-base';
import {cssClasses, strings, numbers} from './constants';
import {clamp, bezierProgress} from '../util';

export default class MDLSimpleMenuFoundation extends MDLFoundation {
  static get cssClasses() {
    return cssClasses;
  }

  static get strings() {
    return strings;
  }

  static get numbers() {
    return numbers;
  }

  static get defaultAdapter() {
    return {
      addClass: (/* className: string */) => {},
      removeClass: (/* className: string */) => {},
      hasClass: (/* className: string */) => {},
      hasNecessaryDom: () => /* boolean */ false,
      getInnerDimensions: () => /* { width: number, height: number } */ {},
      setScale: (/* x: number, y: number */) => {},
      setInnerScale: (/* x: number, y: number */) => {},
      getItems: () => /* HTMLCollection */ {},
      getItemYParams: (/* el: Element */) => {},
      setTransitionDelay: (/* el: Element, value: string */) => {}
    };
  }

  constructor(adapter) {
    super(Object.assign(MDLSimpleMenuFoundation.defaultAdapter, adapter));
  }

  init() {
    const {ROOT, OPEN} = MDLSimpleMenuFoundation.cssClasses;

    if (!this.adapter_.hasClass(ROOT)) {
      throw new Error(`${ROOT} class required in root element.`);
    }

    if (!this.adapter_.hasNecessaryDom()) {
      throw new Error(`Required DOM nodes missing in ${ROOT} component.`);
    }

    if (this.adapter_.hasClass(OPEN)) {
      this.isOpen_ = true;
    } else {
      this.isOpen_ = false;
    }

    this.startScaleX_ = 0;
    this.startScaleY_ = 0;
    this.targetScale_ = 1;
    this.scaleX_ = 0;
    this.scaleY_ = 0;
    this.running_ = false;
  }

  // Calculate transition delays for individual menu items, so that they fade in one at a time.
  applyTransitionDelays_() {
    const items = this.adapter_.getItems();
    const dimensions = this.dimensions_;
    const transitionDuration = MDLSimpleMenuFoundation.numbers.TRANSITION_DURATION_MS / 1000;
    const start = MDLSimpleMenuFoundation.numbers.TRANSITION_SCALE_ADJUSTMENT_Y;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemYParams = this.adapter_.getItemYParams(item);
        this.itemHeight_ = itemYParams.height;
        let itemDelayFraction = null;
        if (this.adapter_.hasClass(MDLSimpleMenuFoundation.cssClasses.BOTTOM_LEFT) ||
            this.adapter_.hasClass(MDLSimpleMenuFoundation.cssClasses.BOTTOM_RIGHT)) {
          itemDelayFraction = ((dimensions.height - itemYParams.top - itemYParams.height) / dimensions.height);
        } else {
          itemDelayFraction = ((itemYParams.top / dimensions.height));
        }
        const itemDelay = (start + itemDelayFraction * (1 - start)) * transitionDuration;
        this.adapter_.setTransitionDelay(item, `${itemDelay}s`);
      }
    }
  }

  // Remove transition delays from menu items.
  removeTransitionDelays_() {
    const items = this.adapter_.getItems();
    if (items) {
      for (let i = 0; i < items.length; i++) {
        this.adapter_.setTransitionDelay(items[i], null);
      }
    }
  }

  // Animate menu opening or closing.
  animationLoop_() {
    const time = window.performance.now();
    const {TRANSITION_DURATION_MS, TRANSITION_X1, TRANSITION_Y1, TRANSITION_X2, TRANSITION_Y2,
        TRANSITION_SCALE_ADJUSTMENT_X, TRANSITION_SCALE_ADJUSTMENT_Y} = MDLSimpleMenuFoundation.numbers;
    const currentTime = clamp((time - this.startTime_) / TRANSITION_DURATION_MS);

    let currentTimeX;
    let currentTimeY;

    let startScaleY = this.startScaleY_;
    if (this.targetScale_ === 1) {
      // Start with the menu at the height of a single item.
      startScaleY = this.itemHeight_ ? Math.max(this.itemHeight_ / this.dimensions_.height, startScaleY) : startScaleY;
      // X axis moves faster, so time-shift forward.
      currentTimeX = clamp(currentTime + TRANSITION_SCALE_ADJUSTMENT_X);
      // Y axis moves slower, so time-shift backwards and adjust speed by the difference.
      currentTimeY = clamp((currentTime - TRANSITION_SCALE_ADJUSTMENT_Y) / (1 - TRANSITION_SCALE_ADJUSTMENT_Y));
    } else {
      // Animate X axis very slowly, so that only the Y axis animation is visible during fade-out.
      currentTimeX = clamp((currentTime - TRANSITION_SCALE_ADJUSTMENT_X) / (1 - TRANSITION_SCALE_ADJUSTMENT_X));
      // No time-shifting on the Y axis when closing.
      currentTimeY = currentTime;
    }

    // Apply cubic bezier easing independently to each axis.
    const easeX = bezierProgress(currentTimeX, TRANSITION_X1, TRANSITION_Y1, TRANSITION_X2, TRANSITION_Y2);
    const easeY = bezierProgress(currentTimeY, TRANSITION_X1, TRANSITION_Y1, TRANSITION_X2, TRANSITION_Y2);

    // Calculate the scales to apply to the outer container and inner container.
    this.scaleX_ = this.startScaleX_ + (this.targetScale_ - this.startScaleX_) * easeX;
    const invScaleX = 1 / (this.scaleX_ === 0 ? 1 : this.scaleX_);
    this.scaleY_ = startScaleY + (this.targetScale_ - startScaleY) * easeY;
    const invScaleY = 1 / (this.scaleY_ === 0 ? 1 : this.scaleY_);

    // Apply scales.
    this.adapter_.setScale(this.scaleX_, this.scaleY_);
    this.adapter_.setInnerScale(invScaleX, invScaleY);

    // Stop animation when we've covered the entire 0 - 1 range of time.
    if (currentTime < 1) {
      requestAnimationFrame(() => this.animationLoop_());
    } else {
      this.running_ = false;
      this.adapter_.removeClass(MDLSimpleMenuFoundation.cssClasses.ANIMATING);
    }
  }

  // Starts the open or close animation.
  animateMenu_() {
    this.startTime_ = window.performance.now();
    this.startScaleX_ = this.scaleX_;
    this.startScaleY_ = this.scaleY_;

    this.targetScale_ = this.isOpen_ ? 1 : 0;

    if (!this.running_) {
      this.running_ = true;
      requestAnimationFrame(() => this.animationLoop_());
    }
  }

  // Open the menu.
  open() {
    this.adapter_.addClass(MDLSimpleMenuFoundation.cssClasses.ANIMATING);
    requestAnimationFrame(() => {
      this.dimensions_ = this.adapter_.getInnerDimensions();
      this.applyTransitionDelays_();
      this.animateMenu_();
      this.adapter_.addClass(MDLSimpleMenuFoundation.cssClasses.OPEN);
    });
    this.isOpen_ = true;
  }

  // Close the menu.
  close() {
    this.adapter_.addClass(MDLSimpleMenuFoundation.cssClasses.ANIMATING);
    requestAnimationFrame(() => {
      this.removeTransitionDelays_();
      this.animateMenu_();
      this.adapter_.removeClass(MDLSimpleMenuFoundation.cssClasses.OPEN);
    });
    this.isOpen_ = false;
  }

  isOpen() {
    return this.isOpen_;
  }
}
