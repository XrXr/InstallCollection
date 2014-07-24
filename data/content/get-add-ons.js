/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Author: XrXr
 */
window.stop();
self.port.on("get-add-ons", function() {
    const ITEM_CLASS = "item";
    const BUTTON_CLASS = "button  add installer";
    const NEED_MANUAL = "button contrib go  installer";
    var item_blocks = document.getElementsByClassName(ITEM_CLASS);
    var installs = [];
    var manual_installs = [];
    if (item_blocks.length === 0){
        self.port.emit("no-add-ons-found", 'nothing at all');
        return;
    }
    for (var c = 0; c < item_blocks.length; c++) {
        var install_buttons = item_blocks[c].getElementsByClassName(BUTTON_CLASS);
        var contrib_buttons = item_blocks[c].getElementsByClassName(NEED_MANUAL);
        if (install_buttons.length > 0) {
            for (let d = 0; d < install_buttons.length; d++) {
                if (install_buttons[d].clientWidth !== 0 &&
                    install_buttons[d].clientHeight !== 0) {
                    //probably not the best way to check if an add-on can be installed,
                    //but works well enough
                    installs.push({name: item_blocks[c].getElementsByTagName('h3')[0]
                        .getElementsByTagName('a')[0]
                        .text.trim(),
                        link: install_buttons[d].href});
                }
            }
        }
        if (contrib_buttons.length > 0){
            for (let d = 0; d < contrib_buttons.length; d++) {
                if (contrib_buttons[d].clientWidth !== 0 &&
                    contrib_buttons[d].clientHeight !== 0) {
                    //probably not the best way to check if an add-on can be installed,
                    //but works well enough
                    manual_installs.push({name: item_blocks[c].getElementsByTagName('h3')[0]
                        .getElementsByTagName('a')[0]
                        .text.trim(),
                        link: contrib_buttons[d].href});
                }
            }
        }
    }
    if (installs.length === 0) {
        self.port.emit("no-add-ons-found", 'nothing available');
        return;
    }
    self.port.emit('found-add-ons', {installs: installs, manual_installs: manual_installs});
});

self.port.on("get-total", function() {
    const TOTAL_PARENT = "separated-listing";
    // this makes strong assumption about the collection page. If amo update its layout,
    // not handling the error will help with the error being reported
    self.port.emit("total", Number(document.
        getElementsByClassName(TOTAL_PARENT)[0].
        children[0].textContent.match(/[0-9]+/)[0]));
});