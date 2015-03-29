var asbInited = asbInited || false,
	d = document;

this.asb = (function() {

	var vars = {
		stateTable: null,
		server: {
			version: null,
			mpm:     null,
			built:   null
		},
		statistics: {
			currentTime: null,
			restartTime: null,
			pSConfigGen: null,
			pSMpmGen:    null,
			uptime:      null,
			load:        null,
			accsesses:   null,
			traffic:     null,
			cpu:         null,
			requestsAvg: null,
			requestsNow: null
		},
		selectTimeoutId: null,
		filter: {
			hideInactive: false
		}
	};

	var utils = {
		insertBefore: function(insert, beforeObject)
		{
			beforeObject.parentNode.insertBefore(insert, beforeObject);
		},
		// NB: returns only first occurrence!
		getElementByText: function(tag, text, context)
		{
			context = context || d;
			var allTags = context.querySelectorAll(tag),
				len = allTags.length;
			for (var i = 0; i < len; i++) {
				if (-1 !== allTags[i].innerText.indexOf(text)) {
					return allTags[i];
				}
			}
			return false;			
		},
		// NB: returns trimmed value!
		getJsonFromDomObject: function(domObject, map)
		{
			var res = {};
			if (domObject && domObject.children) {
				var len = domObject.children.length,
				    values,
				    key;
				for (var i = 0; i < len; i++) {
					values = domObject.children[i].innerHTML.split(':', 2);
					key = map[values[0]];
					if (key) {
						res[key] = values[1].trim();
					}
				}
			}
			return res;
		},
		normalizeStateTable: function(table)
		{
			var code = '<thead>' + table.rows[0].outerHTML + '</thead>',
			    len = table.rows.length;

			code += '<tbody>';
			for (var i = 1; i < len; i++) {
				code += table.rows[i].outerHTML;
			}
			code += '</tbody>';

			table.innerHTML = code;
		}
	};

	var actions = {
		refreshStateTable: function()
		{
			var url = window.location.pathname;
			$.get(url, function(data) {
				var preTag = d.querySelectorAll('pre');
				if (preTag[0]) {
					d.body.removeChild(preTag[0]);
				}
			    var newDoc = d.createElement('document');
			    newDoc.innerHTML = data;
			    var newTable = utils.getElementByText('table', 'Srv', newDoc);
			    utils.normalizeStateTable(newTable);
			    vars.stateTable.tBodies[0].innerHTML = newTable.tBodies[0].innerHTML;
			  	if (vars.filter['hideInactive']) {
					actions.hideInactiveFromTable(vars.stateTable);
				}
			    $(vars.stateTable).trigger('update');
			    delete newDoc;
			});
		},
		refreshStateTableOnce: function()
		{
			clearTimeout(vars.selectTimeoutId);
			d.getElementById('refreshTimeoutSelect').value = 0;
			actions.refreshStateTable();
		},
		refreshStateTableTimeout: function(timeout)
		{
			vars.selectTimeoutId = setTimeout(function() {
					actions.refreshStateTable();
				    actions.refreshStateTableTimeout(timeout);
			    },
				timeout * 1000);
		},
		hideInactive: function(evt)
		{
			var element = evt.srcElement;
			if ('INPUT' === element.tagName) {
				vars.filter['hideInactive'] = element.checked;
				if (vars.filter['hideInactive']) {
					actions.hideInactiveFromTable(vars.stateTable);
				}
			}
		},
		hideInactiveFromTable: function(table)
		{
			var pidCell = utils.getElementByText('th', 'PID', table),
			    pidIndex,
			    mCell = utils.getElementByText('th', 'M', table),
			    mIndex;
			if (pidCell && mCell) {
				pidIndex = pidCell.cellIndex;
				mIndex = mCell.cellIndex;
				var rows = table.rows,
					lastElem = rows.length - 1,
					pidVal,
					mVal;
				for (var i = lastElem; i > -1; i--) {
					pidVal = rows[i].cells[pidIndex].innerHTML.trim();
					mVal = rows[i].cells[mIndex].innerHTML.trim();
					if ('' === pidVal || '.' === mVal || '_' === mVal) {
						table.deleteRow(i);
					}
				}
			}
		}
	};

	var stateTableBar = {
		createRefreshOnceButton: function()
		{
            var button = d.createElement('button');
            button.className = 'btn btn-default';
            button.innerHTML = 'Refresh table once';
			button.addEventListener('click', actions.refreshStateTableOnce);
            return button;
		},
		createResreshSelect: function()
		{
			var array = [[0, 'Refresh every...'], [1, '1 second'], [5, '5 seconds'], [30, '30 seconds'], [60, '1 minute']],
				len = array.length,
			    selectList = d.createElement('select');
			selectList.id = 'refreshTimeoutSelect';
			selectList.className = 'form-control';
			for (var i = 0; i < array.length; i++) {
			    var option = d.createElement('option');
			    option.value = array[i][0];
			    option.text = array[i][1];
			    selectList.appendChild(option);
			}
			selectList.addEventListener('change', function(evt) {
				var timeout = evt.srcElement.value;
				clearTimeout(vars.selectTimeoutId);
				if (0 == timeout) {
					return;
				}
				actions.refreshStateTableTimeout(timeout);
			});
			return selectList;
		},
		createHideInactiveCheckbox: function()
		{
			var label = d.createElement('label'),
			    input = d.createElement('input');
			input.type = 'checkbox';
			label.appendChild(input);
			label.innerHTML += ' Hide inactive processes';
			label.addEventListener('click', actions.hideInactive)
			return label;
		},
		add: function()
		{
			// prevent status bar duplicates
			if (!d.getElementById('stateTableBar')) {
				var bar = d.createElement('div');
				bar.className = 'panel panel-default';
				bar.id = 'stateTableBar';
				bar.innerHTML = '<hr />';

				bar.appendChild(stateTableBar.createResreshSelect());
				bar.appendChild(stateTableBar.createRefreshOnceButton());
				bar.appendChild(stateTableBar.createHideInactiveCheckbox());

				utils.insertBefore(bar, vars.stateTable);
			}
		}
	};

	var parse = {
		getServerDescriptionJson: function(dl)
		{
			return utils.getJsonFromDomObject(dl,
			    {'Server Version': 'version', 'Server MPM': 'mpm', 'Server Built': 'built'});
		},
		// TODO: think on better way to parse...
		getServerStatistics: function(dl)
		{
			var res = utils.getJsonFromDomObject(dl, 
				{'Current Time': 'currentTime', 'Restart Time': 'restartTime', 'Parent Server Config. Generation': 'pSConfigGen',
			     'Parent Server MPM Generation': 'pSMpmGen', 'Server uptime': 'uptime', 'Server load': 'load', 'CPU Usage': 'cpu'}),
			    len = dl.children.length,
				dtVal;
			for (var i = 0; i < len; i++) {
				dtVal = dl.children[i].innerText;
				if (-1 !== dtVal.indexOf('Total accesses')) {
					var values = dtVal.split(' - ');
					if (2 === values.length) {
						res['accsesses'] = values[0].split(':')[1].trim();
						res['traffic'] = values[1].split(':')[1].trim();
					}
				}  else if (i === len - 2) {
					res['requestsAvg'] = dtVal;
				} else if (i === len - 1) {
					res['requestsNow'] = dtVal;
				}
			}
			return res;
		}
	};

	function multipleInitPrevention()
	{
		if (asbInited) {
			throw new Error('Apache status beautifier already inited');
		}
		asbInited = true;
	}

	function initEventMode()
	{
		var eventsModeTable = utils.getElementByText('table', 'Async connections');
		if (eventsModeTable) {
			eventsModeTable.className = 'table-bordered';
		}
	}

    function initStateTable()
    {
    	var table = utils.getElementByText('table', 'Srv');
		if (!table) {
			throw new Error('Looks like this is not extended server-status page');
		}
		table.className = 'table stateTable';
		utils.normalizeStateTable(table);
		return table;
    }

	function init()
	{
		multipleInitPrevention();

		var dlServerDescription = utils.getElementByText('dl', 'Server Version');
		vars.server = parse.getServerDescriptionJson(dlServerDescription);
		var dlServerStatistics = utils.getElementByText('dl', 'Current Time');
		vars.statistics = parse.getServerStatistics(dlServerStatistics);

        initEventMode();
        vars.stateTable = initStateTable();
		//TODO: needs spinner
		$(vars.stateTable).tablesorter({theme: 'blue'});

		stateTableBar.add();
	}

	return {
		init: init
	};

})();

try {
	asb.init();	
} catch(e) {
	alert(e.message);
}
