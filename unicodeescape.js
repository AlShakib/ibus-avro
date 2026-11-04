/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

/*
    Replaces each UTF-16 code unit at or above U+00FF with a four-digit
    \uXXXX escape, so that the output is plain ASCII. The result is valid
    inside JSON strings and RegExp patterns.
*/
function toUnicodeEscapes(input) {
    var output = '';

    for (var index = 0; index < input.length; index++) {
        var charCode = input.charCodeAt(index);
        if (charCode >= 0xff) {
            output += '\\u' + ('000' + charCode.toString(16)).slice(-4);
        } else {
            output += input.charAt(index);
        }
    }
    return output;
}
