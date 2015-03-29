chrome.tabs.onUpdated.addListener(showIcon);

function showIcon(tabId, changeInfo, tab)
{
    if ('complete' === changeInfo.status) {
		chrome.windows.getAll({populate : true}, function (windows) {
	        for (var i in windows) {
	        	for (var j in windows[i].tabs) {
	   	        	if ('Apache Status' === windows[i].tabs[j].title) {
	   		     		chrome.pageAction.show(windows[i].tabs[j].id);
	   		     		if ('debug' == false) {
	   		     		//if ('debug') {
	   		     			chrome.tabs.insertCSS(null, {file: 'vendor/bootstrap/dist/css/bootstrap.min.css'});
							chrome.tabs.insertCSS(null, {file: 'vendor/jquery.tablesorter/dist/css/theme.blue.min.css'});
							chrome.tabs.insertCSS(null, {file: 'src/main.css'});
							chrome.tabs.executeScript(null, {file: 'vendor/jquery/dist/jquery.min.js'});
							chrome.tabs.executeScript(null, {file: 'vendor/jquery.tablesorter/dist/js/jquery.tablesorter.min.js'});
							chrome.tabs.executeScript(null, {file: 'src/beautifier.js'});
	   		     		}
	        		}
	        	}
	        }
	    });
    }
}
