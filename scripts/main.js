/*jshint multistr: true */

/* GLOBAL VARIABLES */
var QLCE_Global = {
	isDragging: false, // helper variable to prevent weird tooltip behaviour
};

// layouts = JSON-Like Content Object loaded from layouts.js
// bindings = JSON-Like Content Object loaded from bindings.js
// keyInfo = JSON-Like Content Object loaded from keyinfo.js
// bindItems = JSON-Like Content Object loaded from binditems.js

/* FUNCTION DECLARATIONS */
function getKeyByValue(object, value) { // helper function to get keys from object
	for(var key in object) {
		if (object[key] == value) {
			return key;
		}
	}

	return null;
}

function clearBindings() { // remove all currently binded items from the keyboard
	$('#keyboard div').each(function () {
		$(this).remove();
	});
}

function fillKeyLabels() { // generate html elements for keylabels and insert them in the keyboard 
	var layout = layouts["en-US"]; // choose the correct locale from the layouts object
	$('#keyboard li[id^="key"]').each(function() { // for each li element in the keyboard
		var elementString = '<p data-keyinfo="' + keyInfo[this.id] + '">' + layout[this.id] + '</p>'; // create html element with all required infos
		$(this).append(elementString);
	});
}

function generateBindItem(item, category) { // item -> identifier , category -> the category in which the item is stored in the hash
	var elementId = item;
	var iconLink = category[item].iconlink;
	var name = category[item].name;
	var command = category[item].command;
	var description = category[item].description;
	var elementString =  // create html element with all required infos
	'<div \
	class="ui-draggable unused" \
	data-name="' + name + '" \
	data-command="' + command + '" \
	data-description="' + description + '" \
	data-id="' + elementId + '" \
	style="background-image: url(images/icons/' + iconLink + ')\
	"></div>';

	return elementString; // returns the generated html element as a String
}

/*function fillBindItems() {
	var start = performance.now();
	var elementString = "";

	for (var categories in bindItems) { // iterate through the bindItems hash 
		var category = categories;

		for (var item in bindItems[category]) {
			elementString += generateBindItem(item, bindItems[category]);
		}
	}

	$('#bindingbox').append(elementString); // fill elements in the div
	var stop = performance.now();
	console.log(stop - start);
};*/

function fillBindItems() {
	var start = performance.now();

	for (var categories in bindItems) { // iterate through the bindItems hash 
		var category = categories;

		for (var item in bindItems[category]) {
			var elementString = generateBindItem(item, bindItems[category]);

			$('#bindingbox').append(elementString); // fill elements in the div
		}
	}

	var stop = performance.now();
	console.log(stop - start);
}

function initDraggables(selector) { // selector -> only selected element will be initialized
	var cloneItem = $(selector);
	var insertSelector;
	var draggableSettings = {
		helper: "clone",
		scroll: false,
		zIndex: 10,
		revert: function(accepted) {
			if (!accepted) {
				cloneItem = false; // prevent duplicating bug
				$('#keyinfo, #bindingname, #bindingcommand, #description').text(""); // clears infobox when the item is not accepted
			}

			return true;
		},
		revertDuration: 0,
		start: function() {
			QLCE_Global.isDragging = true; // deactivate tooltip updating
			$('#keyinfo').text("");

			if ($(this).hasClass('unused')) { // only clone items dragged from the bindingbox
				cloneItem = $(this).clone();
				insertSelector = $(this).prev();
			}
		},
		stop: function(event, ui) {
			if (!($(this).hasClass('unused')) && cloneItem) { // prevent duplicating bug
				cloneItem.draggable(draggableSettings); // make the clone draggable again
				cloneItem.insertAfter(insertSelector); // insert draggable into the DOM
				initHoverIntent(); // initialize Hover Event Handlers for the infobox
			}

			QLCE_Global.isDragging = false; // reactivate tooltip updating
		},
	};

	$(selector).draggable(draggableSettings); // make the selected draggable
}

function initDroppables() {
	$('#keyboard li[id^="key"]').droppable({ // all keys on keyboard
		accept: function() {
			if ($(this).find('div').hasClass('ui-draggable')) { // dont accept already binded keys
				return false;
			}

			if ($(this).hasClass('unbindable')) { // dont accept unbindable keys
				return false;
			}

			return true;
		},
		drop: function(event, ui) {
			$(this).append(ui.draggable); // insert in the hovered key
			ui.draggable.css({ // change css to fit the keys
				"position": "absolute",
				"margin": "0px",
				"width": "100%",
				"height": "100%",
				"top": "0px",
				"left": "0px",
			});
			ui.draggable.removeClass('unused');
			ui.draggable.draggable("option", "helper", "original"); // change draggable option
			$('#keyinfo').text($(this).find('p').attr('data-keyinfo')); // update infobox text
		},
	});

	$('#bindingbox').droppable({ // make the binding box droppable
		accept: ":not(.unused)", // all classes but not the unused class are accepted
		drop: function(event, ui) {
			ui.draggable.remove(); // remove all elements dropped in the binding box
		},
	});
}

