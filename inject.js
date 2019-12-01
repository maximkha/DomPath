function scriptFromFile(file) {
    var script = document.createElement("script");
    script.src = chrome.extension.getURL(file);
    return script;
}
document.head.appendChild(scriptFromFile("xpathGen.js"));