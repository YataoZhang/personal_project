/**
 * Created by zhangyatao on 2014/6/9.
 */
var http=require("http");
var fs=require("fs");
var urlpara=require("url");
http.createServer(function(req,res){
    var urls=urlpara.parse(req.url);
    var url=urls.pathname;
    urls.query?console.log(urls.query):void 0;
    if(url=="/")
    {
        readFile("xhr-polling/xhr.html",res);
    }else if(url=="/qwer"){
        res.writeHead(200,{"Access-Control-Allow-Origin":"*"});
        console.log(url);
        var s= new Buffer("asdfa");
        res.end(s);
        //res.end('{"errorno": "0","msg":{"appKey": "e0x9wycfx7flq", "token": "Vzog6eXI/TDh4iO8WDSecea8ESVlZvV4inqTB4WhsOVhylz9vurXO0EJNwpIsHT1JgDOVOcidDMVQdScQ4OK6T5xJaGvyU3B", "targetId": "rongcloud.net.kefu.service112"}}');
    }else{
        readFile(url.slice(1),res);
    }
}).listen(1111);

function readFile(path,res){
    console.log(path);
    fs.readFile(path,function(err,data){
        if(err){
            res.writeHead(404);
            res.end("server error!not found this page!");
        }else{
            res.writeHead(200,{"Content-Type":path.indexOf(".js")>-1?"application/javascript":"text/html","Access-Control-Allow-Origin":"*"});
            res.end(data);
        }
    });
};