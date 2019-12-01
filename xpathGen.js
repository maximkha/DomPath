function getOptimalXPath(elem, restrictions = {attrib:[], val:[]})
{
    var cElem = elem;
    var pathComps = [];
    while (true)
    {
        var desc = getDescriptor(cElem, restrictions);
        pathComps.push(desc.xPath);
        if (desc.unique) break;
        cElem = cElem.parentNode;
    }
    return "//"+pathComps.reverse().join("/");
}

function getDescriptor(elem, restrictions)
{
    console.log("🧭 "+ getPathTo(elem));
    //get all attribs
    var attribs = Array.from(elem.attributes).map((x)=>[x.nodeName, x.nodeValue]);
    var filteredAttribs = [];
    var nodeName = elem.nodeName;
    //Search order: ID, Class, X
    var selectedAttribs = [];
    //console.log(attribs);
    for (var i = 0; i < attribs.length; i++)
    {
        if (restrictions.attrib.includes(attribs[i][0]))
        {
            console.log("⚠️⛔ Property '" + attribs[i][1] + "' is blacklisted");
            continue;
        }
        else if (restrictions.val.includes(attribs[i][1]))
        {
            console.log("⚠️⛔ Value '" + attribs[i][1] + "' is blacklisted");
            continue;
        }
        if (isSelectable(nodeName, attribs[i][0], attribs[i][1]))
        {
            //console.log(attribs[i], hasHexSalt(attribs[i][1]), elem);
            if (!hasHexSalt(attribs[i][1]))
            {
                filteredAttribs.push(attribs[i]);
                //console.log(attribs[i], hasHexSalt(attribs[i][1]), elem);
                console.log("✅🅿 Property '" + attribs[i][0] + "' with value \"" + attribs[i][1] + "\" was found!")
            }
            else
            {
                console.log("⚠️🧂 Property '" + attribs[i][0] + "' with value \"" + attribs[i][1] + "\" appears to be salted");
            }
        }
        else 
        {
            console.log("⚠️🔎 Property '" + attribs[i][0] + "' with value \"" + attribs[i][1] + "\" cannot select self!")
        }
    }
    for (var i = 0; i < filteredAttribs.length; i++)
    {
        if (filteredAttribs[i][0]=="id")
        {
            //IDs are unique so if there is one, just use it.
            console.log("✅🆔 Found ID property!");
            return {type:"id", unique: true, xPath: composeXPath(nodeName, [filteredAttribs[i]])};
        }
        else
        {
            selectedAttribs.push(filteredAttribs[i]);
        }
    }

    if (selectedAttribs.length == 0)
    {
        var ix= 0;
        var siblings= elem.parentNode.childNodes;
        for (var i= 0; i<siblings.length; i++) {
            var sibling= siblings[i];
            if (sibling===elem)
            {
                var pathComp = elem.tagName+'['+(ix+1)+']';
                return {type:"child", unique: false, xPath: pathComp};
            }
            if (sibling.nodeType===1 && sibling.tagName===elem.tagName)
                ix++;
        }
    }

    var xpath = composeXPath(nodeName, selectedAttribs);
    //console.log(xpath,isXPathUnique(xpath));
    return {type:"attrib", unique: isXPathUnique(xpath), attribs: selectedAttribs, xPath: xpath};
}

function composeXPath(nodeName, attribs)
{
    var xPath = nodeName + "[";
    for (var i = 0; i < attribs.length; i++)
    {
        xPath += "@" + attribs[i][0]+"=\""+attribs[i][1]+"\" and ";
    }
    return xPath.substr(0, xPath.length - (" and ".length)) + "]";
}

function isSelectable(nodeName, attrib, value)
{
    return xPathQueryDocument("//"+nodeName+"[@"+attrib+"=\""+value+"\"]").length > 0;
}

function isXPathUnique(xpathQuery)
{
    return xPathQueryDocument("//"+xpathQuery).length == 1;
}

var hexSaltReg = /[0-9a-fA-F]+/gm;
function hasHexSalt(text)
{
    hexSaltReg.lastIndex = 0;
    while (true)
    {
        var res = hexSaltReg.exec(text);
        //console.log(res);
        if (res == null) return false;
        if (res[0].length > 3) return true;
    }
}

function xPathQueryDocument(xPath)
{
    return xPathIteratorToArr(document.evaluate(xPath, document, null, XPathResult.ANY_TYPE, null));
}

function xPathIteratorToArr(xpathItr)
{
    var ret = [];
    var cVal = xpathItr.iterateNext();
    
    while (cVal != null)
    {
        ret.push(cVal);
        cVal = xpathItr.iterateNext();
    }

    return ret;
}

//https://stackoverflow.com/questions/2631820/how-do-i-ensure-saved-click-coordinates-can-be-reloaed-to-the-same-place-even-i/2631931#2631931
function getPathTo(element) {
    if (element.id!=='')
        return 'id("'+element.id+'")';
    if (element===document.body)
        return element.tagName;

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        var sibling= siblings[i];
        if (sibling===element)
            return getPathTo(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
            ix++;
    }
}

function autoScan(keywords, strict = 2)
{
    var ret = [];
    for (var i = 0; i < keywords.length; i++)
    {
        var matches = undefined;
        if (strict == 2)
        {
            matches = xPathQueryDocument("//*[translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='"+keywords[i]+"']");
        }
        else if (strict == 1)
        {
            matches = xPathQueryDocument("//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'"+keywords[i]+"')]");
        }
        ret.push(matches);
    }
    return ret;
}

function flattenAndMatchHtml(startElem, depth, numParents, match)
{
    var element = startElem;
    for (var i = 0; i < numParents; i++)
    {
        element = element.parentElement;
    }
    
    var toProcess = [element];
    var processed = [];
    var matched = [];

    var cdepth = 0;
    
    while(true)
    {
        for (var i = 0; i < toProcess.length; i++)
        {
            if (match(toProcess[i])) matched.push(toProcess[i]);
        }
        if (cdepth >= depth) break;
        for (var i = 0; i < toProcess.length; i++)
        {
            processed = processed.concat(Array.from(toProcess[i].children));
        }
        toProcess = processed;
        processed = [];
    }
    return matched;
}

function isNumericElement(elem)
{
    var text = elem.innerText.replace(",","");
    return !isNaN(parseFloat(text));
}

function VerifyxPaths(xPaths)
{
    return xPaths.every((x)=>xPathQueryDocument(x).length == 1);
}