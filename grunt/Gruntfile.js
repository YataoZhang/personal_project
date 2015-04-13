//自定义任务
module.exports = function (grunt) {
    // 项目配置
    var http = require('http');
    var qs = require('querystring');
    var fs=require("fs");

    function write(name,temp){
        fs.writeFile("./release/"+name,temp,"utf8",function(err){
            if(err){
                grunt.log.error('BODY: ' + err);
            }
        });
    }

    grunt.initConfig({
        minJs:{
            version:"0.9.7",
            rootPath:"./online/",
            resource:[{src:"RongIMClient.js",nameList:"RongIMClient.min.js,RongIMClient-0.9.7.min.js",operate:"pack"},
                {src:"emoji-0.9.2.js",nameList:"RongIMClient.emoji-0.9.2.min.js",operate:"pack"},
                {src:"protobuf.js",nameList:"protobuf-0.2.min.js",operate:"uglify"},
                {src:"swfobject.js",nameList:"swfobject-0.2.min.js",operate:"uglify"},
                {src:"voice-0.9.1.js",nameList:"RongIMClient.voice-0.9.1.min.js",operate:"pack"},
                {src:"xhrpolling.js",nameList:"xhrpolling-0.2.min.js",operate:"uglify"},
                {src:"indexedDB.js",nameList:"RongIMClient.indexedDB.min.js",operate:"pack"}],
            env:"Release"
        }
    });
    grunt.registerTask('minJs', '自定义压缩js文件', function () {

        this.async();

        grunt.log.writeln('Processing task...');


        var options = {
            hostname: 'tool.lu',
            port: 80,
            path: '/js/ajax.html',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        grunt.config("minJs.resource").forEach(function(x){
            fs.readFile(grunt.config("minJs.rootPath")+ x.src,"utf8",function(err,data){
                if(err){
                    grunt.log.error(err);
                    return;
                }
                if(grunt.config("minJs.env")==="Release"){
                    data=data.replace(/\["navUrl-Debug"\]/g,"[\"navUrl-Release\"]");
                }
                var post_data = {
                    code: data,
                    operate: x.operate
                };
                var req = http.request(options, function (res) {
                    res.setEncoding('utf8');
                    var chunk="";
                    res.on('data', function (data) {
                        chunk+=data;
                    });
                    res.on("end",function(){
                        var temp=JSON.parse(chunk);
                        if(temp.status===true){
                            x.nameList.split(",").forEach(function(name){
                                write(name,temp.text);
                            });
                        }else{
                            grunt.log.error(temp.message);
                        }
                    })
                });
                req.on('error', function (e) {
                    grunt.log.error('problem with request: ' + e.message);
                });
                req.write(qs.stringify(post_data));
                req.end();
            });
        });

    });
};