let job_running             = false;
let use_smiles_drawer_table = true;
let use_alert_modal         = true;

//let smiles_input_var = document.getElementById("smiles_input_id");
let compound_id_input_var = document.getElementById("compound_id_input_id");

let smiles_submit_button_var = document.getElementById("smiles_submit_button_id");
let smiles_refresh_button_var = document.getElementById("smiles_refresh_button_id");

let compound_format_button_var = document.getElementById("compound_format_button_id");
// let compound_format_selected_var = compound_format_button_var.innerHTML;
let compound_input_var = document.getElementById("compound_input_id_text");
let compound_input_var_original = compound_input_var.cloneNode(true);
let compound_input_var_text = document.getElementById("compound_input_id_text");
let compound_input_var_button = document.getElementById("compound_input_id_button");
let compound_input_editor_modal = document.getElementById("respiraTox_JSMEEditor");



let fingerprint_type_button_var   = document.getElementById("fingerprint_type_button_id");
let fingerprint_type_var          = document.getElementById("fingerprint_type_id");
let fingerprint_type_selected_var = fingerprint_type_button_var.value;


let distance_method_button_var   = document.getElementById("distance_method_button_id");
let distance_method_var          = document.getElementById("distance_method_id");
let distance_method_selected_var = distance_method_var.value;

let table_body_var = document.getElementById("neighbour_table_body_id");
let table_var = document.getElementById("neighbour_table_id");
let prediction_display_area_var = document.getElementById("prediction_display_area_id");

let download_neighbours_button_var = document.getElementById("download_neighbours_button");
let download_prediction_button_var = document.getElementById("download_prediction_button");

let local_color_scheme = {
    red: "rgba(245,198,203,1.0)",
    green: "rgba(195,230,203,1.0)",
    white: "rgba(255,255,255,1.0)",
    black: "rgba(0,0,0,1.0)",
    reliable_green: "rgba(195,240,213,1.0)",
    reliable_red: "rgba(255,198,213,1.0)",
    irritation_true: "rgba(234,197,210,1.0)",
    irritation_false: "rgba(197,209,234,1.0)",
}
    

let smiles_canvas_options = {
    width:250,
    height:150
};

// Initialize the drawers
let smiles_drawer = new SmilesDrawer.Drawer(smiles_canvas_options);


let smiles_drawer_table_options = {
    width: 200,
    height: 100,
    // bondLength: 3,
    // overlapResolutionIterations: 2
};
let smiles_drawer_table = new SmilesDrawer.Drawer(smiles_drawer_table_options);

// JSME Editor

// assumption: one one single applet
// function jsmeOnLoad() {
//     jsmeApplet = new JSApplet.JSME("jsme_container", "380px", "340px"); 
// }  
// let jsme_editor_applet = document.jsapplets[0];
let jsme_editor_applet = document.getElementById("jsmeApplet");


// for current JSON result
var respiraTox_request_status       = 0;
var respiraTox_request_ID           = -1;
var respiraTox_request_result       = -1;
var respiraTox_request_result_conf  = -1.0;
var respiraTox_request_data         = {};
var respiraTox_request_neighbours   = [];

// html to be replaced dynamically (taken from index.html)
var respiraTox_compound_information_modal_header_var = document.getElementById("respiraTox_compound_information_modal_header");
var respiraTox_compound_information_modal_header_html = " "+respiraTox_compound_information_modal_header_var.innerHTML;

var compound_information_modal_var  = document.getElementById("compound_information_modal_body");    
var compound_information_modal_html = " "+compound_information_modal_var.innerHTML;

// new alert modal (try)
var alert_modal_var  = document.getElementById("respiraTox_alertMessageModal");    
var alert_modal_title_var  = document.getElementById("respiraTox_alertMessageModalTitle_id");    
var alert_modal_body_var  = document.getElementById("respiraTox_alertMessageModalBody_id");    
var alert_modal_footer_var  = document.getElementById("respiraTox_alertMessageModalTitle_id");    


// automatic switching, depending whether or not on server

var window_protocol = window.location.protocol.replace(/:/g,'')
var window_domain   = window.location.hostname;
var window_port     = window.location.port;

// this is used to address the rest service
let basic_domain = 'http://127.0.0.1:5555/';

// if running on the fraunhofer server, adept 
if (window_domain == 'respiratox.item.fraunhofer.de') {
    basic_domain = 'https://respiratox.item.fraunhofer.de/rest/';
}

// define the rest entry points
// let convert_URL = "http://127.0.0.1:5555/smiles/"
// let base_URL = "http://127.0.0.1:5555/compound/"
// let convert_URL = "https://respiratox.item.fraunhofer.de/rest/smiles/"
// base_URL = "https://respiratox.item.fraunhofer.de/rest/compound/";
let convert_URL = basic_domain+"smiles/"
let base_URL = basic_domain+"compound/"
console.log("window_protocol  : "+window_protocol);
console.log("window_domain    : "+window_domain);
console.log("window_port      : "+window_port);
console.log("basic_domain     : "+basic_domain);
console.log("convert_URL      : "+convert_URL);
console.log("base_URL         : "+base_URL);



// tools