function initHoverIntent() {  // initialize Hover Event Handlers for the infobox
	$('div[data-id^="binditem"]').hoverIntent(function() { // mouse is over an item
		if (QLCE_Global.isDragging === false) { //prevent weird tooltip behaviour
			$('#bindingname').text($(this).attr('data-name'));
			$('#bindingcommand').text($(this).attr('data-command'));
			$('#description').text($(this).attr('data-description'));
		}
	}, function() { // mouse leaves an item
		if (QLCE_Global.isDragging === false) {
			$('#keyinfo, #bindingname, #bindingcommand, #description').text(""); // clear infobox
		}
	});

	$('li[id^="key"]').hoverIntent(function() { // mouse is over a key
		if (QLCE_Global.isDragging === false) {
			$('#keyinfo').text($(this).find('p').attr('data-keyinfo'));
		}
	}, function() { // mouse leaves a key
		if (QLCE_Global.isDragging === false) {
			$('#keyinfo').text(""); // clear keyinfo
		}
	});
}

function saveConfiguration() {
	var cfg = []; // array with the cfg lines

	cfg.push("unbindall\n"); // first line in the cfg file

	$('#keyboard li[id^="key"]').each(function() {  // iterate through keyboard
		var command = $(this).find('div').attr('data-command'); // load the value from the html element attribute

		if (command !== undefined) { // only fill binded keys
			var binding = bindings[this.id]; // load the value from the bindings list

			cfg.push('bind ' + binding + ' "' + command + '"\n'); // insert chained string
		}
	});
	var blob = new Blob(cfg, {
		type: "text/plain; charset=utf-8"
	});

	saveAs(blob, "autoexec.cfg"); // provides a file to download
}

function loadConfiguration() {
	var file = $('#loadbutton')[0].files[0]; // select file object from the input field
	var reader = new FileReader();

	reader.readAsText(file, "text/plain; charset=utf-8");

	reader.onload = function() {
		var cfg = reader.result;
		var bindingArray = cfg.split("\n"); // split in seperate lines to array

		bindingArray.shift(); // remove first element with unbindall command
		bindingArray.pop(); // remove last element with blank line

		var bindKeyPatt = /(?:bind )(.+)(?: ")/; // Regex for the bindingkey
		var commandPatt = /(?:")(.+)"/; // Regex for the command

		clearBindings(); // clear before refill

		for (var binding in bindingArray) {
			var bindingString = bindingArray[binding];
			var bindKey = bindKeyPatt.exec(bindingString); // select only the bind key with regex
			var command = commandPatt.exec(bindingString); // select only the command with regex

			bindKey = bindKey[1].toString(); // return second capturegroup as a String
			command = command[1].toString();

			var bindKeySelector = '#' + getKeyByValue(bindings, bindKey); // selector in the keyboard for the keyIDs
			var bindItemSelector = '#bindingbox [data-command="' + command + '"]'; //selector in the bindingbox div
			var bindedItemSelector = '#keyboard [data-command="' + command + '"]'; // selector in the keyboard
			var bindingElement = $(bindItemSelector).clone(); // clone Item from bindingbox

			bindingElement.appendTo(bindKeySelector); // append to binded key
			$(bindedItemSelector).css({ // change css so that it fits to the keyboard keys
				"position": "absolute",
				"margin": "0px",
				"width": "100%",
				"height": "100%",
				"top": "0px",
				"left": "0px",
			});
			$(bindedItemSelector).removeClass('unused'); // remove class for binded elements
			initDraggables(bindedItemSelector); // initialize new elements
			$(bindedItemSelector).draggable({helper: "original"}); // change draggable option
		}

		initHoverIntent(); // reinitialize
	};
}

/* MAIN */
$(document).ready(function() {
	
	/* Initialization */
	fillKeyLabels();
	fillBindItems();
	initDroppables();
	initDraggables('.ui-draggable');
	initHoverIntent();


	/* Click Handlers */

	$('#savebutton').click(function() {
		saveConfiguration();
	});

	$('#loadbuttonhandle').click(function() {
		$('#loadbutton').trigger("click"); // simulate click on the hidden file input element
	});

	$('#loadbutton').change(function() {
		loadConfiguration();
	});

	$('#resetbutton').click(function() {
		clearBindings();
	});
});