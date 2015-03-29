function click(e)
{
	chrome.tabs.insertCSS(null, {file: 'vendor/bootstrap/dist/css/bootstrap.min.css'});
	chrome.tabs.insertCSS(null, {file: 'vendor/jquery.tablesorter/dist/css/theme.blue.min.css'});
	chrome.tabs.insertCSS(null, {file: 'src/main.css'});

	chrome.tabs.executeScript(null, {file: 'vendor/jquery/dist/jquery.min.js'});
	chrome.tabs.executeScript(null, {file: 'vendor/jquery.tablesorter/dist/js/jquery.tablesorter.min.js'});
	chrome.tabs.executeScript(null, {file: 'src/beautifier.js'});
	closePopup();
}

function closePopup()
{
	window.close();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('beautifyThisPage').addEventListener('click', click);
});