function getAllFuncs(obj) {
    var props = [];

    do {
        props = props.concat(Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));
    console.log('Properties:'+props)
    return props.sort().filter(function(e, i, arr) { 
       if (e!=arr[i+1] && typeof obj[e] == 'function') return true;
    });
}

function alert_modal(title,message) {
    alert_modal_title_var.innerHTML  = title;
    alert_modal_body_var.innerHTML  = message;
    $('#respiraTox_alertMessageModal').modal('show');
}


function alert_message(message) {
    let respiraTox_alert_var = document.getElementById("respiraTox_alert_id");
    if(message) {
        respiraTox_alert_var.style.display = "block";
	respiraTox_alert_var.innerHTML = message;
    } else {
        respiraTox_alert_var.style.display = "none";
	respiraTox_alert_var.innerHTML = "None";
    }
}

function disableElement(the_element) {
    the_element.disabled = true;
}
function enableElement(the_element) {
    the_element.disabled = false;
}

function hideElement(the_element){
    the_element.style.display = 'none';
}
function showElement(the_element){
    the_element.style.display = 'block';
}

function toggleElement(the_element,the_html="none") {
    let current_display = the_element.style.display;
    if (current_display == 'none'){
	showElement(the_element);
	if (the_html != 'none') {
	    the_element.innerHTML = the_html;
	}
    } else {
	hideElement(the_element);
    }
}

function select_fingerprint_type(selected_fingerprint_type){
    console.log('distance method = '+selected_fingerprint_type); 
    fingerprint_type_var.value = selected_fingerprint_type;
    fingerprint_type_var.innerHTML = selected_fingerprint_type;
    fingerprint_type_selected_var = selected_fingerprint_type;
    
}

function select_distance_method(selected_distance_method) {
    // let distance_method_var = document.getElementById("distance_method_id");
    console.log('distance method = '+selected_distance_method); 
    distance_method_var.value = selected_distance_method;
    distance_method_var.innerHTML = selected_distance_method;
    distance_method_selected_var = selected_distance_method;
    
}


// $('#respiraTox_JSMEEditor').on('show.bs.modal', function (event) {
//   var button = $(event.relatedTarget) // Button that triggered the modal
//   var recipient = button.data('whatever') // Extract info from data-* attributes
//   // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
//   // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
//   var modal = $(this)
//   modal.find('.modal-title').text('New message to ' + recipient)
//   modal.find('.modal-body input').val(recipient)
// })


function smiles_submission_from_editor_cancelled() {
    showElement(compound_input_var_text);
    hideElement(compound_input_var_button);    
}

function smiles_submitted_from_editor(submitted_smiles) {
    compound_input_var.value = submitted_smiles;
    compound_format_selected_var = "SMILES";
    showElement(compound_input_var_text);
    hideElement(compound_input_var_button);

    console.log(compound_input_var);
    console.log(compound_input_var.value);
    console.log(compound_input_var.innerHTML);

    // push to smiles drawer
    SmilesDrawer.parse(submitted_smiles, function(tree) {
        // Draw to the canvas
        smiles_drawer.draw(tree,"smiles_canvas", "light", false);
    });

    
}

function select_compound_format(compound_format){
    // console.log("compound_format:"+compound_format);
    // console.log("was (button):"+compound_format_button_var.innerHTML);
    // console.log("was (var):   "+compound_format_selected_var);
    compound_format_selected_var = compound_format
    compound_format_button_var.innerHTML = compound_format_selected_var;
    // console.log("is  (button):"+compound_format_button_var.innerHTML);
    // console.log("is  (var):   "+compound_format_selected_var);

    if (compound_format_selected_var == "MDL" || compound_format_selected_var == "SDF") {
	hideElement(compound_input_var_text);
	showElement(compound_input_var_button);
	// disableElement(compound_input_var);
    } else if (compound_format_selected_var == "EDITOR" ) {
	let current_smiles = compound_input_var.value;

	// // not possible currently to set via SMILES - have to provide in the pyhthon REST interface
	// try to use converter functionality of the REST server


	// use external : https://cactus.nci.nih.gov/chemical/structure/CCC(C)CC/file?format=jme
	// https://cactus.nci.nih.gov/chemical/structure
	// https://cactus.nci.nih.gov/chemical/structure/"structure identifier"/"representation"

	
	// if (current_smiles != '') {
	if (false) {
	    smiles_encoded = encodeURI(current_smiles);
	    console.log("smiles_encoded:"+smiles_encoded);
	    submit_data = {"smiles_string":smiles_encoded};
	    let converted_smiles = '';
	    // $.post(convert_URL,submit_data,
	    // 	   function(data,status){
	    // 	       console.log("Data: " + data);
	    // 	       converted_smiles = data;
	    // 	       console.log("Status: " + status);
	    // 	   });
	    
	    $.ajax({
		type: "POST",
		url: convert_URL,
		async: false,
		data: submit_data,
		success: function(response) { converted_smiles = response; }
	    });
  

	    console.log("converted_smiles:"+converted_smiles);

	    
	//     let jsme_editor_applet = document.getElementById("jsmeApplet");

	//     console.log('setting existing smiles: '+current_smiles);
	//     console.log('jsmeApplet: '+jsmeApplet);
	    
	//     var mol_from_smiles = Kekule.IO.loadFormatData(current_smiles, 'smi');
	//     console.log('mol_from_smiles:'+mol_from_smiles);
	//     var mol_data = Kekule.IO.saveFormatData(mol_from_smiles, 'mol');
	//     console.log('mol_data:'+mol_data);

	    console.log('jsme visible 1?'+jsmeApplet.isVisible());
	    console.log('jsme smiles 1?'+jsmeApplet.smiles());
	    jsmeApplet.readMolFile(converted_smiles);
	    compound_as_jme = jsmeApplet.jmeFile()
	    console.log('jsme compound_as_jme 1?'+compound_as_jme);
	    jsmeApplet.readMolecule(compound_as_jme);
            $("#respiraTox_JSMEEditor").modal();
	    // console.log('jsme smiles 2?'+jsmeApplet.smiles());
	    // jsmeApplet.readMolFile(converted_smiles);
	    // jsmeApplet.repaint();
	    // jsmeApplet.deferredRepaint();
	    // console.log('jsme visible 2?'+jsmeApplet.isVisible());

	    // jsmeApplet.readGenericMolecularInput(converted_smiles);
	    //console.log('jsme_editor_applet: '+jsme_editor_applet);
	//     // jsmeApplet.readMolecule(current_smiles); // or document.JME.readMolecule(jme);
	//     //getAllFuncs(jsme_editor_applet);
	} else {
            $("#respiraTox_JSMEEditor").modal();
	    jsmeApplet.repaint();
	    jsmeApplet.deferredRepaint();
	    // set input nbutton selection to default
	    compound_format_button_var.innerHTML = "SMILES";

	}
	// let compound_input_editor_modal = $("#respiraTox_JSMEEditor");

	compound_format_selected_var + "SMILES";
	hideElement(compound_input_var_text);
	hideElement(compound_input_var_button);
	
    } else {
	showElement(compound_input_var_text);
	hideElement(compound_input_var_button);
	// enableElement(compound_input_var);
	// compound_input_var.placeholder = compound_input_var_original.placeholder;
    }
    
}

