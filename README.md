# Timezone.js

Bare minimum version of [Moment Timezone](http://momentjs.com/timezone) without dependencies.

Example of how to use it:

```js
mzone.loadData({
    "zones": [
        "Europe/Paris|CET CEST|-10 -20|01010101010101010101010|1GNB0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0|11e6",
        "Australia/Sydney|AEDT AEST|-b0 -a0|01010101010101010101010|1GQg0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0|40e5",
    ],
    "links": [
        "Europe/Paris|Europe/Madrid",
    ]
});

let d = new Date();
console.log(mzone.tz(d, "Europe/Madrid").toLocaleString());
console.log(mzone.tz(d, "Australia/Sydney").toLocaleString());
```

