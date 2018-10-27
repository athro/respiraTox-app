//let smiles_input_var = document.getElementById("smiles_input_id");
let cas_number_input_var = document.getElementById("cas_number_input_id");

let smiles_submit_button_var = document.getElementById("smiles_submit_button_id");
let smiles_refresh_button_var = document.getElementById("smiles_refresh_button_id");

let compound_format_button_var = document.getElementById("compound_format_button_id");
// let compound_format_selected_var = compound_format_button_var.innerHTML;
let compound_input_var = document.getElementById("compound_input_id_text");
let compound_input_var_original = compound_input_var.cloneNode(true);
let compound_input_var_text = document.getElementById("compound_input_id_text");
let compound_input_var_button = document.getElementById("compound_input_id_button");
let compound_input_editor_modal = document.getElementById("respiraTox_JSMEEditor");



// let fingerprint_type_button_var = document.getElementById("fingerprint_type_button_id");
// let fingerprint_type_selected_var = fingerprint_type_button_var.innerHTML;
// let fingerprint_type_var = document.getElementById("fingerprint_type_id");


let distance_method_button_var = document.getElementById("distance_method_button_id");
let distance_method_var = document.getElementById("distance_method_id");
let distance_method_selected_var = distance_method_var.value;

let table_body_var = document.getElementById("neighbour_table_body_id");
let table_var = document.getElementById("neighbour_table_id");
let prediction_display_area_var = document.getElementById("prediction_display_area_id");

let prediction_colors = {
    red: "rgba(245,198,203,1.0)",
    green: "rgba(195,230,203,1.0)",
    white: "rgba(255,255,255,1.0)",
    black: "rgba(0,0,0,1.0)"
}
    

let smiles_canvas_options = {
    width:250,
    height:150
};

// Initialize the drawer
let smiles_drawer = new SmilesDrawer.Drawer(smiles_canvas_options);

// JSME Editor

// assumption: one one single applet
// function jsmeOnLoad() {
//     jsmeApplet = new JSApplet.JSME("jsme_container", "380px", "340px"); 
// }  
// let jsme_editor_applet = document.jsapplets[0];
let jsme_editor_applet = document.getElementById("jsmeApplet");





// for current JSON result
var respiraTox_request_status = 0;
var respiraTox_request_ID     = -1;
var respiraTox_request_result = -1;
var respiraTox_request_data   = {};

//var base_URL = "http://127.0.0.1:5000/compound/"
let base_URL = "http://127.0.0.1:5555/compound/"
// var base_URL = "https://respiratox.item.fraunhofer.de/rest/compound/";
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