function send_for_prediction_service(compound_id,smiles,fingerprint_type,distance_method){
    compound_id_encoded = encodeURI(compound_id);
    smiles_encoded = encodeURI(smiles);
    console.log("compound_id_encoded:"+compound_id_encoded);
    console.log("smiles_encoded:"+smiles_encoded);
    console.log("fingerprint_type:"+fingerprint_type);
    console.log("distance_method:"+distance_method);
    // let xhttp = new XMLHttpRequest();
    // console.log("xhttp:"+xhttp);
    console.log("call send");
    // send(compound_id_encoded,smiles_encoded);
    // userAction();
    submit_data = {"compound_id":compound_id, // new variable name
		   "compound_structure_smiles":smiles, // new variable name
		   "calculation_fingerprint_type":fingerprint_type,
		   "calculation_distance_method":distance_method,
		  };
    // submit_URL  = 'http://127.0.0.1:5000/compound/';
    sendRequest(base_URL,submit_data);
    console.log("call sent ");
    // set that job is running
    job_running = true;
    // schedule the first invocation:
    setTimeout(myPeriodicMethod, 1000);

    let respiraTox_alert_var = document.getElementById("smiles_submit_button_id");

}

function myPeriodicMethod() {
    if (job_running) {
	refresh_prediction();
	setTimeout(myPeriodicMethod, 1000);
    }
}

// not used. Just used the general SmilesDrawer apply function to generate all canvas elements conatining data-smiles
function drawSmiles() {
    SmilesDrawer.apply();
}

