var asbInited = asbInited || false;

this.asb = (() => {

    let vars = {
        scoreboard: null,
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
            hideInactive: true
        }
    };

    const utils = {
        getElementByText,
        getJsonFromDomObject,
        normalizeStateTable
    },
    actions = {
        refreshStateTable,
        refreshStateTableOnce,
        refreshStateTableTimeout,
        hideInactive,
        hideInactiveFromTable
    },
    stateTableBar = {
        createRefreshOnceButton,
        createResreshSelect,
        createHideInactiveCheckbox,
        addStateTableBar
    },
    parse = {
        getServerDescriptionJson,
        getServerStatistics
    };

    // NB: returns only first occurrence!
    function getElementByText(tag, text, context)
    {
        context = context || document;
        const allTags = context.querySelectorAll(tag),
            len = allTags.length;
        for (let i = 0; i < len; i++) {
            if (-1 !== allTags[i].innerText.indexOf(text)) {
                return allTags[i];
            }
        }

        return false;
    }

    // NB: returns trimmed value!
    function getJsonFromDomObject(domObject, map)
    {
        let res = {};
        if (domObject && domObject.children) {
            const len = domObject.children.length;
            let values,
                key;
            for (let i = 0; i < len; i++) {
                values = domObject.children[i].innerHTML.split(':', 2);
                key = map[values[0]];
                if (key) {
                    res[key] = values[1].trim();
                }
            }
        }

        return res;
    }

    function normalizeStateTable(table)
    {
        const len = table.rows.length;
        let code = '<thead>' + table.rows[0].outerHTML + '</thead>';

        code += '<tbody>';
        for (let i = 1; i < len; i++) {
            code += table.rows[i].outerHTML;
        }
        code += '</tbody>';

        table.innerHTML = code;
    }

    function refreshStateTable()
    {
        let url = window.location.pathname;
        $.get(url, (data) => {
            let newDoc = document.createElement('document');
            newDoc.innerHTML = data;

            vars.scoreboard.innerHTML = newDoc.querySelector('dl + pre').innerHTML;

            let newTable = utils.getElementByText('table', 'Srv', newDoc);
            utils.normalizeStateTable(newTable);
            vars.stateTable.tBodies[0].innerHTML = newTable.tBodies[0].innerHTML;
            if (vars.filter['hideInactive']) {
                actions.hideInactiveFromTable(vars.stateTable);
            }
            delete newDoc;
        });
    }

    function refreshStateTableOnce()
    {
        clearTimeout(vars.selectTimeoutId);
        document.getElementById('refreshTimeoutSelect').value = 0;
        actions.refreshStateTable();
    }

    function refreshStateTableTimeout(timeout)
    {
        vars.selectTimeoutId = setTimeout(
            () => {
                actions.refreshStateTable();
                actions.refreshStateTableTimeout(timeout);
            },
            timeout * 1000
        );
    }

    function hideInactive(evt)
    {
        const element = evt.srcElement;
        if ('INPUT' === element.tagName) {
            vars.filter['hideInactive'] = element.checked;
            if (vars.filter['hideInactive']) {
                actions.hideInactiveFromTable(vars.stateTable);
            }
        }
    }

    function hideInactiveFromTable(table)
    {
        const pidCell = utils.getElementByText('th', 'PID', table),
            mCell = utils.getElementByText('th', 'M', table);
        let pidIndex,
            mIndex;
        if (pidCell && mCell) {
            pidIndex = pidCell.cellIndex;
            mIndex = mCell.cellIndex;
            let rows = table.rows,
                lastElem = rows.length - 1,
                pidVal,
                mVal;
            for (let i = lastElem; i > -1; i--) {
                pidVal = rows[i].cells[pidIndex].innerHTML.trim();
                mVal = rows[i].cells[mIndex].innerHTML.trim();
                if ('' === pidVal || -1 < $.inArray(mVal, ['.', '_'])) {
                    table.deleteRow(i);
                }
            }
        }
        $(table).trigger('update');
    }

    function createRefreshOnceButton()
    {
        let button = document.createElement('button');
        button.className = 'btn btn-default';
        button.innerHTML = 'Refresh once';
        button.addEventListener('click', actions.refreshStateTableOnce);

        return button;
    }

    function createResreshSelect()
    {
        let array = [[0, 'Refresh every...'], [1, '1 second'], [5, '5 seconds'], [30, '30 seconds'], [60, '1 minute']],
            len = array.length,
            selectList = document.createElement('select');
        selectList.id = 'refreshTimeoutSelect';
        selectList.className = 'form-control';
        for (let i = 0; i < array.length; i++) {
            let option = document.createElement('option');
            option.value = array[i][0];
            option.text = array[i][1];
            selectList.appendChild(option);
        }
        selectList.addEventListener('change', (evt) => {
            let timeout = evt.srcElement.value;
            clearTimeout(vars.selectTimeoutId);
            if (0 == timeout) {
                return;
            }
            actions.refreshStateTableTimeout(timeout);
        });

        return selectList;
    }

    function createHideInactiveCheckbox()
    {
        let label = document.createElement('label'),
            input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = vars.filter.hideInactive;
        if (true === vars.filter.hideInactive) {
            input.setAttribute('checked', 'checked');
        }
        label.appendChild(input);
        label.innerHTML += ' Hide inactive processes';
        label.addEventListener('click', actions.hideInactive)

        return label;
    }

    function addStateTableBar()
    {
        // prevent status bar duplicates
        if (!document.getElementById('stateTableBar')) {
            let bar = document.createElement('div');
            bar.className = 'panel panel-default';
            bar.id = 'stateTableBar';
            bar.innerHTML = '<hr />';

            bar.appendChild(stateTableBar.createResreshSelect());
            bar.appendChild(stateTableBar.createRefreshOnceButton());
            bar.appendChild(stateTableBar.createHideInactiveCheckbox());

            $(bar).insertBefore(vars.stateTable);
        }
    }

    function getServerDescriptionJson(dl)
    {
        return utils.getJsonFromDomObject(
            dl,
            {'Server Version': 'version', 'Server MPM': 'mpm', 'Server Built': 'built'}
        );
    }

    // TODO: think on better way to parse...
    function getServerStatistics(dl)
    {
        const len = dl.children.length;
        let res = utils.getJsonFromDomObject(
                dl,
                {'Current Time': 'currentTime', 'Restart Time': 'restartTime', 'Parent Server Config. Generation': 'pSConfigGen',
                 'Parent Server MPM Generation': 'pSMpmGen', 'Server uptime': 'uptime', 'Server load': 'load', 'CPU Usage': 'cpu'}
            ),
            dtVal;
        for (let i = 0; i < len; i++) {
            dtVal = dl.children[i].innerText;
            if (-1 !== dtVal.indexOf('Total accesses')) {
                let values = dtVal.split(' - ');
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

    function multipleInitPrevention()
    {
        if (asbInited) {
            console.info('Apache status beautifier already inited');
        }
        asbInited = true;
    }

    function initEventMode()
    {
        let eventsModeTable = utils.getElementByText('table', 'Async connections');
        if (eventsModeTable) {
            eventsModeTable.className = 'table-bordered';
        }
    }

    function initStateTable()
    {
        let table = utils.getElementByText('table', 'Srv');
        if (!table) {
            throw new Error('Looks like this is not extended server-status page');
        }
        table.className = 'table stateTable';
        utils.normalizeStateTable(table);
        return table;
    }

    function init()
    {
        let dlServerDescription = utils.getElementByText('dl', 'Server Version'),
            dlServerStatistics = utils.getElementByText('dl', 'Current Time');

        multipleInitPrevention();

        vars.scoreboard = document.querySelector('dl + pre');
        vars.server = parse.getServerDescriptionJson(dlServerDescription);
        vars.statistics = parse.getServerStatistics(dlServerStatistics);

        initEventMode();
        vars.stateTable = initStateTable();
        //TODO: needs spinner
        $(vars.stateTable).tablesorter({theme: 'blue'});

        stateTableBar.addStateTableBar();
    }

    return {
        init
    };

})();

try {
    asb.init();
} catch(e) {
    console.error("apache status beautifier: " + e.message);
}
