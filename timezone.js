/**
 * Bare minimum version of Moment Timezone without dependencies.
 *
 * Check Moment Timezone for the original source and data files:
 * http://momentjs.com/timezone
 * https://github.com/moment/moment-timezone
 *
 * Example of how to use it:
 *
 * <script src='timezone.js'></script>
 * <script>
 *      mzone.loadData({
 *          "zones": [
 *              "Europe/Paris|CET CEST|-10 -20|01010101010101010101010|1GNB0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0|11e6",
 *              "Australia/Sydney|AEDT AEST|-b0 -a0|01010101010101010101010|1GQg0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0|40e5",
 *          ],
 *          "links": [
 *              "Europe/Paris|Europe/Madrid",
 *          ]
 *      });
 *
 *      let d = new Date();
 *      console.log(mzone.tz(d, "Europe/Madrid").toLocaleString());
 *      console.log(mzone.tz(d, "Australia/Sydney").toLocaleString());
 * </script>
 */

var mzone = mzone || {};

(function (obj) {
    "use strict";

    obj.loadData = loadData;

    obj.tz = function (date, tzName) {
        if (typeof date === "string") {
            date = new Date(date);
        }
        var utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        var tz = getZone(tzName);
        if (!tz) {
            throw "Invalid timezone: " + tzName;
        }
        var offset = tz.parse(utc);
        return new Date(utc.getTime() - offset * 60000);
    }

    var zones = {};
    var links = {};
    var names = {};

    function charCodeToInt(charCode) {
        if (charCode > 96) {
            return charCode - 87;
        } else if (charCode > 64) {
            return charCode - 29;
        }
        return charCode - 48;
    }

    function unpackBase60(string) {
        var i = 0,
            parts = string.split('.'),
            whole = parts[0],
            fractional = parts[1] || '',
            multiplier = 1,
            num,
            out = 0,
            sign = 1;

        // handle negative numbers
        if (string.charCodeAt(0) === 45) {
            i = 1;
            sign = -1;
        }

        // handle digits before the decimal
        for (var i; i < whole.length; i++) {
            num = charCodeToInt(whole.charCodeAt(i));
            out = 60 * out + num;
        }

        // handle digits after the decimal
        for (var i = 0; i < fractional.length; i++) {
            multiplier = multiplier / 60;
            num = charCodeToInt(fractional.charCodeAt(i));
            out += num * multiplier;
        }

        return out * sign;
    }

    function arrayToInt(array) {
        for (var i = 0; i < array.length; i++) {
            array[i] = unpackBase60(array[i]);
        }
    }

    function intToUntil(array, length) {
        for (var i = 0; i < length; i++) {
            array[i] = Math.round((array[i - 1] || 0) + (array[i] * 60000)); // minutes to milliseconds
        }

        array[length - 1] = Infinity;
    }

    function mapIndices(source, indices) {
        var out = [], i;

        for (i = 0; i < indices.length; i++) {
            out[i] = source[indices[i]];
        }

        return out;
    }

    function unpack(string) {
        var data = string.split('|');
        var offsets = data[2].split(' ');
        var indices = data[3].split('');
        var untils = data[4].split(' ');

        arrayToInt(offsets);
        arrayToInt(indices);
        arrayToInt(untils);

        intToUntil(untils, indices.length);

        return {
            name: data[0],
            abbrs: mapIndices(data[1].split(' '), indices),
            offsets: mapIndices(offsets, indices),
            untils: untils,
            population: data[5] | 0
        };
    }

    function Zone(packedString) {
        if (packedString) {
            this._set(unpack(packedString));
        }
    }

    Zone.prototype = {
        _set: function (unpacked) {
            this.name = unpacked.name;
            this.abbrs = unpacked.abbrs;
            this.untils = unpacked.untils;
            this.offsets = unpacked.offsets;
            this.population = unpacked.population;
        },

        _index: function (timestamp) {
            var target = +timestamp,
                untils = this.untils,
                i;

            for (i = 0; i < untils.length; i++) {
                if (target < untils[i]) {
                    return i;
                }
            }
        },

        parse: function (timestamp) {
            var target = +timestamp,
                offsets = this.offsets,
                untils = this.untils,
                max = untils.length - 1,
                offset, offsetNext, offsetPrev, i;

            for (i = 0; i < max; i++) {
                offset = offsets[i];
                offsetNext = offsets[i + 1];
                offsetPrev = offsets[i ? i - 1 : i];

                if (offset < offsetNext) {
                    offset = offsetNext;
                } else if (offset > offsetPrev) {
                    offset = offsetPrev;
                }

                if (target < untils[i] - (offset * 60000)) {
                    return offsets[i];
                }
            }

            return offsets[max];
        },

        abbr: function (mom) {
            return this.abbrs[this._index(mom)];
        },

        offset: function (mom) {
            return this.offsets[this._index(mom)];
        }
    };

    function normalizeName(name) {
        return (name || '').toLowerCase().replace(/\//g, '_');
    }

    function addZone(packed) {
        var i, name, split, normalized;

        if(packed === undefined) {
            packed = [];
        } else if (typeof packed === "string") {
            packed = [packed];
        }

        for (i = 0; i < packed.length; i++) {
            split = packed[i].split('|');
            name = split[0];
            normalized = normalizeName(name);
            zones[normalized] = packed[i];
            names[normalized] = name;
        }
    }

    function getZone(name, caller) {
        name = normalizeName(name);

        var zone = zones[name];
        var link;

        if (zone instanceof Zone) {
            return zone;
        }

        if (typeof zone === 'string') {
            zone = new Zone(zone);
            zones[name] = zone;
            return zone;
        }

        // Pass getZone to prevent recursion more than 1 level deep
        if (links[name] && caller !== getZone && (link = getZone(links[name], getZone))) {
            zone = zones[name] = new Zone();
            zone._set(link);
            zone.name = names[name];
            return zone;
        }

        return null;
    }

    function addLink(aliases) {
        var i, alias, normal0, normal1;

        if(aliases === undefined) {
            aliases = [];
        } else if (typeof aliases === "string") {
            aliases = [aliases];
        }

        for (i = 0; i < aliases.length; i++) {
            alias = aliases[i].split('|');

            normal0 = normalizeName(alias[0]);
            normal1 = normalizeName(alias[1]);

            links[normal0] = normal1;
            names[normal0] = alias[0];

            links[normal1] = normal0;
            names[normal1] = alias[1];
        }
    }

    function loadData(data) {
        addZone(data.zones);
        addLink(data.links);
    }
})(mzone);
module.exports = mzone;