function renderResultTableNew(neighbours) {
    console.log("renderResultTableNew:");
    table_body_var.innerHTML = '';
    showElement(table_var);

    for (var i = 0; i < neighbours.length; i++){
	neighbour = neighbours[i];
	// console.log(neighbour);
	var irritation_row_class = "table-success";
	if (neighbour["compound_endpoint_no_irritation"] == "0") {
	    irritation_row_class = "table-danger";
	}
	var tr = document.createElement('tr');
	tr.setAttribute('class',irritation_row_class);
	tr.setAttribute('id','tr_id_'+i);
	tr.setAttribute('onclick','return activate_compound_information('+i+')');

	table_body_var.appendChild(tr)

	
	// rank
	var th = document.createElement('th');
	th.innerHTML = neighbour["rank"];
	tr.appendChild(th);
	
	// compound_name
	var td = document.createElement('td');
	td.innerHTML = neighbour["compound_name"];
	tr.appendChild(td);

	// compound_compound_id
	td = document.createElement('td');
	td.innerHTML = neighbour["compound_cas_number"];
	tr.appendChild(td);

	// similarity
	td = document.createElement('td');
	td.innerHTML = parseFloat(neighbour["compound_similarity_score"]).toFixed(2);
	tr.appendChild(td);

	// either smiles of the molecule in hgraphical representation 
	if (use_smiles_drawer_table) {
	    try {
		td = document.createElement('td');

		// canvas
		let canvas_element = document.createElement('canvas');
		var canvas_element_id = 'canvas_nn_'+i;

		canvas_element.setAttribute('id', canvas_element_id);
		// canvas_element.setAttribute('width', '75');
		// canvas_element.setAttribute('height', '75');
		canvas_element.setAttribute('alt', neighbour["compound_structure_smiles"]);
		// canvas_element.setAttribute('data-smiles', "CCCCCCC");

		// var ctx = canvas_element.getContext("2d");
		// ctx.fillStyle = 'green';
		// ctx.fillRect(5, 5, 15, 15);

		td.appendChild(canvas_element);
		tr.appendChild(td);

		// console.log('canvas.id = '+canvas_element.id);
		// console.log('canvas as element:'+Object.values(canvas_element));

		// var element_smiles = neighbour["smiles"];
		// console.log(canvas_element_id+'.id:'+canvas_element.id);
		// console.log(canvas_element_id+'.canvas_element:'+canvas_element);
		// console.log(canvas_element_id+'.neighbour:'+Object.values(neighbour));
		// console.log(canvas_element_id+'.smiles:'+element_smiles);
		SmilesDrawer.parse(neighbour["compound_structure_smiles"], function(tree) {
		    // console.log(canvas_element_id+'.tree1:'+Object.keys(tree));
		    // console.log(canvas_element_id+'.tree1:'+Object.values(tree));
		    smiles_drawer_table.draw(tree,canvas_element, 'light', false);
		    // console.log(canvas_element_id+'.tree2:'+tree);
		});
		// console.log(canvas_element_id+'.smiles_drawer_table:'+Object.keys(smiles_drawer_table));
		

	    } catch (exception) {
		console.log('exception occurred:');
            }
	} else {
	    // smiles
	    td = document.createElement('td');
	    td.innerHTML = neighbour["compound_structure_smiles"];
	    tr.appendChild(td);
	}

	// database refs
	td = document.createElement('td');
	td.innerHTML = neighbour["compound_source"];
	tr.appendChild(td);

	// irritation information
	td = document.createElement('td');
	tr.appendChild(td);

	// default is a switched off LED
	var sensory_irritation_elementStyle = 'led';
	var tissue_damage_elementStyle      = 'led';
	var no_irritation_elementStyle      = 'led';
	
	if (neighbour['compound_endpoint_sensory_irritation'] == 1) {
	    sensory_irritation_elementStyle = 'led-red-on';
	} else if (neighbour['compound_endpoint_sensory_irritation'] == 0) {
	    sensory_irritation_elementStyle = 'led-green-on';
	}

	if (neighbour['compound_endpoint_tissue_damage'] == 1) {
	    tissue_damage_elementStyle      = 'led-red-on';
	} else if (neighbour['compound_endpoint_tissue_damage'] == 0) {
	    tissue_damage_elementStyle      = 'led-green-on';
	}

	
	if (neighbour['compound_endpoint_no_irritation'] == 1) {
	    no_irritation_elementStyle      = 'led-green-on';
	} else if (neighbour['compound_endpoint_no_irritation'] == 0) {
	    no_irritation_elementStyle      = 'led-green-on';
	}

	// create led element for sens irritation
	led_si = document.createElement('span');
	led_si.className = sensory_irritation_elementStyle;
	td.appendChild(led_si);

	// required a separator
	separator = document.createElement('span');
	separator.innerHTML = '&nbsp;';
	td.appendChild(separator);

	// create led element for tissue_damage
	led_td = document.createElement('span');
	led_td.className = tissue_damage_elementStyle;
	td.appendChild(led_td);
    };
    // console.log('use_smiles_drawer_table = '+use_smiles_drawer_table);
}

function find_and_print_object(object_name) {
    let object_var = document.getElementById(object_name);
    console.log(object_name+' = '+object_var);
}

// this function id from https://stackoverflow.com/questions/21068439/javascript-what-is-the-opposite-of-isnan
function isNumeric(num) {
  return !isNaN(parseFloat(num)) && isFinite(num);
}
// cuts, trims integer - float - strings
function formater(x,base=10,round=2,cut=12) {
    var parsed = parseInt(x, 10);
    if (parsed == x) {
	// integer
	// console.log('Integer:  '+x+'  :  '+parsed);
	return parsed;
    }
    else {
	parsed = parseFloat(x);
	
      	if (x - parsed < 0.5) {
	    // float
            parsed = parsed.toFixed(round);
	    // console.log('Float:  '+x+'  :  '+parsed);
	    return parsed;
        }
      	else {
	    // string
	    //parsed = " "+x
	    try {
		parsed = x.substring(0,cut+3);
	    }
	    catch(error) {
		console.error('Formatter Error: returning "NO DATA"');
		console.error(error);
		return "NO DATA";
2	    }
	    if (x.length > cut+3) {
		parsed = x.substring(0,cut)+'...';
	    }
	    // console.log('String:  '+x+'  :  '+parsed);
	    return parsed;
        }
    }
}

// // to dynamically replace strings in innerHTNL for the display modal
// function do_replacement_mapping(the_string,the_mapping_array) {
//     var arrayLength = the_mapping_array.length;
//     for (counter=0; counter<arrayLength; counter++) {
// 	from_string_map = the_mapping_array[counter][0];
// 	to_string_map = the_mapping_array[counter][1];
// 	if (from_string_map != 'compound_cas_number') {
// 	    the_string = the_string.replace(/from_string_map/g,formater(to_string_map,10,2,40));
// 	} else {
// 	    the_string = the_string.replace(/from_string_map/g,to_string_map);
// 	}
//     }
//     return the_string;
// }

