/*
 * Copyright (c) 2021, Bastian Leicht <mail@bastainleicht.de>
 *
 * PDX-License-Identifier: BSD-2-Clause
 */

const DEBUG = true;

if(localStorage.getItem('customID') === null) {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('customID', id);
    log(`Generated and saved customID: ${id}`);
}

if(localStorage.getItem('customName') !== null) {
    log(`Found a customName: ${localStorage.getItem('customName')}`);
    log('Redirecting to game!');
    window.location.replace('/game');
}

function setName() {
    const custom_name$ = document.querySelector('#customName');
    const name = custom_name$.value;
    localStorage.setItem('customName', name);
    log(`Saved customName to: ${name}`);
    window.location.replace('/game');
}

function log(message) {
    let d, hours ,minutes, seconds;
    if ('undefined' !== typeof console && DEBUG) {
        d = new Date();
        hours = d.getHours();
        if (hours < 10)
            hours = "0" + hours;
        minutes = d.getMinutes();
        if (minutes < 10)
            minutes = "0" + minutes;
        seconds = d.getSeconds();
        if (seconds < 10)
            seconds = "0" + seconds;
        console.log(hours + ':' + minutes + ':' + seconds + ' | AMONG US > ' + message);
    }
}