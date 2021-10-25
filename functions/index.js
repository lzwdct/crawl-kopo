'use strict';

const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const _ = require('lodash');
const FCM = require('fcm-node');
const url = require('url');
const crawl = require('./getListfromURL');

exports.crawling = functions.pubsub.schedule('every 5 minutes').onRun(async(context) => {
    if (!admin.apps.length) {

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: 'https://crawling-1d3c3.firebaseio.com/'
        });
    }
    const db = admin.database();

    const ref = db.ref("/User");

    const snapshot  = await ref.once('value');
    const accounts = snapshot.val();

    const c = await crawl.getListfromURL('http://www.nzkoreapost.com/bbs/rss.php?bo_table=market_buynsell');

    _.forEach(accounts, function(product, name) {
        const token = product.token;
        _.forEach(product.item, function(s, key) {
            //_.forEach(item, function(s, key) {
                const item = s.product;
                let valid = s.valid;
                let searched = s.searched?s.searched:'';

                _.forEach(c, function(value) {
                    const title = value.title[0].toLowerCase();
                    const description = value.description[0].toLowerCase();
                    const link = value.link[0];
                    const Kopourl = url.parse(link, true);
                    
                    let wr_id = Kopourl.query.wr_id?Kopourl.query.wr_id:'';

                    if(wr_id.length > 20){
                        wr_id = wr_id.substr(wr_id.length - 10);
                    }

                    if(searched.includes(wr_id)) valid = false;

                    if((title.includes(item) || description.includes(item)) && valid){
                        const title = `${item} is just found.`;
                        const body = `Hi, ${item} has been found in Newzealand Korea post Buy & Sell page.`;
                        searched = wr_id + ',' + searched;
                        const payload = {
                            notification: {
                                title,
                                body,
                                android_channel_id: "CrawlKopoSellBuy"
                            },
                            data: {
                                link
                            }
                        };

                        const options = {
                            priority: "high",
                            timeToLive: 60 * 60 *24,
                            show_in_foreground: true
                          };

                        const upRef = db.ref(`/User/${name}/item/${key}`);

                        upRef.update({
                            searched
                        })
                        
                        console.log('token : ', token);
                        admin.messaging().sendToDevice([token], payload, options)
                        .then(function(response) {
                            console.log("Successfully sent message:", response);
                        })
                        .catch(function(error) {
                            console.log("Error sending message:", error);
                        });
                    }
                });
            //});
        });
    });
    
    console.log('crawl done')
   
    return {
        statusCode: 200
    };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
});


async function xml2Json(res){
    var promise = await new Promise(function (resolve, reject) {

            xml2js.parseString(res, function (jsError, jsResult) {

                if (jsError) {
                    reject(jsError);
                } else {
                      resolve(jsResult);                     
                }  
            });  
        });  
    return promise;
}