// dynamically generate mappi
function do_replacement_by_data(the_string, the_neighbour_data) {
    for (var property_name in the_neighbour_data) {
	if (property_name != 'compound_cas_number') {
	    the_string = the_string.replace("#"+property_name+"#",formater(the_neighbour_data[property_name],10,2,28));
	} else {
	    the_string = the_string.replace("#"+property_name+"#",the_neighbour_data[property_name]);
	}
    }
    return the_string;
    
}

function activate_compound_information(neighbour_number) {
    console.log('neighbour_number = '+neighbour_number);

    // allow for display of test data directly from HTML (neighbour_number = -1)
    if (neighbour_number>= 0) {
	neighbour_data = respiraTox_request_neighbours[neighbour_number];
	if (neighbour_data['chemical_name'] == undefined) {
	    neighbour_data['chemical_name'] = 'undefined';
	}
	// hack for JSME Editor depeict
	if (neighbour_data['compound_structure_smiles_js']) {
	    neighbour_data['compound_structure_smiles_js'] = neighbour_data['compound_structure_smiles_js'];
	}
	
    
	respiraTox_compound_information_modal_header_html_here = respiraTox_compound_information_modal_header_html;
	// set back to HTML
	respiraTox_compound_information_modal_header_html_here = do_replacement_by_data(respiraTox_compound_information_modal_header_html_here,neighbour_data)
	respiraTox_compound_information_modal_header_var.innerHTML = respiraTox_compound_information_modal_header_html_here;

    
	compound_information_modal_html_here = compound_information_modal_html;
	// do the string replacements
    
	// compound_information_modal_html_here = compound_information_modal_html_here.replace("#COMPOUND_ID#", "Neighbour = "+neighbour_number);
	compound_information_modal_html_here = do_replacement_by_data(compound_information_modal_html_here,neighbour_data)

	// set back to HTML
	compound_information_modal_var.innerHTML = compound_information_modal_html_here

	$('#respiraTox_compound_information').modal('show');
	console.log(compound_information_modal_var.innerHTML);
	SmilesDrawer.parse(neighbour_data['smiles'], function(tree) {
	    // Draw to the canvas
	    smiles_drawer.draw(tree,"ci_canvas_id", "light", false);
	});
    }
    else {
	$('#respiraTox_compound_information').modal('show');
	SmilesDrawer.parse('CCCCCCCC', function(tree) {
	    // Draw to the canvas
	    smiles_drawer.draw(tree,"ci_canvas_id", "light", false);
	});
	console.log(compound_information_modal_var.innerHTML);
    }
	
    // show the modal
}


function renderNeighbour(neighbour,counter) {
    console.log('renderNeighbour. Neighbour = '+neighbour+'    counter:'+counter);
    let irritation_row_class = "table-success";
    let irritation_row_color = "green";
    if (neighbour["no_irritation"] == "0") {
	irritation_row_class = "table-danger";
	irritation_row_color = "red";
    }
    return '\t<tr id="table_row_'+counter+' style="color: '+irritation_row_color+';" class="'+irritation_row_class+'">\n\t\t<th scope="row">'+neighbour["rank"]+'</th>\n\t\t<td>'+neighbour["chemical_name"]+'</th>\n\t\t<td>'+neighbour["compound_cas_number"]+'</td>\n\t\t<td>'+parseFloat(neighbour["Tanimoto"]).toFixed(2)+'</td>\n\t\t<td>'+neighbour["smiles"]+'</th>\n\t\t<td>'+neighbour["source"]+'</td>\n\t</tr>';
    // returnVal = '\t<tr id="table_row_'+counter+' class="'+irritation_row_class+'">\n\t\t<th scope="row">'+neighbour["rank"]+'</th>\n\t\t<td>'+neighbour["chemical_name"]+'</th>\n\t\t<td>'+neighbour["compound_cas_number"]+'</td>\n\t\t<td>'+parseFloat(neighbour["Tanimoto"]).toFixed(2)+'</td>\n\t\t<td id="neighbour_canvas_'+counter+'" width="150" height="150"></canvas></th>\n\t\t<td>'+neighbour["source"]+'</td>\n\t</tr>';
    // return returnVal;

}

function renderResultTable(neighbours) {
    console.log("renderResultTable:");
    // console.log('neighbours = '+neighbours)
    let inner_html = "";
    for (var i = 0; i < neighbours.length; i++){
	inner_html = inner_html + renderNeighbour(neighbours[i],i);
    };
    table_body_var.innerHTML = inner_html;
    // $(document).ready(function() {
    //     $('#neighbour_table_id').DataTable();
    // } );
    
}    

