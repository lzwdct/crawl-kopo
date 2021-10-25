const got = require('got');
const xml2js = require('xml2js');

exports.getListfromURL = async function(url){
    const c = await got(url).then(res => {

        const xmlDoc = new Promise(function (resolve, reject) {

            xml2js.parseString(res.body, function (jsError, jsResult) {

                if (jsError) {
                    reject(jsError);
                } else {
                      resolve(jsResult);                     
                }  
            });  
        });  
    
        return xmlDoc.then(res => {
             return (res.rss.channel[0].item);
        });
    });
    return c;
}
