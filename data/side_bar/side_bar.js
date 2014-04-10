//name space
var install_collection = {};
const enabled = 'btn btn-success';
const disabled = 'btn btn-default';
//modules
install_collection.Add_on = function(data){
    this.name = m.prop(data.name);
    this.url = m.prop(data.url);
    this.progress = m.prop(0);
    this.button_class = m.prop(enabled);
};

install_collection.Add_on_list = Array;

//views
install_collection.install_view = function(ctrl){
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

install_collection.selection_view = function(ctrl){
    return m('table',ctrl.list.map(function (add_on, index){
        return m('tr',[
                m('td',{style: {padding: "0 0 5px 0"}},[
                    m('button', {onclick: m.withAttr('class', function(value){
                        if (value.trim() == enabled){
                            add_on.button_class(disabled);
                            console.log("success!");
                        } else {
                            add_on.button_class(enabled);
                        }
                        m.render(document.body, install_collection.selection_view(ctrl));
                    }),
                        type: 'button', class: add_on.button_class()},
                        add_on.name())
                    ])
                ]
               );
    }));
};

//controller
install_collection.install_controller = function(){
    this.list = new install_collection.Add_on_list();
    this.name = m.prop("");
    this.url = m.prop("");
    this.add = function(name, url){
        if (name()) {
            this.list.push(new install_collection.Add_on(
                {name: name(), url: url()}));
            this.name("");
            this.url("");
        }
    };
};

var ctrl = new install_collection.install_controller();
// ctrl.name("Write code");
// ctrl.url("Good luck!");
// ctrl.add(ctrl.name, ctrl.url);
// ctrl.name("Write code");
// ctrl.url("Good luck!");
// ctrl.add(ctrl.name, ctrl.url);
// console.log(ctrl.list.length); //1
m.render(document.body, install_collection.selection_view(ctrl));


addon.port.emit("ping");
addon.port.on("add-ons", function(add_ons) {
    for (var i = 0; i < add_ons.names.length; i++) {
        ctrl.name(add_ons.names[i]); 
        ctrl.url(add_ons.urls[i]); 
        ctrl.add(ctrl.name, ctrl.url);
    }
    m.render(document.body, install_collection.selection_view(ctrl));
});