function renderPredictionResult(predictionResult,appdomain, predictionResultConfidence) {
    // predictionResult == 1 - irritation : 0 - no irritation
    // appdomain: reliable vs 
    console.log("renderPredictionResult");
    let prediction_result_int = parseFloat(predictionResult).toFixed(1)
    // let prediction_result_conf = parseFloat(predictionResult).toFixed(5)
    let prediction_color = local_color_scheme.white;
    let prediction_label = '';
    let appdomain_label  = '';
    let applicabilitydomain_display_area_var = document.getElementById('applicabilitydomain_display_area_id');
    if (prediction_result_int >= 0.0) {
	// == 1
	if (prediction_result_int > 0.0) {
	    prediction_color = local_color_scheme.reliable_green;
	    prediction_label = 'nonirritant';
	} else if (prediction_result_int >= 0.0) {
	// == 0
	    prediction_color = local_color_scheme.reliable_red;
	    prediction_label = 'irritant';
	} else {
	// == -1 - clearing
	    prediction_color = local_color_scheme.white;
	    prediction_label = '';
	}

	if ((prediction_label != '') && (predictionResultConfidence > 0.0)) {
	    prediction_label = prediction_label+" ("+predictionResultConfidence.toFixed(3)+")"; 
	}

    }
    prediction_display_area_var.style.setProperty("background-color",prediction_color);
    prediction_display_area_var.innerHTML = prediction_label
    // deal with AppDomain

    appdomain_label = appdomain;
    let applicabilitydomain_color = local_color_scheme.white;
    if (appdomain == 'reliable') {
    	applicabilitydomain_color = local_color_scheme.reliable_green;
    } else if (appdomain == 'unreliable') {
    	applicabilitydomain_color = local_color_scheme.reliable_red; 
    } else {
	appdomain_label == 'CLEARED';
    	applicabilitydomain_color = local_color_scheme.white; 
    }
    applicabilitydomain_display_area_var.innerHTML = appdomain_label;
    applicabilitydomain_display_area_var.style.setProperty("background-color",applicabilitydomain_color);
}


function analyseResponse(response) {
    let status = response.status[0];
    let thread_status = response.thread.status;
    let thread_running_time = response.thread.running_time;
    
    var datatable = $('#neighbour_table_id').DataTable();

    // job running
    if (status == 10) {  
	job_running = true;

	respiraTox_request_status = status;
	respiraTox_request_ID = response["job_id"];
	hideElement(table_var);
	disableElement(download_neighbours_button_var);
	disableElement(download_prediction_button_var);
	renderPredictionResult(-1,'');
	if(thread_status === 'running') {
	    alert_message('Job is running<br/>Job ID = <a href="'+base_URL+respiraTox_request_ID+'" target="_blank">'+respiraTox_request_ID+"</a><br/> Running time: "+thread_running_time+" secs");
	}else{
	    alert_message('Job is queued ('+thread_status+')<br/>Job ID = <a href="'+base_URL+respiraTox_request_ID+'" target="_blank">'+respiraTox_request_ID+"</a><br/> Running time: Job will start shortly");
	}
    }
    // job finished
    else if (status == 11) {
	job_running = false;

	respiraTox_request_status = status;
	// response = walkObj(response, checkAndFixNull);

	respiraTox_request_result = response["Prediction (endpoint)"];
	try {
	    respiraTox_request_result_conf = response["calculated_data"]["Prediction (endpoint) (Confidence)"];
	} catch (exception) {
	    console.log('exception occurred: Could not find response["calculated_data"]["Prediction (endpoint) (Confidence)"] in response');
        }

	let appdomain =  response["calculated_data"]["Prediction"];
	// console.log('appdomain:'+appdomain);
	respiraTox_request_data   = response["calculated_data"]
	respiraTox_request_neighbours   = response["calculated_data"]["neighbours"]["neighbours"][0]

	// $('#neighbour_table_id').DataTable().clear();.destroy();
        // datatable = $('#neighbour_table_id').DataTable();

	datatable.clear();
	datatable.destroy();
	renderResultTableNew(respiraTox_request_neighbours);
	renderPredictionResult(respiraTox_request_result,appdomain,respiraTox_request_result_conf);
	datatable = $('#neighbour_table_id').DataTable();
	datatable.draw();
	
	// switch on DataTable Sorting, searching etc.
	// if ($.fn.DataTable.isDataTable("#neighbour_table_id")) {
	// }
	console.log('datatable : '+datatable);
	// datatable.destroy()
        // datatable = $('#neighbour_table_id').DataTable();
	// datatable.paint();


	
	alert_message('Job has finished<br/>Job ID = <a href="'+base_URL+respiraTox_request_ID+'" target="_blank">'+respiraTox_request_ID+"</a><br/> Running time: "+thread_running_time+" secs");

	enableElement(smiles_submit_button_var);
	disableElement(smiles_refresh_button_var);
	enableElement(download_neighbours_button_var);
	enableElement(download_prediction_button_var);

    }
    else if (status == 15) {
	job_running = false;
	respiraTox_request_ID = -1;
	respiraTox_request_status = -1;
	respiraTox_request_result = -1
	respiraTox_request_data   = {}
	respiraTox_request_neighbours   = [];

	var addtional_error = '';
	
	try {
	    addtional_error = "<br/>Model error: "+response.workflow_rt_err_string+" (Error code: "+response.workflow_rt_err+")"
	} catch  (exception) {
	    console.log('exception occurred: Could not retrieve additional model error');
	}

	let error_msg = "Job did not finish"+addtional_error+"<br/>Resetting system job variables";
	alert_message(error_msg);
	alert_modal('Runtime Error',error_msg);
	hideElement(table_var);
	enableElement(smiles_submit_button_var);
	disableElement(smiles_refresh_button_var);
	disableElement(download_neighbours_button_var);
	disableElement(download_prediction_button_var);
	renderPredictionResult(-1,'',-1.0);
	clear_input_and_canvas();
    }
    console.log('Status is:' + status);
    console.log('Job running flag is: '+job_running);

}


