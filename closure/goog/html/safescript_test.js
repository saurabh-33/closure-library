/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/** @fileoverview Unit tests for SafeScript and its builders. */

goog.module('goog.html.safeScriptTest');
goog.setTestOnly();

const Const = goog.require('goog.string.Const');
const PropertyReplacer = goog.require('goog.testing.PropertyReplacer');
const SafeScript = goog.require('goog.html.SafeScript');
const googObject = goog.require('goog.object');
const testSuite = goog.require('goog.testing.testSuite');
const trustedtypes = goog.require('goog.html.trustedtypes');

const stubs = new PropertyReplacer();
const policy = goog.createTrustedTypesPolicy('closure_test');

testSuite({
  tearDown() {
    stubs.reset();
  },

  testSafeScript() {
    const script = 'var string = \'hello\';';
    const safeScript = SafeScript.fromConstant(Const.from(script));
    const extracted = SafeScript.unwrap(safeScript);
    assertEquals(script, extracted);
    assertEquals(script, safeScript.getTypedStringValue());
    assertEquals(`SafeScript{${script}}`, String(safeScript));

    // Interface marker is present.
    assertTrue(safeScript.implementsGoogStringTypedString);
  },

  /** @suppress {checkTypes} */
  testUnwrap() {
    const privateFieldName = 'privateDoNotAccessOrElseSafeScriptWrappedValue_';
    const propNames =
        googObject.getKeys(SafeScript.fromConstant(Const.from('')));
    assertContains(privateFieldName, propNames);
    const evil = {};
    evil[privateFieldName] = 'var string = \'evil\';';

    const exception = assertThrows(() => {
      SafeScript.unwrap(evil);
    });
    assertContains('expected object of type SafeScript', exception.message);
  },

  testUnwrapTrustedScript_policyIsNull() {
    stubs.set(trustedtypes, 'getPolicyPrivateDoNotAccessOrElse', function() {
      return null;
    });
    const safeValue = SafeScript.fromConstant(Const.from('script'));
    const trustedValue = SafeScript.unwrapTrustedScript(safeValue);
    assertEquals('string', typeof trustedValue);
    assertEquals(safeValue.getTypedStringValue(), trustedValue);
  },

  testUnwrapTrustedScript_policyIsSet() {
    stubs.set(trustedtypes, 'getPolicyPrivateDoNotAccessOrElse', function() {
      return policy;
    });
    const safeValue = SafeScript.fromConstant(Const.from('script'));
    const trustedValue = SafeScript.unwrapTrustedScript(safeValue);
    assertEquals(safeValue.getTypedStringValue(), trustedValue.toString());
    assertTrue(
        globalThis.TrustedScript ? trustedValue instanceof TrustedScript :
                                   typeof trustedValue === 'string');
  },

  testFromConstant_allowsEmptyString() {
    assertEquals(SafeScript.EMPTY, SafeScript.fromConstant(Const.from('')));
  },

  testEmpty() {
    assertEquals('', SafeScript.unwrap(SafeScript.EMPTY));
  },

  testFromConstantAndArgs() {
    const script = SafeScript.fromConstantAndArgs(
        Const.from(
            'function(str, num, nul, json) { foo(str, num, nul, json); }'),
        'hello world', 42, null, {'foo': 'bar'});
    assertEquals(
        '(function(str, num, nul, json) { foo(str, num, nul, json); })' +
            '("hello world", 42, null, {"foo":"bar"});',
        SafeScript.unwrap(script));
  },

  testFromConstantAndArgs_escaping() {
    const script = SafeScript.fromConstantAndArgs(
        Const.from('function(str) { alert(str); }'), '</script</script');
    assertEquals(
        '(function(str) { alert(str); })' +
            '("\\x3c/script\\x3c/script");',
        SafeScript.unwrap(script));
  },

  testFromConstantAndArgs_eval() {
    const script = SafeScript.fromConstantAndArgs(
        Const.from('function(arg1, arg2) { return arg1 * arg2; }'), 21, 2);
    const result = eval(SafeScript.unwrap(script));
    assertEquals(42, result);
  },

  testFromJson() {
    const json = SafeScript.fromJson({'a': 1, 'b': this.testFromJson});
    assertEquals('{"a":1}', SafeScript.unwrap(json));
  },
});
