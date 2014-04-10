addon.port.emit("ping");

//name space
var install_collection = {};

//modules
install_collection.Add_on = function(data){
    this.name = m.prop(data.name);
    this.url = m.prop(data.url);
    this.progress = m.prop(data.progress);
};

install_collection.Add_on_list = Array;

//view
install_collection.view = function(ctrl){
    return  ctrl.list.map(function (add_on, index){
        return m('div', {style: {margin:'0 5% 0 5%'}},[
                    m('div', {class: 'progress'},[
                        m('div', {class: 'progress-bar',
                            role: 'progressbar',
                            style: {width: '40%'}}, [
                                m('span', {style: {color: 'black'}}, add_on.name())
                            ])
                    ])
            ]);
    });
};

//controller
install_collection.controller = function(){
    this.list = new install_collection.Add_on_list();
    this.name = m.prop("");
    this.url = m.prop("");
    this.add = function(name, url){
        if (name()) {
            this.list.push(new install_collection.Add_on(
                {name: name(), url: url(), progress: 0}));
            this.name("");
            this.url("");
        }
    };
};

var ctrl = new install_collection.controller();
ctrl.name("Write code");
ctrl.url("Good luck!");
ctrl.add(ctrl.name, ctrl.url);
console.log(ctrl.list.length); //1
m.render(document.body, install_collection.view(ctrl));

addon.port.on("add-ons", function(add_ons) {
    for (var i = 0; i < add_ons.names.length; i++) {
        ctrl.name(add_ons.names[i]); 
        ctrl.url(add_ons.urls[i]); 
        ctrl.add(ctrl.name, ctrl.url);
    }
    m.render(document.body, install_collection.view(ctrl));
});