function select_fingerprint_type(fingerprint_type){
    
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
	// if (current_smiles != '') {
	//     let jsme_editor_applet = document.getElementById("jsmeApplet");

	//     console.log('setting existing smiles: '+current_smiles);
	//     console.log('jsmeApplet: '+jsmeApplet);
	    
	//     var mol_from_smiles = Kekule.IO.loadFormatData(current_smiles, 'smi');
	//     console.log('mol_from_smiles:'+mol_from_smiles);
	//     var mol_data = Kekule.IO.saveFormatData(mol_from_smiles, 'mol');
	//     console.log('mol_data:'+mol_data);

	    
	//     jsmeApplet.readGenericMolecularInput(current_smiles);
	//     //console.log('jsme_editor_applet: '+jsme_editor_applet);
	//     // jsmeApplet.readMolecule(current_smiles); // or document.JME.readMolecule(jme);
	//     //getAllFuncs(jsme_editor_applet);
	// }

	// let compound_input_editor_modal = $("#respiraTox_JSMEEditor");
        $("#respiraTox_JSMEEditor").modal();
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

function send_for_prediction_service(cas_number,smiles){
    cas_number_encoded = encodeURI(cas_number);
    smiles_encoded = encodeURI(smiles);
    console.log("cas_number_encoded:"+cas_number_encoded);
    console.log("smiles_encoded:"+smiles_encoded);
    // let xhttp = new XMLHttpRequest();
    // console.log("xhttp:"+xhttp);
    console.log("call send");
    // send(cas_number_encoded,smiles_encoded);
    // userAction();
    submit_data = {"cas_number":cas_number, "selected_smiles":smiles};
    // submit_URL  = 'http://127.0.0.1:5000/compound/';
    sendRequest(base_URL,submit_data);
    console.log("call sent (ded)");
    let respiraTox_alert_var = document.getElementById("smiles_submit_button_id");

}

function renderNeighbour(neighbour) {
    let irritation_row_class = "table-success";
    if (neighbour["compound_endpoint_no_irritation"] == "0") {
	irritation_row_class = "table-danger";
    }
    return '\t<tr class="'+irritation_row_class+'">\n\t\t<th scope="row">'+neighbour["rank"]+'</th>\n\t\t<td>'+neighbour["compound_name"]+'</th>\n\t\t<td>'+neighbour["compound_cas_number"]+'</td>\n\t\t<td>'+parseFloat(neighbour["Tanimoto"]).toFixed(2)+'</td>\n\t\t<td>'+neighbour["compound_structure_smiles"]+'</th>\n\t\t<td>'+neighbour["compound_endpoint_source"]+'</td>\n\t</tr>';
}

function renderResultTable(neighbours) {
    console.log("renderResultTable:");
    let inner_html = "";

    for (var i = 0; i < neighbours.length; i++){
	inner_html = inner_html + renderNeighbour(neighbours[i]);
    }
    table_body_var.innerHTML = inner_html;
}    

function renderPredictionResult(predictionResult) {
    console.log("renderPredictionResult");
    let prediction_result_int = parseFloat(predictionResult).toFixed(1)
    let prediction_color = prediction_colors.white;
    if (prediction_result_int >= 0.0) {
	if (prediction_result_int > 0.0) {
	    prediction_color = prediction_colors.red;
	} else {
	    prediction_color = prediction_colors.green;
	}
    }
    prediction_display_area_var.style.setProperty("background-color",prediction_color);
    console.log("prediction_color",prediction_color);
    console.log(prediction_display_area_var.style.getPropertyValue("background-color"));
    //prediction_display_area_var.style.setProperty("background-color","rgba(0,0,203,1.0)");
}


function analyseResponse(response) {
    let status = response.status[0];
    let thread_status = response.thread.status;
    let thread_running_time = response.thread.running_time;

    // job running
    if (status == 10) {  
	respiraTox_request_status = status;
	respiraTox_request_ID = response["compound_id"];
	hideElement(table_var);
	renderPredictionResult(-1);
	alert_message('Job is running<br/>Compound ID = <a href="'+base_URL+respiraTox_request_ID+'">'+respiraTox_request_ID+"</a><br/> Running time: "+thread_running_time+" secs");
    }
    // job finished
    else if (status == 11) {
	respiraTox_request_status = status;
	respiraTox_request_result = response["Prediction (resp_irritation)"]
	respiraTox_request_data   = response["calculated_data"]
	renderResultTable(response["calculated_data"]["neighbours"]["neighbours"][0])
	renderPredictionResult(respiraTox_request_result);

	alert_message('Job has finished<br/>Compound ID = <a href="'+base_URL+respiraTox_request_ID+'">'+respiraTox_request_ID+"</a><br/> Running time: "+thread_running_time+" secs");

	showElement(table_var);
	enableElement(smiles_submit_button_var);
	disableElement(smiles_refresh_button_var);
    }
    else if (status == 15) {
	respiraTox_request_ID = -1;
	respiraTox_request_status = -1;
	respiraTox_request_result = -1
	respiraTox_request_data   = {}
	alert_message("Job did not finish<br/>Resetting system");
	hideElement(table_var);
	enableElement(smiles_submit_button_var);
	disableElement(smiles_refresh_button_var);
	renderPredictionResult(-1);
    }
    console.log('Status is:' + status);
}


function fetchResult(submit_URL) {
    fetch(submit_URL).then(res => res.json())
	.then(response => {console.log('Success(fetchResults):', JSON.stringify(response));analyseResponse(response)})
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
    console.log("refresh_prediction")
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
    let cas_number_input_value = cas_number_input_var.value;
    let distance_method_var_value = distance_method_var.value;
    let error_message = "";
    // cas number should be not null
    if (!cas_number_input_value){
	console.log("cas_number_input_var (prediction) was empty:");
	error_message = error_message + "Please fill the CAS Number field!<br/>";
    }
    if (!compound_input_value){
	console.log("compound_input_value (prediction) was empty:");
	error_message = error_message + "A valid compound structure is required!<br/>";
    }
    if(error_message){
	alert_message(error_message);
	return false
    }
    console.log("compound_input_value (prediction):" + compound_input_value);
    console.log("cas_number_input_var (prediction):" + cas_number_input_value);
    send_for_prediction_service(cas_number_input_value,compound_input_value);
    disableElement(smiles_submit_button_var);
    enableElement(smiles_refresh_button_var);
    hideElement(table_var);
    //alert("The form has been submitted");
    return false;
}

compound_input_var.addEventListener("input",function() {
    console.log("compound_input_var:"+compound_input_var.value);
    // Clean the input (remove unrecognized characters, such as spaces and tabs) and parse it
    SmilesDrawer.parse(compound_input_var.value, function(tree) {
        // Draw to the canvas
        smiles_drawer.draw(tree,"smiles_canvas", "light", false);
    });
});

	    
