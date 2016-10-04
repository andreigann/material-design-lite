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

import test from 'tape';
import * as utils from '../../../packages/mdl-menu/util';

test('getTransformPropertyName returns "transform" for browsers that support it', t => {
  const mockWindow = {
    document: {
      createElement: function() {
        return {style: {transform: null}};
      }
    }
  };
  t.equal(utils.getTransformPropertyName(mockWindow), 'transform');
  t.end();
});

test('getTransformPropertyName returns "-webkit-transform" for browsers that do not support "transform"', t => {
  const mockWindow = {
    document: {
      createElement: function() {
        return {style: {'-webkit-transform': null}};
      }
    }
  };
  t.equal(utils.getTransformPropertyName(mockWindow), '-webkit-transform');
  t.end();
});

test('getTransformPropertyName works without a provided globalObj', t => {
  t.doesNotThrow(() => utils.getTransformPropertyName());
  t.doesNotThrow(() => utils.getTransformPropertyName());
  t.end();
});

test('clamp clamps values lower than 0 to 0', t => {
  t.equal(utils.clamp(-0.8), 0);
  t.equal(utils.clamp(-0.42), 0);
  t.equal(utils.clamp(-0.111111), 0);
  t.end();
});

test('clamp clamps values higer than 1 to 1', t => {
  t.equal(utils.clamp(1.8), 1);
  t.equal(utils.clamp(1.42), 1);
  t.equal(utils.clamp(1.111111), 1);
  t.end();
});

test('clamp does not modify values between 0 and 1', t => {
  t.equal(utils.clamp(0.8), 0.8);
  t.equal(utils.clamp(0.42), 0.42);
  t.equal(utils.clamp(0.111111), 0.111111);
  t.end();
});

test('clamp correctly clamps with a provided minimum value', t => {
  t.equal(utils.clamp(-0.8, 0.2), 0.2);
  t.equal(utils.clamp(-0.42, -0.5), -0.42);
  t.equal(utils.clamp(0.111111, 1), 1);
  t.end();
});

test('clamp correctly clamps with provided minimum and maximum values', t => {
  t.equal(utils.clamp(-0.8, 0.2, 0.3), 0.2);
  t.equal(utils.clamp(0.42, 0.3, 0.5), 0.42);
  t.equal(utils.clamp(5.111111, 1, 5), 5);
  t.end();
});

function testBezier(t, curve, expected) {
  for (const [time, value] of expected) {
    // Compare values rounded to 3 decimal places.
    const actual = Math.round(utils.bezierProgress(time, curve.x1, curve.y1, curve.x2, curve.y2) * 1000) / 1000;
    t.equal(actual, value, `At time ${time}: expected ${value}, got ${actual}`);
  }
}

test('bezierProgress returns the right values for a linear curve', t => {
  const curve = {x1: 0, y1: 0, x2: 1, y2: 1};
  const expected = new Map([[0, 0], [0.2, 0.2], [0.5, 0.5], [0.8, 0.8], [1, 1]]);
  testBezier(t, curve, expected);
  t.end();
});

test('bezierProgress returns the right values for an ease curve', t => {
  const curve = {x1: 0.25, y1: 0.1, x2: 0.25, y2: 1};
  const expected = new Map([[0, 0], [0.2, 0.295], [0.5, 0.802], [0.8, 0.976], [1, 1]]);
  testBezier(t, curve, expected);
  t.end();
});

test('bezierProgress returns the right values for a (1, 0, 0, 1) curve', t => {
  const curve = {x1: 1, y1: 0, x2: 0, y2: 1};
  const expected = new Map([[0, 0], [0.2, 0.017], [0.5, 0.5], [0.8, 0.983], [1, 1]]);
  testBezier(t, curve, expected);
  t.end();
});