function fetchResult(submit_URL) {
    fetch(submit_URL).then(res => res.json())
	.then(response => {/*console.log('Success(fetchResults):', JSON.stringify(response));*/analyseResponse(response)})
	.catch(error => {console.error('Error(fetchResults):', error)});
}


function sendRequest(submit_URL,submit_data) {
    fetch(submit_URL, {
	method: 'POST', // or 'PUT'
	mode: "cors", // no-cors, cors, *same-origin
	credentials: "omit", // include, same-origin, *omit
	body: JSON.stringify(submit_data), // data can be `string` or {object}!
	headers:{
	    'Content-Type': 'application/json'
	}
    }).then(res => res.json())
	.then(response => {console.log('Success:', JSON.stringify(response));analyseResponse(response)})
	.catch(error => {console.error('Error:', error)});
}

function do_dummy_job(){
    let respiraTox_request_ID = 4;
    // let base_URL = "http://127.0.0.1:5555/compound/"
    console.log("do_dummy_job")
    if (respiraTox_request_ID >= 0) {
	console.log("respiraTox_request_ID:"+respiraTox_request_ID)
	console.log("base_URL:"+base_URL)
	submit_URL = base_URL+respiraTox_request_ID;
	console.log("trying to fetch: <<"+submit_URL+">>");

	fetchResult(submit_URL);
    }
}

function refresh_prediction(){
    // console.log("refresh_prediction")
    if (respiraTox_request_ID >= 0) {
	console.log("respiraTox_request_ID:"+respiraTox_request_ID)
	submit_URL = base_URL+respiraTox_request_ID;
	fetchResult(submit_URL);
    }
}

function submit_for_prediction(respiraTox_alert_id){
    let someNumber = "0.5677373"
    let someRealNumber = parseFloat(someNumber).toFixed(2);
    console.log("someRealNumber:"+someRealNumber);
    let compound_input_value = compound_input_var.value;
    let compound_id_input_value = compound_id_input_var.value;
    let fingerprint_type_var_value = fingerprint_type_var.value;
    let distance_method_var_value = distance_method_var.value;
    let error_message = "";
    // compound ID number should be not null
    // if (!compound_id_input_value){
    // 	console.log("compound_id_input_var (prediction) was empty:");
    // 	error_message = error_message + "Please fill the Compound ID Number field!<br/>";
    // }
    if (!compound_input_value){
	console.log("compound_input_value (prediction) was empty:");
	error_message = error_message + "Empty compound structure!<br/>";
    }
    // if (!check_if_valid_smiles(compound_input_value)) {
    // 	console.log("Illegal SMILES sting:");
    // 	error_message = error_message + "The SMILES sting is not valid!<br/>";
    // }
    if(error_message){
	alert_message(error_message);
	return false
    }
    // console.log("compound_input_value (prediction):         " + compound_input_value);
    // console.log("compound_id_input_var (prediction):         " + compound_id_input_value);
    // console.log("fingerprint_type_selected_var (prediction):" + fingerprint_type_var_value);
    // console.log("distance_method_selected_var (prediction): " + distance_method_var_value);
    send_for_prediction_service(compound_id_input_value,compound_input_value,fingerprint_type_var_value,distance_method_var_value);
    disableElement(smiles_submit_button_var);
    enableElement(smiles_refresh_button_var);
    hideElement(table_var);
    //alert("The form has been submitted");
    return false;
}

compound_input_var.addEventListener("input",function() {
    console.log("compound_input_var1:"+compound_input_var.value);
    // Clean the actual text input
    compound_input_var.value = compound_input_var.value.replace(/[^A-Za-z0-9@\.\+\-\?!\(\)\[\]\{\}/\\=#\$:\*]/g,'');

    if (compound_input_var.value != '') {
	// Clean the input (remove unrecognized characters, such as spaces and tabs) and parse it
	SmilesDrawer.parse(compound_input_var.value, function(tree) {
	    // Draw to the canvas
	    // console.log("compound_input_var2a:"+compound_input_var.value);
	    // console.log("compound_input_var2b:"+tree);
	    smiles_drawer.draw(tree,"smiles_canvas", "light", false);
	});
    } else {
	clear_smiles_drawer_canvas();
	// console.log("compound_input_var3:"+compound_input_var.value);
	// console.log(smiles_drawer.canvasWrapper.ctx);
	// // clear the drawer by creating a new one?
	// // smiles_drawer.canvasWrapper.ctx.clearRect(0, 0, smiles_drawer.canvasWrapper.canvas.offsetWidth, smiles_drawer.canvasWrapper.canvas.offsetHeight);
	// smiles_drawer.canvasWrapper.ctx.clearRect(0, 0,1000,1000);

	// smiles_drawer.canvasWrapper.reset();
	// smiles_drawer.canvasWrapper.clear();
	// smiles_drawer = new SmilesDrawer.Drawer(smiles_canvas_options);

    }
});

function clear_smiles_drawer_canvas() {
    	smiles_drawer.canvasWrapper.ctx.clearRect(0, 0,1000,1000);
}

function clear_input_and_canvas() {
    compound_input_var.value = "";
    clear_smiles_drawer_canvas();
    renderPredictionResult(-1,'',-1.0);
    select_compound_format('SMILES');
    clean_table();
    disableElement(download_neighbours_button_var);
    disableElement(download_prediction_button_var);

    // table_body_var.innerHTML = '';
    // datatable.clear();
    // datatable.destroy()
    // datatable = $('#neighbour_table_id').DataTable();
    // datatable.draw();
    // hideElement(table_var);

    // datatable.draw();
    // datatable.destroy();
    // datatable = $('#neighbour_table_id').DataTable();
    // renderResultTableNew({})

    // hideElement(table_var);
    // renderResultTable({});
}
function clean_table() {
    var datatable = $('#neighbour_table_id').DataTable();
    datatable.clear();
    datatable.draw();
    hideElement(table_var);
}

function check_if_valid_smiles(potential_smiles_string) {
    return potential_smiles_string.trim().match(/^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~;&!]{6,})$/ig);
}

