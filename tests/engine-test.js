/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.

    Headless tests for the suggestion engine. Run them with tests/run.sh.
*/

const GLib = imports.gi.GLib;
const System = imports.system;
const db = imports.avrodict;
const suggestion = imports.suggestionbuilder;
const UnicodeEscape = imports.unicodeescape;

const ZWJ = '‍';
const ZWNJ = '‌';
const selectionsPath = GLib.get_home_dir() + '/.candidate-selections.json';

let failures = 0;

function check(name, condition, detail) {
    print((condition ? 'PASS ' : 'FAIL ') + name + (condition || !detail ? '' : ': ' + detail));
    if (!condition) {
        failures++;
    }
}

function newBuilder(dictionaryEnabled) {
    const builder = new suggestion.SuggestionBuilder();
    const preferences = builder.getPref();
    preferences.dictEnable = dictionaryEnabled;
    builder.setPref(preferences);
    return builder;
}

function readSelections() {
    const [, bytes] = GLib.file_get_contents(selectionsPath);
    return JSON.parse(new TextDecoder().decode(bytes));
}

function testClassicPhonetic() {
    const builder = newBuilder(false);
    const expected = {ami: 'আমি', bangla: 'বাংলা', kemon: 'কেমন', rZ: 'র' + ZWJ + '্য'};
    for (const input in expected) {
        const output = builder.suggest(input).words[0];
        check('classic phonetic "' + input + '"', output === expected[input], escape(output));
    }
}

function testDictionarySuggestions() {
    const builder = newBuilder(true);
    const words = builder.suggest('bangla').words;
    check('dictionary suggests বাংলা for "bangla"', words.indexOf('বাংলা') >= 0, words.join(', '));
}

function testPercentSign() {
    for (const dictionaryEnabled of [false, true]) {
        const builder = newBuilder(dictionaryEnabled);
        let output = null;
        let error = null;
        try {
            output = builder.suggest('50%').words[0];
        } catch (caught) {
            error = caught;
        }
        check('"50%" with dictionary ' + (dictionaryEnabled ? 'on' : 'off'), error === null && output === '৫০%',
            error ? error.name + ': ' + error.message : escape(output));
    }
}

function testEveryPrintableCharacter() {
    const builder = newBuilder(true);
    const errors = [];
    for (let code = 33; code <= 126; code++) {
        const character = String.fromCharCode(code);
        for (const input of [character, 'a' + character, character + 'a', 'a' + character + 'b', 'k' + character + character]) {
            try {
                builder.suggest(input);
            } catch (error) {
                errors.push(JSON.stringify(input) + ' ' + error.name);
            }
        }
    }
    check('no exception for printable ASCII input', errors.length === 0, errors.slice(0, 5).join('; '));
}

function testDictionaryHasNoBrokenEscapes() {
    const broken = [];
    for (const table in db.tables) {
        for (const word of db.tables[table]) {
            if (word.indexOf('Ȁ') >= 0) {
                broken.push(word);
            }
        }
    }
    check('dictionary has no U+0200 from broken ZWNJ escapes', broken.length === 0, broken.length + ' words');
}

function testUnicodeEscapeRoundTrip() {
    for (const text of ['র' + ZWJ + '্যাব', 'আল্লাহ্' + ZWNJ, 'a😀b']) {
        const back = JSON.parse(UnicodeEscape.toUnicodeEscapes(JSON.stringify({key: text}))).key;
        check('escape round trip ' + escape(text), back === text, escape(back));
    }
}

function testSelectionsAreSaved() {
    GLib.unlink(selectionsPath);
    const builder = newBuilder(true);
    builder.updateCandidateSelection('ami', 'আমি');
    builder.stringCommitted('ami', 'আমি');
    builder.updateCandidateSelection('rZab', 'র' + ZWJ + '্যাব');
    builder.stringCommitted('rZab', 'র' + ZWJ + '্যাব');

    let selections = null;
    try {
        selections = readSelections();
    } catch (error) {
        check('selections file is written at once', false, error.message);
        return;
    }
    check('selections file keeps both words', selections.ami === 'আমি' && selections.rZab !== undefined, JSON.stringify(selections));
    check('selections file keeps ZWJ', selections.rZab === 'র' + ZWJ + '্যাব', escape(selections.rZab));

    const reloaded = newBuilder(true);
    check('reloaded builder restores the selection', reloaded._candidateSelections.rZab === 'র' + ZWJ + '্যাব');
}

function testEmptyCommitDoesNotSave() {
    GLib.unlink(selectionsPath);
    const builder = newBuilder(true);
    builder.stringCommitted('', undefined);
    check('empty commit does not write the selections file', !GLib.file_test(selectionsPath, GLib.FileTest.EXISTS));
}

function testLegacySelectionsAreRepaired() {
    GLib.file_set_contents(selectionsPath, '{"rZab":"\\u09b0\\u0200d\\u09cd\\u09af\\u09be\\u09ac","kalke":"\\u0995\\u09be\\u09b2\\u0995\\u09c7\\u0200c"}');
    const builder = newBuilder(true);
    check('legacy file: ZWJ restored', builder._candidateSelections.rZab === 'র' + ZWJ + '্যাব', escape(builder._candidateSelections.rZab));
    check('legacy file: ZWNJ restored', builder._candidateSelections.kalke === 'কালকে' + ZWNJ, escape(builder._candidateSelections.kalke));
}

testClassicPhonetic();
testDictionarySuggestions();
testPercentSign();
testEveryPrintableCharacter();
testDictionaryHasNoBrokenEscapes();
testUnicodeEscapeRoundTrip();
testSelectionsAreSaved();
testEmptyCommitDoesNotSave();
testLegacySelectionsAreRepaired();

print(failures === 0 ? 'All tests passed.' : failures + ' test(s) failed.');
System.exit(failures === 0 ? 0 : 1);
