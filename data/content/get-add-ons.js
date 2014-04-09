const item_class = "item";
const button_class = "button  add installer";
var item_blocks = document.getElementsByClassName(item_class);
var xpi_links = [];
var addon_titles = [];

for (var c = 0; c < item_blocks.length; c++) {
    var install_buttons = item_blocks[c].getElementsByClassName(button_class);
    if (install_buttons.length > 0) {
        for (var d = 0; d < install_buttons.length; d++) {
            if (install_buttons[d].clientWidth !== 0 &&
                install_buttons[d].clientHeight !== 0) {
                //probably not the best way to check if an add-on can be installed,
                //but works well enough
                xpi_links.push(install_buttons[d].href);
                addon_titles.push(item_blocks[c].getElementsByTagName('h3')[0]
                    .getElementsByTagName('a')[0]
                    .text.trim());
            }
        }
    } else {
        self.port.emit("no-add-ons-found", 'nothing at all');
        // return;
    }
    console.log();
}

if (xpi_links.length === 0) {
    self.port.emit("no-add-ons-found", 'nothing available');
    // return;
}
for (var i = 0; i < xpi_links.length; i++) {
    console.log(addon_titles[i] + " " + xpi_links[i]);
}