// from : https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
function download(filename, text) {
    var element = document.createElement('a');

    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}


// Start file download.
	disableElement(download_prediction_button_var);

// document.getElementById("download_neighbours_button").addEventListener("click", function(){
download_neighbours_button_var.addEventListener("click", function(){
    // Generate download of neighbours
    var filename = "Neighbours_Job_"+respiraTox_request_ID+".csv";
    var tsv_sep = ',';
    var neighbours = respiraTox_request_neighbours;
    var header_keys = ["rank","compound_name","compound_cas_number","compound_similarity_score", "compound_structure_smiles", "compound_source", 'compound_endpoint_sensory_irritation', 'compound_endpoint_tissue_damage', 'compound_endpoint_no_irritation'];
    var myData = [header_keys.join(tsv_sep)];
    
    for (var i = 0; i < neighbours.length; i++){
	neighbour = neighbours[i];
	var neighbour_data = [];
	for (var j = 0; j < header_keys.length; j++){
	    var dummy = '"NOT SET"';
	    try {
		dummy = '"'+neighbour[header_keys[j]]+'"';
	    } catch (exception) {
		console.log(exception);
	    }
	    neighbour_data.push(dummy);
	}
	myData.push(neighbour_data.join(tsv_sep))
    }
    

    download(filename, myData.join("\r\n"));
}, false);

download_prediction_button_var.addEventListener("click", function(){
    // Generate download of prediction
    var filename = "Prediction_Job_"+respiraTox_request_ID+".csv";
    var tsv_sep = '\t';
    
    var myData = [["Information","Value"].join(tsv_sep)];
    myData.push(["compound_structure_smiles:",respiraTox_request_data["compound_structure_smiles"]].join(tsv_sep));
    myData.push(["respiraTox_compound_prediction:",respiraTox_request_result].join(tsv_sep));
    myData.push(["respiraTox_compound_prediction_confidence:",respiraTox_request_data["Prediction (endpoint) (Confidence)"]].join(tsv_sep));
    myData.push(["applicability_domain:",respiraTox_request_data["Prediction"]].join(tsv_sep));
    myData.push(["p(compound_endpoint_no_irritation=0):",respiraTox_request_data["P (compound_endpoint_no_irritation=0)"]].join(tsv_sep));
    myData.push(["p(compound_endpoint_no_irritation=1):",respiraTox_request_data["P (compound_endpoint_no_irritation=1)"]].join(tsv_sep));
    // myData.push([":",respiraTox_request_data[""]].join(tsv_sep));
    // myData.push([":",respiraTox_request_data[""]].join(tsv_sep));
    // myData.push([":",respiraTox_request_data[""]].join(tsv_sep));
    // calculation_distance_method
    // calculation_fingerprint_type
    // compound_substructure_filter
    // P (compound_endpoint_no_irritation=0)
    // P (compound_endpoint_no_irritation=1)
    // Prediction
    // Prediction (endpoint) (Confidence): 0.9847652561734487
    // acid: "0"
    // anorganic: "1"
    // base: "0"

    download(filename, myData.join("\r\n"));
}, false);



var what = Object.prototype.toString;

function walkObj(obj, fn) {
  var wo = what.call(obj);
  if (wo == "[object Object]") {
    Object.keys(obj).forEach(function(key){
      fn(obj, key);
      var item = obj[key], w = what.call(item);
      if (w == "[object Object]" || w == "[object Array]") {
        walkObj(item, fn);
      }
    });
  }
  else if (wo == "[object Array]") {
    obj.forEach(function(item, ix) {
      fn(obj, ix);
    });
    obj.forEach(function(item, ix) {
      var w = what.call(item);
      if (w == "[object Object]" || w == "[object Array]") {
        walkObj(item, fn);
      }
    });
  }
}

function checkAndFixNull(parent, key) {
  var value = parent[key], w = what.call(value);
  if ((w == "[object Object]") && (value.TEXT === null) && (value['@nil'] === true)) {
    parent[key] = null;
  }
}
